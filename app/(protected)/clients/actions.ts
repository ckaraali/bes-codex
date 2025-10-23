"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";
import { parseClientCsv, parseElementerCsv } from "@/lib/csv";
import { deliverDigestEmails, loadEmailTemplate } from "@/lib/digest-delivery";
import { supabaseAdmin } from "@/lib/supabase";

const clientSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Müşteri adı gerekli."),
  email: z.string().email("Geçerli bir e-posta adresi gerekli."),
  phone: z.union([z.string(), z.null()]).optional(),
  birthDate: z.union([z.string(), z.null()]).optional(),
  clientType: z.union([z.literal(""), z.literal("BES"), z.literal("ES"), z.literal("BES+ES"), z.null()]).optional(),
  policyType: z.union([z.string(), z.null()]).optional(),
  policyStartDate: z.union([z.string(), z.null()]).optional(),
  policyEndDate: z.union([z.string(), z.null()]).optional(),
  firstSavings: z.coerce.number().min(0, "İlk tasarruf tutarı pozitif olmalı."),
  currentSavings: z.coerce.number().min(0, "Güncel tasarruf tutarı pozitif olmalı.")
});

export type ActionResult = { success: boolean; message: string };

export async function createClient(_prevState: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return { success: false, message: "Yetkiniz bulunmuyor." };
  }

  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    firstSavings: formData.get("firstSavings"),
    currentSavings: formData.get("currentSavings")
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Bilgiler doğrulanamadı." };
  }

  const { name, email, phone, firstSavings, currentSavings } = parsed.data;

  const { data: createdClient, error } = await supabaseAdmin
    .from("clients")
    .insert({
      owner_id: session.user.id,
      name,
      email,
      phone: phone ?? null,
      first_savings: firstSavings,
      current_savings: currentSavings
    })
    .select("id")
    .single();

  if (error || !createdClient) {
    console.error("Supabase createClient error", error);
    return { success: false, message: "Müşteri oluşturulamadı." };
  }

  const snapshotError = await supabaseAdmin
    .from("savings_snapshots")
    .insert({
      client_id: createdClient.id,
      amount: currentSavings
    })
    .then((response) => response.error);

  if (snapshotError) {
    console.error("Supabase snapshot insert error", snapshotError);
    return { success: false, message: "Müşteri oluşturuldu ancak tasarruf kaydı eklenemedi." };
  }

  revalidatePath("/clients");
  revalidatePath("/dashboard");

  return { success: true, message: "Müşteri oluşturuldu." };
}

export async function updateClient(_prevState: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return { success: false, message: "Yetkiniz bulunmuyor." };
  }

  const supportsBirthDate = formData.get("supportsBirthDate") === "1";
  const supportsPolicyColumns = formData.get("supportsPolicyColumns") === "1";

  const parsed = clientSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    birthDate: formData.get("birthDate"),
    clientType: formData.get("clientType"),
    policyType: formData.get("policyType"),
    policyStartDate: formData.get("policyStartDate"),
    policyEndDate: formData.get("policyEndDate"),
    firstSavings: formData.get("firstSavings"),
    currentSavings: formData.get("currentSavings")
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Bilgiler doğrulanamadı." };
  }

  if (!parsed.data.id) {
    return { success: false, message: "Bilgiler doğrulanamadı." };
  }

  const { id, name, email, phone, birthDate, clientType, policyType, policyStartDate, policyEndDate, firstSavings, currentSavings } = parsed.data;

  const normaliseString = (value: string | null | undefined) => {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  };

  const allowedClientTypes = new Set(["BES", "ES", "BES+ES"]);
  const cleanedClientType = (() => {
    if (!supportsPolicyColumns) return null;
    const candidate = typeof clientType === "string" ? clientType.toUpperCase() : null;
    return candidate && allowedClientTypes.has(candidate) ? candidate : null;
  })();

  const cleanedBirthDate = supportsBirthDate && typeof birthDate === "string" && birthDate.trim().length > 0 ? birthDate : null;
  const cleanedPolicyType = supportsPolicyColumns ? normaliseString(policyType ?? null) : null;
  const cleanedPolicyStart = supportsPolicyColumns && typeof policyStartDate === "string" && policyStartDate.trim().length > 0 ? policyStartDate : null;
  const cleanedPolicyEnd = supportsPolicyColumns && typeof policyEndDate === "string" && policyEndDate.trim().length > 0 ? policyEndDate : null;
  const cleanedPhone = normaliseString(phone ?? null);

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("clients")
    .select("id, current_savings")
    .eq("owner_id", session.user.id)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) {
    console.error("Supabase client fetch error", fetchError);
    return { success: false, message: "Müşteri bulunamadı." };
  }

  if (!existing) {
    return { success: false, message: "Müşteri bulunamadı." };
  }

  const { error: updateError } = await supabaseAdmin
    .from("clients")
    .update({
      name,
      email,
      phone: cleanedPhone,
      first_savings: firstSavings,
      current_savings: currentSavings,
      ...(supportsBirthDate ? { birth_date: cleanedBirthDate } : {}),
      ...(supportsPolicyColumns
        ? {
            client_type: cleanedClientType,
            policy_type: cleanedPolicyType,
            policy_start_date: cleanedPolicyStart,
            policy_end_date: cleanedPolicyEnd
          }
        : {})
    })
    .eq("id", id)
    .eq("owner_id", session.user.id);

  if (updateError) {
    console.error("Supabase client update error", updateError);
    return { success: false, message: "Müşteri güncellenemedi." };
  }

  if (Number(existing.current_savings ?? 0) !== currentSavings) {
    const { error: snapshotError } = await supabaseAdmin.from("savings_snapshots").insert({
      client_id: id,
      amount: currentSavings
    });

    if (snapshotError) {
      console.error("Supabase snapshot insert error", snapshotError);
    }
  }

  revalidatePath("/clients");
  revalidatePath("/dashboard");

  return { success: true, message: "Müşteri güncellendi." };
}

