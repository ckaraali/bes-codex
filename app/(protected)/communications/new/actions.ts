"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";
import { sanitizeRichText, sanitizeText, extractPlainTextFromHtml } from "@/lib/sanitize";
import { formatCurrency } from "@/lib/format";
import { generateSavingsLineChart } from "@/lib/charts";
import { sendSavingsDigestEmail } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase";

const plannerSchema = z.object({
  clientIds: z.array(z.string()).min(1, "En az bir müşteri seçmelisiniz."),
  reasons: z.array(z.string()).min(1, "En az bir iletişim sebebi seçmelisiniz."),
  subject: z
    .string()
    .min(3, "Konu en az 3 karakter olmalıdır.")
    .max(140, "Konu en fazla 140 karakter olabilir."),
  body: z
    .string()
    .min(1, "İletişim içeriği boş olamaz.")
    .max(8000, "İletişim içeriği en fazla 8000 karakter olabilir."),
  bodyText: z.string().min(20, "İletişim içeriği en az 20 karakter olmalıdır."),
  channels: z.array(z.string()).min(1, "En az bir iletişim kanalı seçmelisiniz."),
  sendNow: z.boolean().default(false),
  scheduleDate: z.string().optional(),
  scheduleTime: z.string().optional()
}).superRefine((data, ctx) => {
  if (!data.sendNow) {
    if (!data.scheduleDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Lütfen planlanan tarihi seçin.",
        path: ["scheduleDate"]
      });
    }
    if (!data.scheduleTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Lütfen planlanan saati seçin.",
        path: ["scheduleTime"]
      });
    }
  }
});

type PlannerSchema = z.infer<typeof plannerSchema>;

type PlannerField = "clientIds" | "reasons" | "subject" | "body" | "channels" | "scheduleDate" | "scheduleTime";
type FieldErrors = Partial<Record<PlannerField, string>>;

export interface PlanCommunicationResult {
  success: boolean;
  message: string;
  scheduledAt?: string;
  recipients?: number;
  failed?: string[];
  fieldErrors?: FieldErrors;
}

