'use server';

import { DEFAULT_EMAIL_BODY, DEFAULT_EMAIL_SUBJECT, DigestClient, renderDigestEmail } from "@/lib/emailTemplate";
import { sanitizeHtml } from "@/lib/sanitize";
import { sendSavingsDigestEmail } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase";

export async function loadEmailTemplate(ownerId: string): Promise<{ subject: string; body: string } | null> {
  const { data, error } = await supabaseAdmin
    .from("email_templates")
    .select("subject, body")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) {
    console.error("Supabase email template fetch error", error);
    return null;
  }

  return data ? { subject: data.subject, body: data.body } : null;
}

type DigestTarget = DigestClient & { email?: string };

interface DeliveryResult {
  sentCount: number;
  failed: string[];
  preview: { subject: string; text: string } | null;
}

export async function deliverDigestEmails({
  consultantName,
  template,
  clients
}: {
  consultantName: string;
  template: { subject: string; body: string } | null;
  clients: DigestTarget[];
}): Promise<DeliveryResult> {
  const subjectTemplate = template?.subject ?? DEFAULT_EMAIL_SUBJECT;
  const bodyTemplate = template?.body ?? DEFAULT_EMAIL_BODY;
  const failed: string[] = [];
  let sentCount = 0;
  let preview: { subject: string; text: string } | null = null;
  const currentDate = new Date();

  for (const client of clients) {
    if (!client.email) {
      failed.push(client.name || "E-posta bulunmuyor");
      continue;
    }

    const digest = renderDigestEmail({
      subjectTemplate,
      bodyTemplate,
      consultantName,
      clients: [
        {
          name: sanitizeHtml(client.name),
          email: client.email,
          firstSavings: client.firstSavings,
          currentSavings: client.currentSavings,
          startDate: client.startDate
        }
      ],
      currentDate
    });

    try {
      await sendSavingsDigestEmail({
        to: [client.email],
        subject: digest.subject,
        text: digest.text,
        html: digest.html
      });
      sentCount += 1;
      if (!preview) {
        preview = { subject: digest.subject, text: digest.text };
      }
    } catch (error) {
      console.error("E-posta gönderimi başarısız:", error);
      failed.push(client.email);
    }
  }

  return { sentCount, failed, preview };
}
