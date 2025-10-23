export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\//g, "&#x2F;");
}

export function sanitizeText(input: string): string {
  return input.replace(/[<>\"'&]/g, "");
}

const ALLOWED_RICH_TEXT_TAGS = new Set(["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "span", "h1", "h2", "h3"]);
const SELF_CLOSING_TAGS = new Set(["br"]);

export function sanitizeRichText(input: string): string {
  if (!input) {
    return "";
  }

  let sanitized = input;

  sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, "");
  sanitized = sanitized.replace(/<\/?(script|style|iframe|object|embed|meta|link)[^>]*>/gi, "");
  sanitized = sanitized.replace(/\s+on\w+="[^"]*"/gi, "");
  sanitized = sanitized.replace(/\s+on\w+='[^']*'/gi, "");
  sanitized = sanitized.replace(/\s+style="[^"]*"/gi, "");
  sanitized = sanitized.replace(/\s+style='[^']*'/gi, "");

  sanitized = sanitized.replace(/<\/?([a-z0-9]+)(?:\s[^>]*)?>/gi, (match, tagName) => {
    const lowerTag = tagName.toLowerCase();
    const isClosing = match.startsWith("</");

    if (lowerTag === "div") {
      return isClosing ? "</p>" : "<p>";
    }

    if (!ALLOWED_RICH_TEXT_TAGS.has(lowerTag)) {
      return "";
    }

    if (SELF_CLOSING_TAGS.has(lowerTag)) {
      return `<${lowerTag} />`;
    }

    return isClosing ? `</${lowerTag}>` : `<${lowerTag}>`;
  });

  sanitized = sanitized.replace(/<(p)>\s*<\/p>/gi, "");

  sanitized = sanitized
    .replace(/&nbsp;/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return sanitized || "<p></p>";
}

export function extractPlainTextFromHtml(html: string): string {
  if (!html) {
    return "";
  }
  const withoutTags = html.replace(/<[^>]*>/g, " ");
  return sanitizeText(withoutTags).replace(/\s+/g, " ").trim();
}