export async function deleteClient(clientId: string): Promise<ActionResult> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return { success: false, message: "Yetkiniz bulunmuyor." };
  }

  const { data: existing, error } = await supabaseAdmin
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("owner_id", session.user.id)
    .maybeSingle();

  if (error) {
    console.error("Supabase fetch client error", error);
    return { success: false, message: "Müşteri bulunamadı." };
  }

  if (!existing) {
    return { success: false, message: "Müşteri bulunamadı." };
  }

  const { error: updateError } = await supabaseAdmin
    .from("clients")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", clientId)
    .eq("owner_id", session.user.id);

  if (updateError) {
    console.error("Supabase soft delete error", updateError);
    return { success: false, message: "Müşteri silinemedi." };
  }

  revalidatePath("/clients");
  revalidatePath("/dashboard");

  return { success: true, message: "Müşteri silindi." };
}

export async function deleteAllClients(): Promise<ActionResult> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return { success: false, message: "Yetkiniz bulunmuyor." };
  }

  const { data: clients, error } = await supabaseAdmin
    .from("clients")
    .select("id")
    .eq("owner_id", session.user.id)
    .is("deleted_at", null);

  if (error) {
    console.error("Supabase list clients error", error);
    return { success: false, message: "Müşteriler alınamadı." };
  }

  if (!clients || clients.length === 0) {
    return { success: false, message: "Silinecek müşteri bulunmuyor." };
  }

  const nowIso = new Date().toISOString();
  const { error: bulkUpdateError } = await supabaseAdmin
    .from("clients")
    .update({ deleted_at: nowIso })
    .eq("owner_id", session.user.id)
    .is("deleted_at", null);

  if (bulkUpdateError) {
    console.error("Supabase bulk delete error", bulkUpdateError);
    return { success: false, message: "Müşteriler silinemedi." };
  }

  revalidatePath("/clients");
  revalidatePath("/dashboard");

  return { success: true, message: `${clients.length} müşteri silindi.` };
}

export async function restoreClient(clientId: string): Promise<ActionResult> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return { success: false, message: "Yetkiniz bulunmuyor." };
  }

  const { data: existing, error } = await supabaseAdmin
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("owner_id", session.user.id)
    .not("deleted_at", "is", null)
    .maybeSingle();

  if (error) {
    console.error("Supabase fetch client error", error);
    return { success: false, message: "Müşteri bulunamadı." };
  }

  if (!existing) {
    return { success: false, message: "Geri alınacak müşteri bulunamadı." };
  }

  const { error: restoreError } = await supabaseAdmin
    .from("clients")
    .update({ deleted_at: null })
    .eq("id", clientId)
    .eq("owner_id", session.user.id);

  if (restoreError) {
    console.error("Supabase restore error", restoreError);
    return { success: false, message: "Müşteri geri alınamadı." };
  }

  revalidatePath("/clients");
  revalidatePath("/dashboard");

  return { success: true, message: "Müşteri geri alındı." };
}