export async function planCommunication(
  _prevState: PlanCommunicationResult,
  incomingFormData: FormData
): Promise<PlanCommunicationResult> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return { success: false, message: "Bu işlem için yetkiniz bulunmuyor." };
  }

  const formData = ensureFormData(incomingFormData);

  const clientIds = formData
    .getAll("clientIds")
    .map((value) => sanitizeText(value?.toString() ?? ""))
    .filter(Boolean);

  const reasons = formData
    .getAll("reasons")
    .map((value) => sanitizeText(value?.toString() ?? ""))
    .filter(Boolean);

  const channels = formData
    .getAll("channels")
    .map((value) => sanitizeText(value?.toString() ?? ""))
    .filter(Boolean);

  const sendNow = sanitizeText(formData.get("sendNow")?.toString() ?? "").toLowerCase() === "true";
  const subject = sanitizeText(formData.get("subject")?.toString() ?? "");
  const rawBody = formData.get("body")?.toString() ?? "";
  const body = sanitizeRichText(rawBody);
  const bodyText = extractPlainTextFromHtml(body);
  const scheduleDateRaw = sanitizeText(formData.get("scheduleDate")?.toString() ?? "");
  const scheduleTimeRaw = sanitizeText(formData.get("scheduleTime")?.toString() ?? "");

  const parsed = plannerSchema.safeParse({
    clientIds,
    reasons,
    subject,
    body,
    bodyText,
    channels,
    sendNow,
    scheduleDate: scheduleDateRaw || undefined,
    scheduleTime: scheduleTimeRaw || undefined
  });

  if (!parsed.success) {
    const flatten = parsed.error.flatten();
    const fieldErrors = Object.fromEntries(
      Object.entries(flatten.fieldErrors)
        .map(([key, value]) => {
          const message = value?.[0] ?? "";
          if (!message) {
            return null;
          }
          if (key === "bodyText") {
            return ["body", message];
          }
          return [key, message];
        })
        .filter(Boolean) as [PlannerField, string][]
    ) as FieldErrors;
    const message = flatten.formErrors[0] ?? Object.values(fieldErrors).find(Boolean) ?? "Formu kontrol edip tekrar deneyin.";
    return {
      success: false,
      message,
      fieldErrors
    };
  }

  const { bodyText: _ignore, ...data } = parsed.data;

  let scheduledAt: string | undefined;
  if (data.sendNow) {
    scheduledAt = new Date().toISOString();
  } else if (data.scheduleDate && data.scheduleTime) {
    const isoCandidate = `${data.scheduleDate}T${data.scheduleTime}`;
    const timestamp = new Date(isoCandidate);
    if (!Number.isNaN(timestamp.getTime())) {
      scheduledAt = timestamp.toISOString();
    }
  }

  const { data: clientRows, error: clientsError } = await supabaseAdmin
    .from("clients")
    .select("id, name, email, first_savings, current_savings, created_at")
    .eq("owner_id", session.user.id)
    .is("deleted_at", null)
    .in("id", data.clientIds);

  if (clientsError) {
    console.error("Supabase fetch selected clients error", clientsError);
    return {
      success: false,
      message: "Seçilen müşteriler alınamadı. Lütfen tekrar deneyin."
    };
  }

  const clients = clientRows ?? [];

  if (clients.length !== data.clientIds.length) {
    return {
      success: false,
      message: "Seçilen müşterilerden bazıları bulunamadı. Lütfen sayfayı yenileyip tekrar deneyin."
    };
  }

  const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;

  const totals = clients.reduce(
    (acc, client) => {
      const first = Number(client.first_savings ?? 0);
      const current = Number(client.current_savings ?? 0);
      return {
        first: acc.first + first,
        current: acc.current + current
      };
    },
    { first: 0, current: 0 }
  );

  const change = totals.current - totals.first;
  const growth = totals.first === 0 ? 0 : (change / totals.first) * 100;

  const chartImage = await generateSavingsLineChart({
    labels: ["Geçen Ay", "Bugün"],
    values: [Number(totals.first.toFixed(2)), Number(totals.current.toFixed(2))]
  });

  const summaryHtml = `
    <div style="margin-top:24px;">
      <p style="margin:0 0 12px 0; font-size:15px;">Bu hafta itibarıyla bireysel emeklilik portföyünüz:</p>
      <p style="margin:4px 0; font-size:15px;">💰 <strong>Toplam Birikim:</strong> ${formatCurrency(totals.current)}</p>
      <p style="margin:4px 0; font-size:15px;">📊 <strong>Geçen Ay:</strong> ${formatCurrency(totals.first)}</p>
      <p style="margin:4px 0; font-size:15px;">📈 <strong>Değişim:</strong> ${growth >= 0 ? "+" : ""}${growth.toFixed(2)}%</p>
      <p style="margin:4px 0 16px 0; font-size:15px;">💼 <strong>Aylık Katkı:</strong> ${formatCurrency(change)}</p>
    </div>
    ${
      chartImage
        ? `<div style="margin:20px 0; text-align:center;"><img src="${chartImage}" alt="Birikim değişimi grafiği" style="max-width:100%; border:1px solid #d1d5db; border-radius:12px;" /></div>`
        : ""
    }
  `;

  const finalBodyHtml = `${data.body}${summaryHtml}`;
  const finalBodyText = extractPlainTextFromHtml(finalBodyHtml);
  const missingEmailRecipients = clients
    .filter((client) => !client.email)
    .map((client) => client.name || client.id);

  const recipientEmails = clients
    .map((client) => ({
      id: client.id,
      name: client.name,
      email: client.email
    }))
    .filter((client) => Boolean(client.email));

  if (data.sendNow && recipientEmails.length === 0) {
    return {
      success: false,
      message: "Seçilen müşteriler için geçerli e-posta adresi bulunamadı. Lütfen adresleri ekleyin."
    };
  }

  let sendResult: { sent: number; failed: string[]; previewSubject?: string; previewText?: string } | null = null;
  if (data.sendNow) {
    const failed: string[] = [...missingEmailRecipients];
    let sent = 0;
    let previewSubject: string | undefined;
    let previewText: string | undefined;
    const consultantName = session.user?.name ?? "Danışmanınız";
    const currentDateLabel = new Date().toLocaleDateString("tr-TR");
    for (const recipient of recipientEmails) {
      const clientRecord = clients.find((client) => client.id === recipient.id);
      const replacements = buildPlaceholderMap({
        consultantName,
        currentDate: currentDateLabel,
        clientName: recipient.name,
        clientEmail: recipient.email ?? undefined,
        firstSavings: Number(clientRecord?.first_savings ?? 0),
        currentSavings: Number(clientRecord?.current_savings ?? 0),
        startDate: clientRecord?.created_at ? new Date(clientRecord.created_at) : undefined
      });

      const subjectTemplate = applyTemplate(data.subject, replacements);
      const personalizedHtml = applyTemplate(finalBodyHtml, replacements);
      const personalizedText = extractPlainTextFromHtml(personalizedHtml);
      try {
        await sendSavingsDigestEmail({
          to: [recipient.email!],
          subject: subjectTemplate,
          html: personalizedHtml,
          text: personalizedText
        });
        sent += 1;
        if (!previewSubject) {
          previewSubject = subjectTemplate;
          previewText = personalizedText;
        }
      } catch (error) {
        console.error("Hemen gönder e-postası başarısız:", error);
        failed.push(recipient.email ?? recipient.name ?? "Bilinmiyor");
      }
    }
    sendResult = { sent, failed, previewSubject, previewText };
    if (sent === 0) {
      return {
        success: false,
        message: "E-posta gönderilemedi. Lütfen SMTP ayarlarınızı kontrol edin.",
        failed: failed.length > 0 ? failed : undefined
      };
    }
  }

  const campaignStatus = data.sendNow ? "COMPLETED" : scheduledDate ? "SCHEDULED" : "DRAFT";
  const { data: newCampaign, error: campaignError } = await supabaseAdmin
    .from("communication_campaigns")
    .insert({
      owner_id: session.user.id,
      subject: data.subject,
      body_html: finalBodyHtml,
      body_text: finalBodyText,
      reasons_json: JSON.stringify(data.reasons),
      scheduled_at: scheduledDate ? scheduledDate.toISOString() : null,
      status: campaignStatus
    })
    .select("id")
    .single();

  if (campaignError || !newCampaign) {
    console.error("Supabase campaign insert error", campaignError);
    return {
      success: false,
      message: "Kampanya kaydedilemedi. Lütfen tekrar deneyin."
    };
  }

  const recipientsPayload = clients.map((client) => ({
    campaign_id: newCampaign.id,
    client_id: client.id,
    client_name: client.name ?? "",
    client_email: client.email ?? ""
  }));

  if (recipientsPayload.length > 0) {
    const { error: recipientsError } = await supabaseAdmin
      .from("communication_recipients")
      .insert(recipientsPayload);

    if (recipientsError) {
      console.error("Supabase recipients insert error", recipientsError);
    }
  }

  const channelStatusesPayload = data.channels.map((channel) => ({
    campaign_id: newCampaign.id,
    channel: channel.toUpperCase(),
    status: data.sendNow ? "SENT" : scheduledDate ? "SCHEDULED" : "PENDING",
    scheduled_at: scheduledDate ? scheduledDate.toISOString() : null,
    completed_at: data.sendNow ? new Date().toISOString() : null
  }));

  if (channelStatusesPayload.length > 0) {
    const { error: statusError } = await supabaseAdmin
      .from("communication_channel_statuses")
      .insert(channelStatusesPayload);

    if (statusError) {
      console.error("Supabase channel status insert error", statusError);
    }
  }

  if (data.sendNow && sendResult) {
    const { error: logError } = await supabaseAdmin.from("email_logs").insert({
      owner_id: session.user.id,
      subject: sendResult.previewSubject ?? data.subject,
      body_preview: (sendResult.previewText ?? finalBodyText).slice(0, 160),
      recipients: sendResult.sent,
      sent_at: new Date().toISOString()
    });

    if (logError) {
      console.error("Supabase email log insert error", logError);
    }
  }

  revalidatePath("/communications");

  return {
    success: true,
    message: data.sendNow
      ? `E-posta ${sendResult?.sent ?? 0} müşteriye gönderildi${sendResult && sendResult.failed.length > 0 ? `, başarısız: ${sendResult.failed.join(", ")}` : ""}.`
      : `${data.clientIds.length} müşteri için iletişim planı hazır.`,
    scheduledAt,
    recipients: data.sendNow ? sendResult?.sent : undefined,
    failed: data.sendNow ? sendResult?.failed : undefined
  };
}

