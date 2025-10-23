"use client";

import { useFormState } from "react-dom";
import { useEffect } from "react";
import type { CSSProperties } from "react";
import type { ActionResult } from "@/app/(protected)/clients/actions";
import { createClient } from "@/app/(protected)/clients/actions";

const initialState: ActionResult = { success: true, message: "" };

interface Props {
  variant?: "card" | "plain";
  showTitle?: boolean;
}

export function NewClientForm({ variant = "card", showTitle = true }: Props) {
  const [state, formAction] = useFormState(createClient, initialState);

  useEffect(() => {
    if (state.success) {
      const form = document.getElementById("new-client-form") as HTMLFormElement | null;
      form?.reset();
    }
  }, [state.success]);

  return (
    <form
      id="new-client-form"
      action={formAction}
      className={variant === "card" ? "card" : undefined}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        padding: variant === "card" ? undefined : "1.25rem",
        borderRadius: variant === "card" ? undefined : "12px",
        border: variant === "card" ? undefined : "1px solid var(--border)",
        background: variant === "card" ? undefined : "#fff",
        boxShadow: variant === "card" ? undefined : "0 1px 2px rgba(15, 23, 42, 0.04)"
      }}
    >
      {showTitle && <h2 style={{ margin: 0 }}>Manuel müşteri ekle</h2>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span>Ad Soyad</span>
          <input name="name" placeholder="Ayşe Yılmaz" required style={inputStyle} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span>E-posta</span>
          <input name="email" type="email" placeholder="ayse@example.com" required style={inputStyle} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span>Telefon</span>
          <input name="phone" placeholder="+90 555 555 55 55" style={inputStyle} />
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span>İlk tasarruf tutarı</span>
          <input name="firstSavings" type="number" min="0" step="0.01" required style={inputStyle} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span>Güncel tasarruf tutarı</span>
          <input name="currentSavings" type="number" min="0" step="0.01" required style={inputStyle} />
        </label>
      </div>
      {state.message && (
        <p
          style={{
            margin: 0,
            padding: "0.5rem 0.75rem",
            borderRadius: "8px",
            background: state.success ? "rgba(20, 80, 163, 0.08)" : "rgba(228, 70, 70, 0.1)",
            color: state.success ? "var(--accent)" : "#a40000"
          }}
        >
          {state.message}
        </p>
      )}
      <button
        type="submit"
        style={{
          alignSelf: "flex-start",
          padding: "0.75rem 1.25rem",
          borderRadius: "8px",
          border: "none",
          background: "var(--accent)",
          color: "#ffffff",
          fontWeight: 600
        }}
      >
        Müşteriyi kaydet
      </button>
    </form>
  );
}

const inputStyle: CSSProperties = {
  padding: "0.65rem",
  borderRadius: "8px",
  border: "1px solid var(--border)"
};
