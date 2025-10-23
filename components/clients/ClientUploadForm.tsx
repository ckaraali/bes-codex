"use client";
import { useState } from "react";
import { useFormState } from "react-dom";
import type { CSSProperties } from "react";
import type { ActionResult } from "@/app/(protected)/clients/actions";
import { importClients } from "@/app/(protected)/clients/actions";

const initialState: ActionResult = { success: true, message: "" };

interface Props {
  variant?: "card" | "plain";
  showTitle?: boolean;
}

export function ClientUploadForm({ variant = "card", showTitle = true }: Props) {
  const [state, formAction] = useFormState(importClients, initialState);
  const [uploadType, setUploadType] = useState<"BES" | "ES">("BES");

  const sampleHref = uploadType === "ES" ? "/sample-clients-es.csv" : "/sample-clients.csv";
  const sampleLabel = uploadType === "ES" ? "Elementer sigorta müşterileri için örnek CSV" : "BES müşterileri için örnek CSV";

  return (
    <form
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
      {showTitle && <h2 style={{ margin: 0 }}>CSV ile toplu içe aktarma</h2>}
      <p style={{ margin: 0, color: "var(--text-muted)" }}>
        Şablonu kullanarak müşteri kayıtlarını hazırlayın. Mevcut müşteriler e-posta ile eşleşip güncellenir.
      </p>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        <span style={{ fontWeight: 600 }}>Yükleme türü</span>
        <select
          name="uploadType"
          value={uploadType}
          onChange={(event) => setUploadType(event.target.value === "ES" ? "ES" : "BES")}
          style={{
            padding: "0.6rem 0.75rem",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "#fff"
          }}
        >
          <option value="BES">BES (Bireysel Emeklilik)</option>
          <option value="ES">ES (Elementer Sigorta)</option>
        </select>
      </label>
      <input type="file" name="file" accept=".csv" required style={fileInputStyle} />
      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
        Dosya `;` veya `,` ayracı kullanabilir. BES için ilk/güncel tasarruf kolonu gereklidir. Elementer sigorta
        yüklemelerinde poliçe türü ile başlangıç ve bitiş tarihlerini eklediğinizden emin olun.
      </p>
      <a
        href={sampleHref}
        download
        style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}
      >
        {sampleLabel}
      </a>
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
        Yüklemeyi başlat
      </button>
    </form>
  );
}

const fileInputStyle: CSSProperties = {
  padding: "0.5rem 0",
  border: "1px dashed var(--border)",
  borderRadius: "8px",
  paddingLeft: "0.75rem",
  paddingRight: "0.75rem"
};