type UploadKind = "BES" | "ES";

type NormalizedUploadRow = {
  kind: UploadKind;
  name: string;
  email: string;
  phone?: string;
  birthDate?: Date;
  firstSavings?: number;
  currentSavings?: number;
  policyType?: string;
  policyStartDate?: Date;
  policyEndDate?: Date;
};

export async function importClients(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return { success: false, message: "Yetkiniz bulunmuyor." };
  }

  const uploadTypeRaw = formData.get("uploadType");
  const uploadType: UploadKind = uploadTypeRaw === "ES" ? "ES" : "BES";

  let supportsPolicyColumns = true;
  const { error: columnCheckError } = await supabaseAdmin
    .from("clients")
    .select("client_type, policy_type, policy_start_date, policy_end_date")
    .eq("owner_id", session.user.id)
    .limit(1);

  if (columnCheckError) {
    const message = columnCheckError.message ?? "";
    const missingRequiredColumns = ["client_type", "policy_type", "policy_start_date", "policy_end_date"].filter((column) =>
      message.includes(column)
    );

    if (missingRequiredColumns.length > 0) {
      supportsPolicyColumns = false;
    } else {
      console.error("Supabase clients column check error", columnCheckError);
      return { success: false, message: "Müşteri verileri alınamadı." };
    }
  }

  if (uploadType === "ES" && !supportsPolicyColumns) {
    return {
      success: false,
      message:
        "Elementer sigorta CSV yüklemeleri için veritabanındaki clients tablosuna client_type, policy_type, policy_start_date ve policy_end_date kolonlarını eklemelisiniz."
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, message: "Yüklemek için bir CSV dosyası seçmelisiniz." };
  }

  const content = await file.text();
  let rows: NormalizedUploadRow[];
  try {
    if (uploadType === "ES") {
      const parsed = parseElementerCsv(content);
      rows = parsed.map((row) => ({
        kind: "ES",
        name: row.name,
        email: row.email,
        phone: row.phone,
        policyType: row.policyType,
        policyStartDate: row.policyStartDate,
        policyEndDate: row.policyEndDate
      }));
    } else {
      const parsed = parseClientCsv(content);
      rows = parsed.map((row) => ({
        kind: "BES",
        name: row.name,
        email: row.email,
        phone: row.phone,
        birthDate: row.birthDate,
        firstSavings: row.firstSavings,
        currentSavings: row.currentSavings
      }));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "CSV dosyası işlenemedi.";
    return { success: false, message };
  }

  if (rows.length === 0) {
    return { success: false, message: "CSV içinde müşteri satırı bulunamadı." };
  }

  const emails = Array.from(new Set(rows.map((row) => row.email.toLowerCase())));
  let existingMap = new Map<
    string,
    {
      id: string;
      name: string | null;
      current_savings: number | null;
      client_type?: string | null;
      policy_type?: string | null;
      policy_start_date?: string | null;
      policy_end_date?: string | null;
    }
  >();
  if (emails.length > 0) {
    const selectColumns = supportsPolicyColumns
      ? "id, email, name, current_savings, client_type, policy_type, policy_start_date, policy_end_date"
      : "id, email, name, current_savings";

    const { data: existingClients, error: fetchError } = await supabaseAdmin
      .from("clients")
      .select(selectColumns)
      .eq("owner_id", session.user.id)
      .in("email", emails);

    if (fetchError) {
      console.error("Supabase fetch clients error", fetchError);
      return { success: false, message: "Mevcut müşteriler alınamadı." };
    }

    existingMap = new Map(
      (existingClients ?? []).map((client) => [client.email?.toLowerCase() ?? "", client])
    );
  }

  const normalize = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

  let updated = 0;
  let inserted = 0;
  const failures: string[] = [];

  for (const row of rows) {
    const emailKey = row.email.toLowerCase();
    const existingClient = existingMap.get(emailKey);

    const existingName = existingClient?.name ?? "";
    const namesMatch = !!existingClient && normalize(existingName) === normalize(row.name);

    if (existingClient) {
      const previousSavings = Number(existingClient.current_savings ?? 0);
      const updatePayload: Record<string, unknown> = {
        phone: row.phone ?? null,
        deleted_at: null
      };

      if (supportsPolicyColumns) {
        updatePayload.client_type = row.kind;
      }

      if (!namesMatch) {
        updatePayload.name = row.name;
      }

      if (row.kind === "BES") {
        updatePayload.current_savings = row.currentSavings ?? 0;
        if (typeof row.firstSavings === "number") {
          updatePayload.first_savings = row.firstSavings;
        }
        updatePayload.birth_date = row.birthDate ? row.birthDate.toISOString().split("T")[0] : null;
      } else {
        if (supportsPolicyColumns) {
          updatePayload.policy_type = row.policyType ?? null;
          updatePayload.policy_start_date = row.policyStartDate
            ? row.policyStartDate.toISOString().split("T")[0]
            : null;
          updatePayload.policy_end_date = row.policyEndDate ? row.policyEndDate.toISOString().split("T")[0] : null;
        }
      }

      const { error: updateError } = await supabaseAdmin
        .from("clients")
        .update(updatePayload)
        .eq("id", existingClient.id)
        .eq("owner_id", session.user.id);

      if (updateError) {
        console.error("Supabase update client error", updateError);
        failures.push(row.email);
        continue;
      }

      if (row.kind === "BES" && typeof row.currentSavings === "number" && previousSavings !== row.currentSavings) {
        const { error: snapshotError } = await supabaseAdmin.from("savings_snapshots").insert({
          client_id: existingClient.id,
          amount: row.currentSavings
        });

        if (snapshotError) {
          console.error("Supabase snapshot insert error", snapshotError);
        }
      }

      updated += 1;
      continue;
    }

    const insertPayload: Record<string, unknown> = {
      owner_id: session.user.id,
      name: row.name,
      email: row.email,
      phone: row.phone ?? null
    };

    if (supportsPolicyColumns) {
      insertPayload.client_type = row.kind;
    }

    if (row.kind === "BES") {
      insertPayload.birth_date = row.birthDate ? row.birthDate.toISOString().split("T")[0] : null;
      insertPayload.first_savings = row.firstSavings ?? 0;
      insertPayload.current_savings = row.currentSavings ?? 0;
    } else {
      if (supportsPolicyColumns) {
        insertPayload.policy_type = row.policyType ?? null;
        insertPayload.policy_start_date = row.policyStartDate
          ? row.policyStartDate.toISOString().split("T")[0]
          : null;
        insertPayload.policy_end_date = row.policyEndDate ? row.policyEndDate.toISOString().split("T")[0] : null;
      }
      insertPayload.first_savings = 0;
      insertPayload.current_savings = 0;
    }

    const { data: newClient, error: insertError } = await supabaseAdmin
      .from("clients")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertError || !newClient) {
      console.error("Supabase insert client error", insertError);
      failures.push(row.email);
      continue;
    }

    if (row.kind === "BES" && typeof row.currentSavings === "number") {
      const { error: snapshotError } = await supabaseAdmin.from("savings_snapshots").insert({
        client_id: newClient.id,
        amount: row.currentSavings
      });

      if (snapshotError) {
        console.error("Supabase snapshot insert error", snapshotError);
      }
    }

    inserted += 1;
  }

  const { error: uploadLogError } = await supabaseAdmin.from("uploads").insert({
    owner_id: session.user.id,
    filename: file.name ?? "upload.csv",
    total_records: rows.length
  });

  if (uploadLogError) {
    console.error("Supabase upload log error", uploadLogError);
  }

  revalidatePath("/clients");
  revalidatePath("/dashboard");

  // Check for birthday clients and create campaigns
  const birthdayCandidates = rows.filter(
    (row) => row.kind === "BES" && row.birthDate && isBirthdayToday(row.birthDate)
  );
  await createBirthdayCampaigns(
    session.user.id,
    birthdayCandidates.map((row) => ({
      name: row.name,
      email: row.email,
      birthDate: row.birthDate,
      firstSavings: row.firstSavings,
      currentSavings: row.currentSavings
    }))
  );

  const summaryParts = [];
  if (updated > 0) summaryParts.push(`${updated} müşteri güncellendi`);
  if (inserted > 0) summaryParts.push(`${inserted} yeni müşteri eklendi`);
  if (summaryParts.length === 0) summaryParts.push("Herhangi bir kayıt güncellenmedi");
  const failureMessage = failures.length > 0 ? ` (hatalı: ${failures.join(", ")})` : "";

  return {
    success: failures.length === 0,
    message: `${summaryParts.join(", ")}.${failureMessage}`
  };
}

