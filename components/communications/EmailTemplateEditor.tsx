"use client";

import { useState, useTransition } from "react";
import type { TemplateActionResult } from "@/app/(protected)/communications/actions";
import { generateTemplateWithAI, resetEmailTemplate, saveEmailTemplate } from "@/app/(protected)/communications/actions";
import { AI_MARKET_TOPICS } from "@/lib/ai-topics";

interface PlaceholderInfo {
  token: string;
  description: string;
}

interface Props {
  initialSubject: string;
  initialBody: string;
  placeholders: readonly PlaceholderInfo[];
}

export function EmailTemplateEditor({ initialSubject, initialBody, placeholders }: Props) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [message, setMessage] = useState<TemplateActionResult | null>(null);
  const [isSaving, startSave] = useTransition();
  const [isGenerating, startGenerate] = useTransition();
  const [aiPrompt, setAiPrompt] = useState("");
  const [tone, setTone] = useState<"formal" | "friendly">("formal");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  const toggleTopic = (id: string) => {
    setSelectedTopics((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleSave = () => {
    startSave(async () => {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("body", body);
      const result = await saveEmailTemplate(formData);
      if (result.success && result.subject && result.body) {
        setSubject(result.subject);
        setBody(result.body);
      }
      setMessage(result);
    });
  };

  const handleReset = () => {
    startSave(async () => {
      const result = await resetEmailTemplate();
      if (result.subject && result.body) {
        setSubject(result.subject);
        setBody(result.body);
      }
      setMessage(result);
    });
  };

  const handleGenerateAI = () => {
    if (!aiPrompt.trim()) {
      setMessage({ success: false, message: "Lütfen yapay zeka için bir istek yazın." });
      return;
    }

    startGenerate(async () => {
      const formData = new FormData();
      formData.append("prompt", aiPrompt);
      formData.append("tone", tone);
      selectedTopics.forEach((topic) => formData.append("topics", topic));
      const result = await generateTemplateWithAI(formData);
      if (result.subject && result.body) {
        setSubject(result.subject);
        setBody(result.body);
      }
      setMessage(result);
    });
  };

  return (
    <section className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <header style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Yapay zeka ile e-posta taslağı</h2>
        <p style={{ margin: 0, color: "var(--text-muted)" }}>
          İstediğiniz içeriği tarif edin; seçilen tona göre konu ve gövde otomatik oluşturulsun. Taslak üzerinde kaydetmeden
          önce dilediğiniz değişiklikleri yapabilirsiniz.
        </p>
      </header>

      <section
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          padding: "1rem",
          borderRadius: "10px",
          border: "1px solid var(--border)",
          background: "rgba(20, 80, 163, 0.04)"
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontWeight: 600 }}>
            <input
              type="radio"
              name="tone"
              value="formal"
              checked={tone === "formal"}
              onChange={() => setTone("formal")}
            />
            Resmi
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontWeight: 600 }}>
            <input
              type="radio"
              name="tone"
              value="friendly"
              checked={tone === "friendly"}
              onChange={() => setTone("friendly")}
            />
            Samimi
          </label>
        </div>

        <textarea
          value={aiPrompt}
          onChange={(event) => setAiPrompt(event.target.value)}
          rows={5}
          placeholder="Örn: Bu ay fon getirilerini özetle, müşterilere teşekkür et ve gelecek planına değin."
          style={{
            padding: "0.75rem",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            fontFamily: "inherit",
            resize: "vertical",
            minHeight: "160px"
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <strong>Finans başlıklarını ekle</strong>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            {AI_MARKET_TOPICS.map((topic) => (
              <label key={topic.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.95rem" }}>
                <input
                  type="checkbox"
                  checked={selectedTopics.includes(topic.id)}
                  onChange={() => toggleTopic(topic.id)}
                />
                <span>
                  <strong>{topic.label}</strong>
                  <span style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)" }}>{topic.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerateAI}
          disabled={isGenerating}
          style={{
            alignSelf: "flex-start",
            padding: "0.7rem 1.1rem",
            borderRadius: "8px",
            border: "none",
            background: "var(--accent)",
            color: "#ffffff",
            fontWeight: 600,
            opacity: isGenerating ? 0.7 : 1
          }}
        >
          {isGenerating ? "Taslak hazırlanıyor..." : "Taslağı oluştur"}
        </button>

        <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Not: Yapay zeka kullanmak için sunucuda `OPENAI_API_KEY` ortam değişkeni tanımlı olmalıdır.
        </span>
      </section>

      {message && (
        <div
          style={{
            padding: "0.6rem 0.75rem",
            borderRadius: "8px",
            background: message.success ? "rgba(4, 120, 87, 0.12)" : "rgba(228, 70, 70, 0.12)",
            color: message.success ? "#065f46" : "#a40000",
            fontWeight: 600
          }}
        >
          {message.message}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>Konu</span>
        <input
          type="text"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="E-posta konusu"
          style={{
            padding: "0.7rem 0.75rem",
            borderRadius: "8px",
            border: "1px solid var(--border)"
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>Gövde</span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={12}
          placeholder="Gmail tarzı e-posta metni..."
          style={{
            padding: "0.75rem",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            fontFamily: "inherit",
            resize: "vertical",
            minHeight: "240px"
          }}
        />
      </div>

  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>Kullanılabilir değişkenler</span>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {placeholders.map((placeholder) => (
            <li key={placeholder.token} style={{ display: "flex", flexDirection: "column" }}>
              <code style={{ fontSize: "0.9rem" }}>{placeholder.token}</code>
              <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{placeholder.description}</span>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          style={{
            padding: "0.75rem 1.25rem",
            borderRadius: "8px",
            border: "none",
            background: "var(--accent)",
            color: "#ffffff",
            fontWeight: 600,
            opacity: isSaving ? 0.7 : 1
          }}
        >
          {isSaving ? "Kaydediliyor..." : "Şablonu kaydet"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={isSaving}
          style={{
            padding: "0.75rem 1.25rem",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "#ffffff",
            color: "var(--text-primary)",
            fontWeight: 600,
            opacity: isSaving ? 0.7 : 1
          }}
        >
          Varsayılanı geri yükle
        </button>
      </div>
    </section>
  );
}
