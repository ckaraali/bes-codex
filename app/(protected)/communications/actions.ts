"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";
import { DEFAULT_EMAIL_BODY, DEFAULT_EMAIL_SUBJECT } from "@/lib/emailTemplate";
import { MissingOpenAIApiKeyError, generateEmailDraft } from "@/lib/ai";
import { sanitizeText } from "@/lib/sanitize";
import { deliverDigestEmails, loadEmailTemplate } from "@/lib/digest-delivery";
import { AI_MARKET_TOPICS } from "@/lib/ai-topics";
import { supabaseAdmin } from "@/lib/supabase";

const templateSchema = z.object({
  subject: z
    .string()
    .min(3, "Konu en az 3 karakter olmalıdır.")
    .max(140, "Konu en fazla 140 karakter olabilir."),
  body: z
    .string()
    .min(20, "E-posta gövdesi en az 20 karakter olmalıdır.")
    .max(8000, "E-posta gövdesi en fazla 8000 karakter olabilir.")
});

export type TemplateActionResult = {
  success: boolean;
  message: string;
  subject?: string;
  body?: string;
};

const aiSchema = z.object({
  prompt: z.string().min(10, "Lütfen e-posta için daha detaylı bir istek yazın."),
  tone: z.enum(["formal", "friendly"]),
  topics: z.array(z.string()).default([])
});

const sendSchema = z.object({
  clientIds: z.array(z.string().min(1)).min(1, "Gönderilecek en az bir müşteri seçmelisiniz.")
});

export type SendActionResult = {
  success: boolean;
  message: string;
  recipients?: number;
  failed?: string[];
};

export async function saveEmailTemplate(formData: FormData): Promise<TemplateActionResult> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return { success: false, message: "Yetkiniz bulunmuyor." };
  }

  const parsed = templateSchema.safeParse({
    subject: sanitizeText(formData.get("subject")?.toString() || ""),
    body: sanitizeText(formData.get("body")?.toString() || "")
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Şablon kaydedilemedi.";
    return { success: false, message: firstError };
  }

  const { subject, body } = parsed.data;

  const { error } = await supabaseAdmin
    .from("email_templates")
    .upsert(
      {
        owner_id: session.user.id,
        subject,
        body
      },
      { onConflict: "owner_id" }
    );

  if (error) {
    console.error("Supabase email template upsert error", error);
    return {
      success: false,
      message: "Şablon kaydedilemedi. Daha sonra tekrar deneyin.",
      subject,
      body
    };
  }

  revalidatePath("/communications");

  return { success: true, message: "Şablon güncellendi.", subject, body };
}

export async function resetEmailTemplate(): Promise<TemplateActionResult> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return { success: false, message: "Yetkiniz bulunmuyor." };
  }

  const { error } = await supabaseAdmin
    .from("email_templates")
    .upsert(
      {
        owner_id: session.user.id,
        subject: DEFAULT_EMAIL_SUBJECT,
        body: DEFAULT_EMAIL_BODY
      },
      { onConflict: "owner_id" }
    );

  if (error) {
    console.error("Supabase email template reset error", error);
    return {
      success: false,
      message: "Varsayılan şablon geri yüklenemedi."
    };
  }

  revalidatePath("/communications");

  return {
    success: true,
    message: "Varsayılan şablon geri yüklendi.",
    subject: DEFAULT_EMAIL_SUBJECT,
    body: DEFAULT_EMAIL_BODY
  };
}

export async function generateTemplateWithAI(formData: FormData): Promise<TemplateActionResult> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return { success: false, message: "Yetkiniz bulunmuyor." };
  }

  const parsed = aiSchema.safeParse({
    prompt: sanitizeText(formData.get("prompt")?.toString() || ""),
    tone: formData.get("tone"),
    topics: formData.getAll("topics").map((value) => sanitizeText(value?.toString() ?? "")).filter((value) => value.length > 0)
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "İstek anlaşılamadı.";
    return { success: false, message: firstError };
  }

  try {
    const { topics, prompt, tone } = parsed.data;
    const topicInstructions = topics
      .map((id) => AI_MARKET_TOPICS.find((topic) => topic.id === id)?.instruction)
      .filter((instruction): instruction is string => Boolean(instruction));

    const combinedPrompt = [prompt.trim()]
      .concat(
        topicInstructions.length > 0
          ? [
              "",
              "Ek olarak aşağıdaki finans başlıkları için son 1 aylık (varsa yüzdesel) değişimleri maddeler halinde aktar:",
              topicInstructions.map((instruction) => `- ${instruction}`).join("\n")
            ]
          : []
      )
      .join("\n");

    const result = await generateEmailDraft({ prompt: combinedPrompt, tone });
    return {
      success: true,
      message: "Yapay zeka taslağı hazırlandı. Gerekirse düzenleyebilirsiniz.",
      subject: result.subject,
      body: result.body
    };
  } catch (error) {
    if (error instanceof MissingOpenAIApiKeyError) {
      return {
        success: false,
        message: "Yapay zeka için OPENAI_API_KEY ortam değişkenini tanımlayın."
      };
    }
    return {
      success: false,
      message: error instanceof Error ? error.message : "Taslak oluşturulamadı."
    };
  }
}

export async function sendClientDigests(formData: FormData): Promise<SendActionResult> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return { success: false, message: "Yetkiniz bulunmuyor." };
  }

  const clientIds = formData
    .getAll("clientIds")
    .map((value) => value?.toString().trim())
    .filter((value): value is string => Boolean(value));

  const parsed = sendSchema.safeParse({ clientIds });
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Gönderilecek en az bir müşteri seçin.";
    return { success: false, message: firstError };
  }

  const { data: clientRows, error } = await supabaseAdmin
    .from("clients")
    .select("id, name, email, first_savings, current_savings, created_at")
    .eq("owner_id", session.user.id)
    .is("deleted_at", null)
    .in("id", parsed.data.clientIds)
    .order("name", { ascending: true });

  if (error) {
    console.error("Supabase fetch clients error", error);
    return { success: false, message: "Seçilen müşteriler alınamadı." };
  }

  const clients = clientRows ?? [];

  if (clients.length === 0) {
    return { success: false, message: "Seçilen müşteriler bulunamadı." };
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

  return summariseSendResult(delivery.sentCount, clients.length, delivery.failed);
}

function summariseSendResult(sentCount: number, total: number, failed: string[]): SendActionResult {
  if (sentCount === 0) {
    return {
      success: false,
      message: "Seçili müşterilere e-posta gönderilemedi.",
      recipients: 0,
      failed: failed.length > 0 ? [...failed] : undefined
    };
  }

  if (failed.length > 0) {
    const failedList = failed.join(", ");
    return {
      success: true,
      message: `${sentCount} müşteriye gönderildi, ancak ${failed.length} adres başarısız oldu (${failedList}).`,
      recipients: sentCount,
      failed: [...failed]
    };
  }

  return {
    success: true,
    message: `Tasarruf özeti ${sentCount} müşteriye gönderildi.`,
    recipients: sentCount
  };
}
