"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { SendActionResult } from "@/app/(protected)/communications/actions";
import { sendClientDigests } from "@/app/(protected)/communications/actions";

interface ClientSummary {
  id: string;
  name: string;
  email: string;
}

interface Props {
  clients: ClientSummary[];
  defaultSelectedIds: string[];
}

export function ClientDigestSender({ clients, defaultSelectedIds }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultSelectedIds));
  const [message, setMessage] = useState<SendActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const orderedClients = useMemo(
    () =>
      [...clients].sort((a, b) =>
        a.name.localeCompare(b.name, "tr", { sensitivity: "base" })
      ),
    [clients]
  );

  const selectedClients = useMemo(
    () => orderedClients.filter((client) => selected.has(client.id)),
    [orderedClients, selected]
  );

  const toggleSelection = (clientId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelected(new Set());
  };

  const handleSend = () => {
    if (selected.size === 0) {
      setMessage({ success: false, message: "Gönderilecek en az bir müşteri seçin." });
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      for (const id of selected) {
        formData.append("clientIds", id);
      }
      const result = await sendClientDigests(formData);
      setMessage(result);
      if (result.success) {
        router.refresh();
      }
    });
  };

  const removePreselection = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("selected");
    const query = params.toString();
    router.replace(query ? `/communications?${query}` : "/communications", { scroll: false });
  };

  return (
    <section className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <header style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Seçili müşterilere fon özeti gönder</h2>
        <p style={{ margin: 0, color: "var(--text-muted)" }}>
          Tekil müşteriler seçerek kişiye özel tasarruf özetini yollayın. Yapay zeka ile hazırladığınız şablon, her müşteri için
          kendi verileriyle doldurulur.
        </p>
      </header>

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
          {message.failed && message.failed.length > 0 && (
            <span style={{ display: "block", marginTop: "0.25rem", fontSize: "0.85rem" }}>
              Ulaşılamayan adresler: {message.failed.join(", ")}
            </span>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        <strong>Seçilen müşteriler:</strong>
        {selectedClients.length === 0 && <span style={{ color: "var(--text-muted)" }}>Henüz seçim yapılmadı.</span>}
        {selectedClients.map((client) => (
          <span
            key={client.id}
            style={{
              padding: "0.3rem 0.65rem",
              borderRadius: "999px",
              background: "rgba(20, 80, 163, 0.12)",
              color: "var(--accent)",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem"
            }}
          >
            {client.name}
          </span>
        ))}
        {selectedClients.length > 0 && (
          <button
            type="button"
            onClick={clearSelection}
            style={{
              background: "transparent",
              border: "none",
              color: "#b91c1c",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Seçimi temizle
          </button>
        )}
        {searchParams.getAll("selected").length > 0 && (
          <button
            type="button"
            onClick={removePreselection}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--accent)",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Ön seçimi kaldır
          </button>
        )}
      </div>

      <div
        style={{
          maxHeight: "320px",
          overflowY: "auto",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "0.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem"
        }}
      >
        {orderedClients.map((client) => (
          <label
            key={client.id}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
              padding: "0.5rem",
              borderRadius: "8px",
              background: selected.has(client.id) ? "rgba(20, 80, 163, 0.08)" : "transparent",
              border: "1px solid rgba(20, 80, 163, 0.1)"
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                checked={selected.has(client.id)}
                onChange={() => toggleSelection(client.id)}
              />
              <strong>{client.name}</strong>
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: "0.9rem", paddingLeft: "1.6rem" }}>{client.email}</span>
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSend}
        disabled={isPending}
        style={{
          alignSelf: "flex-start",
          padding: "0.75rem 1.25rem",
          borderRadius: "8px",
          border: "none",
          background: "var(--accent)",
          color: "#ffffff",
          fontWeight: 600,
          opacity: isPending ? 0.7 : 1
        }}
      >
        {isPending ? "Gönderiliyor..." : "Fon özetini gönder"}
      </button>
    </section>
  );
}
