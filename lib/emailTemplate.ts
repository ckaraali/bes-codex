import { formatCurrency } from "./format";

export const EMAIL_TEMPLATE_PLACEHOLDERS = [
  { token: "{{CONSULTANT_NAME}}", description: "Danışman adı veya varsayılan hitap" },
  { token: "{{CLIENT_NAME}}", description: "Müşterinin adı" },
  { token: "{{CLIENT_EMAIL}}", description: "Müşterinin e-posta adresi" },
  { token: "{{CURRENT_SAVINGS}}", description: "Müşterinin güncel tasarruf tutarı" },
  { token: "{{FIRST_SAVINGS}}", description: "Müşterinin ilk kayıtlı tasarruf tutarı" },
  { token: "{{SAVINGS_GROWTH}}", description: "Müşterinin tasarruf büyüme yüzdesi" },
  { token: "{{CLIENT_START_DATE}}", description: "Müşterinin sisteme katıldığı tarih" },
  { token: "{{CURRENT_DATE}}", description: "E-postanın gönderildiği tarih (TR formatında)" },
  { token: "{{CLIENT_LIST}}", description: "Birden fazla müşteri seçildiğinde hepsini listeler" }
] as const;

export const DEFAULT_EMAIL_SUBJECT = "Sayın {{CLIENT_NAME}}, emeklilik fon özetiniz";

export const DEFAULT_EMAIL_BODY = [
  "Sayın {{CLIENT_NAME}},",
  "",
  "Güncel tasarruf tutarınız: {{CURRENT_SAVINGS}}",
  "İlk kayıtlı tutarınız: {{FIRST_SAVINGS}}",
  "Toplam büyüme: {{SAVINGS_GROWTH}}",
  "Sisteme katıldığınız tarih: {{CLIENT_START_DATE}}",
  "",
  "Güncel tarih: {{CURRENT_DATE}}",
  "",
  "Sorularınız için danışmanınız {{CONSULTANT_NAME}} ile iletişime geçebilirsiniz.",
  "",
  "{{CLIENT_LIST}}"
].join("\n");

export interface DigestClient {
  name: string;
  email?: string;
  firstSavings: number;
  currentSavings: number;
  startDate?: Date;
}

interface DigestRenderOptions {
  subjectTemplate: string;
  bodyTemplate: string;
  consultantName: string;
  clients: DigestClient[];
  currentDate?: Date;
}

export function renderDigestEmail({
  subjectTemplate,
  bodyTemplate,
  consultantName,
  clients,
  currentDate
}: DigestRenderOptions) {
  const primary = clients[0] ?? null;
  const effectiveDate = (currentDate ?? new Date()).toLocaleDateString("tr-TR");

  const replacements: Record<string, string> = {
    "{{CONSULTANT_NAME}}": consultantName,
    "{{CURRENT_DATE}}": effectiveDate,
    "{{CLIENT_LIST}}": "",
    "{{CLIENT_NAME}}": "",
    "{{CLIENT_EMAIL}}": "",
    "{{CURRENT_SAVINGS}}": "",
    "{{FIRST_SAVINGS}}": "",
    "{{SAVINGS_GROWTH}}": "",
    "{{CLIENT_START_DATE}}": ""
  };

  if (primary) {
    const current = formatCurrency(primary.currentSavings);
    const initial = formatCurrency(primary.firstSavings);
    const growth =
      primary.firstSavings === 0
        ? "—"
        : `${(((primary.currentSavings - primary.firstSavings) / primary.firstSavings) * 100).toFixed(1)}%`;

    replacements["{{CLIENT_NAME}}"] = primary.name;
    replacements["{{CLIENT_EMAIL}}"] = primary.email ?? "";
    replacements["{{CURRENT_SAVINGS}}"] = current;
    replacements["{{FIRST_SAVINGS}}"] = initial;
    replacements["{{SAVINGS_GROWTH}}"] = growth;
    const startDate = primary.startDate ? new Date(primary.startDate).toLocaleDateString("tr-TR") : "";
    replacements["{{CLIENT_START_DATE}}"] = startDate;
  }

  const clientListEntries = clients.length > 1
    ? clients.map((client) => {
        const current = formatCurrency(client.currentSavings);
        const initial = formatCurrency(client.firstSavings);
        const startDate = client.startDate ? new Date(client.startDate).toLocaleDateString("tr-TR") : "-";
        return {
          text: `- ${client.name}: güncel tasarruf ${current} (ilk kayıt ${initial}, başlangıç ${startDate})`,
          html: `<li><strong>${escapeHtml(client.name)}</strong> — güncel tasarruf ${escapeHtml(current)} (ilk kayıt ${escapeHtml(initial)}, başlangıç ${escapeHtml(startDate)})</li>`
        };
      })
    : [];

  if (clientListEntries.length > 0) {
    replacements["{{CLIENT_LIST}}"] = clientListEntries.map((entry) => entry.text).join("\n");
  }

  const clientListHtml = clientListEntries.length > 0 ? `<ul>${clientListEntries.map((entry) => entry.html).join("")}</ul>` : "";

  const subject = applyTemplate(subjectTemplate, replacements);
  const text = applyTemplate(bodyTemplate, replacements);
  const html = buildHtmlTemplate(bodyTemplate, replacements, clientListHtml);

  return { subject, text, html };
}

function applyTemplate(template: string, replacements: Record<string, string>) {
  return Object.entries(replacements).reduce((acc, [token, value]) => acc.replaceAll(token, value), template);
}

function buildHtmlTemplate(template: string, replacements: Record<string, string>, clientListHtml: string) {
  const marker = "__CLIENT_LIST_MARKER__";
  const templateWithMarker = template.replaceAll("{{CLIENT_LIST}}", marker);
  const replaced = applyTemplate(templateWithMarker, replacements);
  const lines = replaced.split("\n");
  const htmlParts: string[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    const paragraph = paragraphLines.map((line) => escapeHtml(line)).join("<br />");
    htmlParts.push(`<p>${paragraph}</p>`);
    paragraphLines = [];
  };

  lines.forEach((line) => {
    if (line.includes(marker)) {
      const segments = line.split(marker);
      segments.forEach((segment, index) => {
        const trimmed = segment.trim();
        if (trimmed.length > 0) {
          paragraphLines.push(trimmed);
        }
        if (index < segments.length - 1) {
          flushParagraph();
          if (clientListHtml) {
            htmlParts.push(clientListHtml);
          }
        }
      });
    } else if (line.trim().length === 0) {
      flushParagraph();
    } else {
      paragraphLines.push(line.trim());
    }
  });

  flushParagraph();
  if (!replaced.includes(marker) && clientListHtml) {
    htmlParts.push(clientListHtml);
  }

  return htmlParts.join("\n");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
