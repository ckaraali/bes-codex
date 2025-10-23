"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/app/(protected)/clients/actions";
import { deleteAllClients } from "@/app/(protected)/clients/actions";

export function DeleteAllClientsButton() {
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        borderColor: "rgba(220, 38, 38, 0.4)",
        background: "rgba(220, 38, 38, 0.05)"
      }}
    >
      <h2 style={{ margin: 0, color: "#991b1b" }}>Tüm müşterileri sil</h2>
      <p style={{ margin: 0, color: "#991b1b", fontSize: "0.95rem" }}>
        Bu işlem tüm müşterileri ve tasarruf geçmişlerini kalıcı olarak siler. Geri alınamaz.
      </p>
      {message?.message && (
        <p
          style={{
            margin: 0,
            padding: "0.5rem 0.75rem",
            borderRadius: "8px",
            background: message.success ? "rgba(20, 80, 163, 0.08)" : "rgba(228, 70, 70, 0.15)",
            color: message.success ? "var(--accent)" : "#7f1d1d"
          }}
        >
          {message.message}
        </p>
      )}
      <button
        type="button"
        onClick={() =>
          startTransition(async () => {
            const confirmed = window.confirm(
              "Tüm müşterileri ve ilgili verileri silmek istediğinize emin misiniz?"
            );
            if (!confirmed) {
              return;
            }
            const result = await deleteAllClients();
            setMessage(result);
          })
        }
        disabled={isPending}
        style={{
          alignSelf: "flex-start",
          padding: "0.75rem 1.25rem",
          borderRadius: "8px",
          border: "1px solid rgba(220, 38, 38, 0.6)",
          background: "#dc2626",
          color: "#ffffff",
          fontWeight: 600,
          opacity: isPending ? 0.7 : 1
        }}
      >
        {isPending ? "Siliniyor..." : "Tüm müşterileri sil"}
      </button>
    </div>
  );
}
