"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/app/(protected)/clients/actions";
import { sendSavingsDigest } from "@/app/(protected)/clients/actions";

export function SendDigestButton() {
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <h2 style={{ margin: 0 }}>Tasarruf özeti</h2>
      <p style={{ margin: 0, color: "var(--text-muted)" }}>
        Her müşteriye güncel tasarruf özetini e-posta ile gönderin. Göndermeden önce SMTP bilgilerinizi ayarlayın.
      </p>
      {message?.message && (
        <p
          style={{
            margin: 0,
            padding: "0.5rem 0.75rem",
            borderRadius: "8px",
            background: message.success ? "rgba(20, 80, 163, 0.08)" : "rgba(228, 70, 70, 0.1)",
            color: message.success ? "var(--accent)" : "#a40000"
          }}
        >
          {message.message}
        </p>
      )}
      <button
        type="button"
        onClick={() =>
          startTransition(async () => {
            const result = await sendSavingsDigest();
            setMessage(result);
          })
        }
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
        {isPending ? "Gönderiliyor..." : "Tasarruf özeti gönder"}
      </button>
    </div>
  );
}