export async function sendSavingsDigest(): Promise<ActionResult> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return { success: false, message: "Yetkiniz bulunmuyor." };
  }

  const { data: clients, error } = await supabaseAdmin
    .from("clients")
    .select("name, email, first_savings, current_savings, created_at")
    .eq("owner_id", session.user.id)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) {
    console.error("Supabase fetch clients error", error);
    return { success: false, message: "Müşteri listesi alınamadı." };
  }

  if (clients.length === 0) {
    return { success: false, message: "E-posta gönderilecek müşteri bulunamadı." };
  }

  const template = await loadEmailTemplate(session.user.id);
  const consultantName = session.user?.name ?? "Danışmanınız";

  const delivery = await deliverDigestEmails({
    consultantName,
    template,
    clients: clients.map((client) => ({
      name: client.name,
      email: client.email ?? undefined,
      firstSavings: Number(client.first_savings ?? 0),
      currentSavings: Number(client.current_savings ?? 0),
      startDate: client.created_at ? new Date(client.created_at) : undefined
    }))
  });

  if (delivery.sentCount > 0 && delivery.preview) {
    const { error: logError } = await supabaseAdmin.from("email_logs").insert({
      owner_id: session.user.id,
      subject: delivery.preview.subject,
      body_preview: delivery.preview.text.slice(0, 120),
      recipients: delivery.sentCount
    });

    if (logError) {
      console.error("Supabase email log insert error", logError);
    }
  }

  revalidatePath("/communications");

  const { sentCount, failed } = delivery;
  let success = true;
  let message: string;

  if (sentCount === 0) {
    success = false;
    message = "Seçili müşterilere e-posta gönderilemedi.";
  } else if (failed.length > 0) {
    const failedList = failed.join(", ");
    message = `${sentCount} müşteriye gönderildi, ancak ${failed.length} adres başarısız oldu (${failedList}).`;
  } else {
    message = `Tasarruf özeti ${sentCount} müşteriye gönderildi.`;
  }

  return { success, message };
}

