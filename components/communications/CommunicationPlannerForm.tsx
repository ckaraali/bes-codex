"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type CSSProperties, type MouseEvent } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { PlanCommunicationResult } from "@/app/(protected)/communications/new/actions";
import { planCommunication } from "@/app/(protected)/communications/new/actions";
import type { TemplateActionResult } from "@/app/(protected)/communications/actions";
import { generateTemplateWithAI } from "@/app/(protected)/communications/actions";
import { sanitizeRichText, sanitizeHtml } from "@/lib/sanitize";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import type { CommunicationReason } from "@/lib/communication-reasons";

interface PlannerClient {
  id: string;
  name: string;
  email?: string | null;
}

interface PlannerChannel {
  id: string;
  label: string;
}

interface Props {
  clients: PlannerClient[];
  reasons: CommunicationReason[];
  channels: PlannerChannel[];
  defaultSubject?: string;
  defaultBody?: string;
  initialClientIds?: string[];
}

const initialState: PlanCommunicationResult = {
  success: false,
  message: ""
};

export function CommunicationPlannerForm({
  clients,
  reasons,
  channels,
  defaultSubject = "",
  defaultBody = "",
  initialClientIds
}: Props) {
  const [state, formAction] = useFormState(planCommunication, initialState);

  const defaultSelectedClients = useMemo(() => {
    if (!initialClientIds || initialClientIds.length === 0) {
      return clients.map((client) => client.id);
    }

    const selectionSet = new Set(initialClientIds);
    const orderedSelection = clients
      .filter((client) => selectionSet.has(client.id))
      .map((client) => client.id);

    return orderedSelection.length > 0 ? orderedSelection : clients.map((client) => client.id);
  }, [clients, initialClientIds]);

  const [selectedClients, setSelectedClients] = useState<string[]>(defaultSelectedClients);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(() => ensureRichTextValue(defaultBody));
  const [scheduleDate, setScheduleDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });
  const [scheduleTime, setScheduleTime] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(11, 16);
  });
  const [sendNow, setSendNow] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiTone, setAiTone] = useState<"formal" | "friendly">("formal");
  const [aiResult, setAiResult] = useState<TemplateActionResult | null>(null);
  const [isGenerating, startGenerate] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const selectedChannels = channels.length > 0 ? [channels[0].id] : [];

  useEffect(() => {
    if (state.success) {
      setSelectedClients(defaultSelectedClients);
      setSelectedReasons([]);
      setSubject(defaultSubject);
      setBody(ensureRichTextValue(defaultBody));
      setScheduleDate(new Date().toISOString().slice(0, 10));
      setScheduleTime(new Date().toISOString().slice(11, 16));
      setAiPrompt("");
    }
    if (state.message) {
      setSendNow(false);
    }
  }, [state.success, state.message, clients, defaultSubject, defaultBody, defaultSelectedClients]);

  useEffect(() => {
    setSelectedClients((prev) => {
      const availableIds = new Set(clients.map((client) => client.id));
      const filteredPrev = prev.filter((id) => availableIds.has(id));

      if (filteredPrev.length !== prev.length) {
        return filteredPrev;
      }

      if (filteredPrev.length === 0 && defaultSelectedClients.length > 0) {
        return defaultSelectedClients;
      }

      return prev;
    });
  }, [clients, defaultSelectedClients]);

  const toggleReason = (id: string) => {
    setSelectedReasons((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleClient = (id: string) => {
    setSelectedClients((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleSelectAllClients = () => {
    setSelectedClients(clients.map((client) => client.id));
  };

  const handleClearClients = () => {
    setSelectedClients([]);
  };

  const handleGenerateAI = () => {
    const trimmedPrompt = aiPrompt.trim();
    if (!trimmedPrompt && selectedReasons.length === 0) {
      setAiResult({ success: false, message: "İçerik oluşturmak için bir istek yazın veya iletişim sebebi seçin." });
      return;
    }

    const reasonSummary =
      selectedReasons.length > 0
        ? `\n\nİletişim sebepleri: ${selectedReasons
            .map((reasonId) => reasons.find((item) => item.id === reasonId)?.label ?? reasonId)
            .join(", ")}`
        : "";
    const channelSummary =
      selectedChannels.length > 0
        ? `\nKanallar: ${selectedChannels
            .map((channelId) => channels.find((item) => item.id === channelId)?.label ?? channelId)
            .join(", ")}`
        : "";
    const clientSummary = selectedClients.length > 0 ? `\nHedef müşteri sayısı: ${selectedClients.length}` : "";

    startGenerate(async () => {
      const formData = new FormData();
      formData.append(
        "prompt",
        `${trimmedPrompt || "Aşağıdaki iletişim bilgilerine göre etkili bir mesaj hazırla:"}${reasonSummary}${channelSummary}${clientSummary}`
      );
      formData.append("tone", aiTone);
      const result = await generateTemplateWithAI(formData);
      if (result.subject) {
        setSubject(result.subject);
      }
      if (result.body) {
        const html = textToHtml(result.body);
        setBody(ensureRichTextValue(html));
      }
      setAiResult(result);
    });
  };

  const reasonError = state.fieldErrors?.reasons;
  const subjectError = state.fieldErrors?.subject;
  const bodyError = state.fieldErrors?.body;
  const dateError = state.fieldErrors?.scheduleDate || state.fieldErrors?.scheduleTime;
  const disableSubmission = channels.length === 0 || clients.length === 0;
  const allClientsSelected = clients.length > 0 && selectedClients.length === clients.length;

  const handlePlanSubmit = () => {
    setSendNow(false);
  };

  const handleSendNow = () => {
    if (disableSubmission || selectedClients.length === 0) {
      return;
    }
    const now = new Date();
    setSendNow(true);
    setScheduleDate(now.toISOString().slice(0, 10));
    setScheduleTime(now.toISOString().slice(11, 16));
    setTimeout(() => {
      formRef.current?.requestSubmit();
    }, 0);
  };

  return (
    <form
      ref={formRef}
      action={formAction}
      style={{
        display: "grid",
        gap: "1.25rem"
      }}
    >
      <section
        style={{
          display: "grid",
          gap: "1rem",
          padding: "1.25rem",
          borderRadius: "16px",
          border: "1px solid rgba(148, 163, 184, 0.35)",
          background: "#ffffff",
          boxShadow: "0 10px 26px rgba(15, 23, 42, 0.05)"
        }}
      >
        <header style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.65rem" }}>İletişim Ekle</h2>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.95rem" }}>
            İletişime dahil edeceğiniz müşterileri seçin, ardından mesajı tasarlayıp planlayın.
          </p>
        </header>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.75rem",
            flexWrap: "wrap"
          }}
        >
          <div style={{ display: "grid", gap: "0.25rem" }}>
            <strong style={{ fontSize: "1rem" }}>Müşteri seçimi</strong>
            <span style={{ fontSize: "0.92rem", color: "var(--text-muted)" }}>
              {selectedClients.length > 0
                ? `${selectedClients.length} müşteri seçildi. Kanal: ${channels[0]?.label ?? "Tanımlı kanal yok"}.`
                : "Henüz müşteri seçmediniz. En az bir müşteri ile iletişim planlayın."}
            </span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={handleSelectAllClients}
              style={{
                padding: "0.55rem 0.9rem",
                borderRadius: "8px",
                border: "1px solid rgba(67, 97, 238, 0.35)",
                background: allClientsSelected ? "rgba(67, 97, 238, 0.15)" : "rgba(67, 97, 238, 0.08)",
                color: "var(--color-primary)",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Tümünü seç
            </button>
            <button
              type="button"
              onClick={handleClearClients}
              style={{
                padding: "0.55rem 0.9rem",
                borderRadius: "8px",
                border: "1px solid rgba(67, 97, 238, 0.35)",
                background: "rgba(67, 97, 238, 0.05)",
                color: "var(--color-primary)",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Temizle
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: "0.6rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
          }}
        >
          {clients.length > 0 ? (
            clients.map((client) => {
              const isSelected = selectedClients.includes(client.id);
              return (
                <label
                  key={client.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.55rem",
                    padding: "0.6rem 0.75rem",
                    borderRadius: "10px",
                    border: `1px solid ${isSelected ? "rgba(67, 97, 238, 0.7)" : "rgba(148, 163, 184, 0.35)"}`,
                    background: isSelected ? "rgba(67, 97, 238, 0.12)" : "#fff",
                    cursor: "pointer",
                    transition: "background 0.2s ease, border-color 0.2s ease",
                    fontWeight: 600,
                    fontSize: "0.92rem"
                  }}
                  title={client.email ?? undefined}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleClient(client.id)}
                    style={{ width: "16px", height: "16px" }}
                  />
                  <span>{client.name}</span>
                </label>
              );
            })
          ) : (
            <span style={{ color: "#b91c1c", fontWeight: 600 }}>
              İletişim planlamak için önce müşteri ekleyin.
            </span>
          )}
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gap: "1.2rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))"
        }}
      >
        <div
          style={{
            display: "grid",
            gap: "1rem",
            padding: "1.25rem",
            borderRadius: "16px",
            border: "1px solid rgba(148, 163, 184, 0.35)",
            background: "#ffffff",
            boxShadow: "0 10px 26px rgba(15, 23, 42, 0.05)"
          }}
        >
          <section
            style={{
              display: "grid",
              gap: "0.65rem"
            }}
          >
            <header style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              <strong style={{ fontSize: "1.05rem" }}>Yapay zeka promptu</strong>
              <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Mesajın tonunu ve içeriğini tarif edin, yapay zeka taslağı hazırlasın.
              </span>
            </header>

            <textarea
              value={aiPrompt}
              onChange={(event) => setAiPrompt(event.target.value)}
              rows={6}
              placeholder="Örn: BES poliçe güncellemesi hakkında samimi bir bilgilendirme yaz."
              style={{
                padding: "0.8rem",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                resize: "vertical"
              }}
            />

            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              <TonePill
                label="Resmi"
                checked={aiTone === "formal"}
                onChange={() => setAiTone("formal")}
              />
              <TonePill
                label="Samimi"
                checked={aiTone === "friendly"}
                onChange={() => setAiTone("friendly")}
              />
            </div>

            <button
              type="button"
              onClick={handleGenerateAI}
              disabled={isGenerating}
              style={{
                alignSelf: "flex-start",
                padding: "0.65rem 1.1rem",
                borderRadius: "10px",
                border: "1px solid rgba(67, 97, 238, 0.35)",
                background: "var(--color-primary)",
                color: "#fff",
                fontWeight: 600,
                cursor: isGenerating ? "wait" : "pointer",
                opacity: isGenerating ? 0.75 : 1
              }}
            >
              {isGenerating ? "Taslak hazırlanıyor..." : "Taslak oluştur"}
            </button>

            {aiResult && (
              <span
                style={{
                  color: aiResult.success ? "#047857" : "#b91c1c",
                  fontSize: "0.9rem",
                  fontWeight: 600
                }}
              >
                {aiResult.message}
              </span>
            )}
          </section>

          <section
            style={{
              display: "grid",
              gap: "0.55rem",
              padding: "0.75rem 0.85rem",
              borderRadius: "12px",
              border: "1px dashed rgba(148, 163, 184, 0.4)",
              background: "rgba(248, 250, 252, 0.7)"
            }}
          >
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <strong style={{ fontSize: "0.95rem" }}>İletişim Sebebi *</strong>
              <div
                style={{
                  display: "grid",
                  gap: "0.4rem",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
                }}
              >
                {reasons.map((reason) => {
                  const isSelected = selectedReasons.includes(reason.id);
                  return (
                    <label
                      key={reason.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        padding: "0.38rem 0.5rem",
                        borderRadius: "8px",
                        border: `1px solid ${isSelected ? "rgba(67, 97, 238, 0.7)" : "rgba(148, 163, 184, 0.35)"}`,
                        background: isSelected ? "rgba(67, 97, 238, 0.12)" : "#fff",
                        fontWeight: 600,
                        fontSize: "0.88rem",
                        cursor: "pointer",
                        transition: "background 0.2s ease, border-color 0.2s ease"
                      }}
                      title={reason.description}
                    >
                      <input
                        type="checkbox"
                        name="reasons"
                        value={reason.id}
                        checked={isSelected}
                        onChange={() => toggleReason(reason.id)}
                        style={{ width: "16px", height: "16px" }}
                      />
                      <span>{reason.label}</span>
                    </label>
                  );
                })}
              </div>
              {reasonError && (
                <span style={{ color: "#b91c1c", fontSize: "0.82rem", fontWeight: 600 }}>{reasonError}</span>
              )}
            </div>
          </section>
        </div>

        <div
          style={{
            display: "grid",
            gap: "0.85rem",
            padding: "1.25rem",
            borderRadius: "16px",
            border: "1px solid rgba(148, 163, 184, 0.35)",
            background: "#ffffff",
            boxShadow: "0 10px 26px rgba(15, 23, 42, 0.05)"
          }}
        >
          <section style={{ display: "grid", gap: "0.55rem" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              <span style={{ fontWeight: 600 }}>Konu *</span>
              <input
                name="subject"
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Örn: BES sözleşmeniz için yeni bilgi"
                style={{
                  padding: "0.75rem",
                  borderRadius: "10px",
                  border: "1px solid var(--border)"
                }}
              />
            </label>
            {subjectError && <span style={{ color: "#b91c1c", fontSize: "0.85rem", fontWeight: 600 }}>{subjectError}</span>}

            <input type="hidden" name="body" value={body} />
            <input type="hidden" name="scheduleDate" value={scheduleDate} />
            <input type="hidden" name="scheduleTime" value={scheduleTime} />
            <input type="hidden" name="sendNow" value={sendNow ? "true" : "false"} />
            {selectedClients.map((clientId) => (
              <input key={clientId} type="hidden" name="clientIds" value={clientId} />
            ))}
            {selectedChannels.map((channelId) => (
              <input key={channelId} type="hidden" name="channels" value={channelId} />
            ))}

            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              <span style={{ fontWeight: 600 }}>İletişim İçeriği *</span>
              <RichTextEditor
                value={body}
                onChange={(value) => setBody(ensureRichTextValue(value))}
                placeholder="Mesajınızı yazın, önemli yerleri vurgulayın."
              />
            </div>
            {bodyError && <span style={{ color: "#b91c1c", fontSize: "0.85rem", fontWeight: 600 }}>{bodyError}</span>}
          </section>

          <section style={{ display: "grid", gap: "0.55rem" }}>
            <strong style={{ fontSize: "1rem" }}>Gönderim Zamanı</strong>
            <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
              Planlayacağınız tarih ve saatleri bu alandan seçin. Hemen göndermek için alt kısımdaki butonu kullanın.
            </span>
            <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>Tarih</span>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(event) => setScheduleDate(event.target.value)}
                  style={{
                    padding: "0.75rem",
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                    minWidth: "160px"
                  }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>Saat</span>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(event) => setScheduleTime(event.target.value)}
                  style={{
                    padding: "0.75rem",
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                    minWidth: "120px"
                  }}
                />
              </label>
            </div>
            {!sendNow && dateError && (
              <span style={{ color: "#b91c1c", fontSize: "0.85rem", fontWeight: 600 }}>{dateError}</span>
            )}

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <FormActionButton
                type="submit"
                onClick={handlePlanSubmit}
                disabled={disableSubmission || selectedClients.length === 0}
                pendingLabel="Plan kaydediliyor..."
                label="Planı Kaydet"
                variant="secondary"
              />
              <FormActionButton
                type="button"
                onClick={handleSendNow}
                disabled={disableSubmission || selectedClients.length === 0}
                pendingLabel="Gönderiliyor..."
                label="Hemen Gönder"
                variant="primary"
              />
            </div>

            {state.message && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "10px",
                  border: state.success ? "1px solid rgba(22, 163, 74, 0.4)" : "1px solid rgba(239, 68, 68, 0.4)",
                  background: state.success ? "rgba(16, 185, 129, 0.08)" : "rgba(248, 113, 113, 0.08)",
                  color: state.success ? "#065f46" : "#b91c1c",
                  fontWeight: 600
                }}
              >
                {state.message}
                {state.success && state.scheduledAt && (
                  <span style={{ display: "block", fontSize: "0.9rem", marginTop: "0.35rem" }}>
                    Planlanan teslim: {new Date(state.scheduledAt).toLocaleString("tr-TR")}
                  </span>
                )}
              </div>
            )}
          </section>
        </div>
      </section>
    </form>
  );
}