function applyTemplate(template: string, replacements: Record<string, string>) {
  return Object.entries(replacements).reduce((acc, [token, value]) => acc.replaceAll(token, value), template);
}

function buildPlaceholderMap({
  consultantName,
  currentDate,
  clientName,
  clientEmail,
  firstSavings,
  currentSavings,
  startDate
}: {
  consultantName: string;
  currentDate: string;
  clientName: string;
  clientEmail?: string;
  firstSavings: number;
  currentSavings: number;
  startDate?: Date;
}): Record<string, string> {
  const first = Number(firstSavings);
  const current = Number(currentSavings);
  const growthValue = current - first;
  return {
    "{{CONSULTANT_NAME}}": consultantName,
    "{{CURRENT_DATE}}": currentDate,
    "{{CLIENT_NAME}}": clientName,
    "{{CLIENT_EMAIL}}": clientEmail ?? "",
    "{{CURRENT_SAVINGS}}": formatCurrency(current),
    "{{FIRST_SAVINGS}}": formatCurrency(first),
    "{{SAVINGS_GROWTH}}": formatCurrency(growthValue),
    "{{CLIENT_START_DATE}}": startDate ? new Date(startDate).toLocaleDateString("tr-TR") : "",
    "{{CLIENT_LIST}}": ""
  };
}

function ensureFormData(form: FormData | { [key: string]: unknown }): FormData {
  if (form instanceof FormData) {
    return form;
  }

  const data = new FormData();
  Object.entries(form).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => data.append(key, `${item}`));
    } else if (value != null) {
      data.append(key, `${value}`);
    }
  });
  return data;
}