function isBirthdayToday(birthDate: Date): boolean {
  const today = new Date();
  return birthDate.getMonth() === today.getMonth() && birthDate.getDate() === today.getDate();
}

async function createBirthdayCampaigns(ownerId: string, birthdayClients: any[]) {
  if (birthdayClients.length === 0) return;

  const subject = "Doğum Gününüz Kutlu Olsun! 🎉";
  const bodyText = `Sayın {{CLIENT_NAME}},

Doğum gününüzü kutlar, sağlık, mutluluk ve başarı dolu bir yaş dileriz!

Emeklilik tasarruflarınızda da bu özel günde size güzel haberler verebilmek istiyoruz:
- Güncel tasarrufunuz: {{CURRENT_SAVINGS}}
- İlk kayıt tutarınız: {{FIRST_SAVINGS}}
- Büyüme oranınız: {{SAVINGS_GROWTH}}

Özel gününüzü kutlar, nice mutlu yıllar dileriz!

Saygılarımızla,
{{CONSULTANT_NAME}}`;
  
  const bodyHtml = bodyText.replace(/\n/g, '<br>');

  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from("communication_campaigns")
    .insert({
      owner_id: ownerId,
      subject,
      body_html: bodyHtml,
      body_text: bodyText,
      scheduled_at: new Date().toISOString(),
      status: 'DRAFT'
    })
    .select('id')
    .single();

  if (campaignError || !campaign) {
    console.error('Birthday campaign creation failed:', campaignError);
    return;
  }

  const recipients = birthdayClients.map(client => ({
    campaign_id: campaign.id,
    client_id: 'temp', // Will be updated with actual client ID
    client_name: client.name,
    client_email: client.email
  }));

  const { error: recipientsError } = await supabaseAdmin
    .from("communication_recipients")
    .insert(recipients);

  if (recipientsError) {
    console.error('Birthday recipients creation failed:', recipientsError);
  }
}