interface FormActionButtonProps {
  type: "submit" | "button";
  label: string;
  pendingLabel: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  variant: "primary" | "secondary";
}

function FormActionButton({ type, label, pendingLabel, onClick, disabled = false, variant }: FormActionButtonProps) {
  const { pending } = useFormStatus();
  const isPending = pending;
  const isDisabled = disabled || pending;

  const baseStyle: CSSProperties = {
    padding: "0.75rem 1.4rem",
    borderRadius: "10px",
    fontWeight: 700,
    cursor: isDisabled ? "not-allowed" : "pointer",
    transition: "opacity 0.2s ease, transform 0.2s ease",
    opacity: isDisabled ? 0.6 : 1
  };

  const variantStyle: CSSProperties =
    variant === "primary"
      ? {
          background: "var(--color-primary)",
          color: "#ffffff",
          border: "1px solid rgba(67, 97, 238, 0.45)"
        }
      : {
          background: "#ffffff",
          color: "var(--color-primary)",
          border: "1px solid rgba(67, 97, 238, 0.35)"
        };

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={(event) => {
        if (isDisabled) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      style={{ ...baseStyle, ...variantStyle }}
    >
      {isPending ? pendingLabel : label}
    </button>
  );
}

function TonePill({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        padding: "0.45rem 0.85rem",
        borderRadius: "999px",
        border: checked ? "1px solid rgba(255, 107, 0, 0.8)" : "1px solid rgba(148, 163, 184, 0.6)",
        background: checked ? "rgba(255, 107, 0, 0.12)" : "#fff",
        cursor: "pointer",
        fontWeight: 600,
        fontSize: "0.9rem"
      }}
    >
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        style={{ width: "16px", height: "16px" }}
      />
      {label}
    </label>
  );
}

function ensureRichTextValue(html?: string | null): string {
  return sanitizeRichText(html ?? "") || "<p></p>";
}

function textToHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "<p></p>";
  }

  const segments = trimmed.split(/\n{2,}/).map((segment) => segment.trim()).filter(Boolean);
  const blocks = (segments.length > 0 ? segments : [trimmed]).map((segment) => {
    const escaped = sanitizeHtml(segment).replace(/\n/g, "<br />");
    return `<p>${escaped}</p>`;
  });

  return blocks.join("");
}
