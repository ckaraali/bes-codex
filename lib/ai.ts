import { sanitizeText } from "@/lib/sanitize";

const OPENAI_API_URL = process.env.OPENAI_API_URL ?? "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export type EmailTone = "formal" | "friendly";

export interface GeneratedEmailDraft {
  subject: string;
  body: string;
}

export class MissingOpenAIApiKeyError extends Error {
  constructor() {
    super("OPENAI_API_KEY env variable is missing.");
    this.name = "MissingOpenAIApiKeyError";
  }
}

export async function generateEmailDraft({
  prompt,
  tone
}: {
  prompt: string;
  tone: EmailTone;
}): Promise<GeneratedEmailDraft> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new MissingOpenAIApiKeyError();
  }

  const systemMessage = [
    "You are an assistant that prepares Turkish pension savings digest emails for financial advisors.",
    "Always produce concise yet informative content.",
    "Use the following placeholders exactly as written whenever personal data is referenced: {{CONSULTANT_NAME}}, {{CLIENT_NAME}}, {{CLIENT_EMAIL}}, {{CURRENT_SAVINGS}}, {{FIRST_SAVINGS}}, {{SAVINGS_GROWTH}}, {{CLIENT_START_DATE}}, {{CURRENT_DATE}}, {{CLIENT_LIST}}.",
    "Begin the body with the salutation 'Sayın {{CLIENT_NAME}},' and keep placeholders untouched.",
    "Every draft must include at minimum the customer's current savings, first savings, growth, and start date placeholders.",
    "Return valid JSON with keys `subject` and `body`.",
    "The body should be multi-paragraph plain text that can include bullet lists with hyphens."
  ].join(" ");

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemMessage },
        {
          role: "user",
          content: [
            `Yazım tonu: ${tone === "formal" ? "resmi" : "samimi"}, Türkçe.`,
            "Aşağıdaki placeholders metinde mutlaka kullanılabilir ve içeriğe uygun şekilde yerleştirilmelidir.",
            "Özellikle {{CURRENT_SAVINGS}}, {{FIRST_SAVINGS}}, {{SAVINGS_GROWTH}}, {{CLIENT_START_DATE}} ifadelerini gövdede belirt.",
            "Kullanıcı yönergesi:",
            prompt,
            "",
            "Lütfen yalnızca JSON çıktısı üret.",
            '{"subject":"","body":""}'
          ].join("\n")
        }
      ],
      temperature: 0.6,
      max_tokens: 600
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI response did not include content.");
  }

  try {
    const parsed = JSON.parse(content);
    if (!parsed.subject || !parsed.body) {
      throw new Error("Missing subject or body field.");
    }
    return {
      subject: sanitizeText(String(parsed.subject)),
      body: sanitizeText(String(parsed.body))
    };
  } catch (error) {
    throw new Error(`OpenAI response could not be parsed: ${(error as Error).message}. Raw content: ${content}`);
  }
}
