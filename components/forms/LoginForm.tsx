"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = form.get("email")?.toString() ?? "";
    const password = form.get("password")?.toString() ?? "";

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("Geçersiz bilgiler. Lütfen tekrar deneyin.");
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h1 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Tekrar hoş geldiniz</h1>
      <p style={{ marginTop: 0, color: "var(--text-muted)", marginBottom: "1.5rem" }}>
        Emeklilik müşterilerinizi yönetmek için ajan bilgilerinizle giriş yapın.
      </p>
      <label style={{ display: "block", marginBottom: "0.75rem" }}>
        <span style={{ display: "block", fontWeight: 600, marginBottom: "0.25rem" }}>E-posta</span>
        <input
          name="email"
          type="email"
          required
          placeholder="ajan@şirketiniz.com"
          style={{
            width: "100%",
            padding: "0.75rem",
            borderRadius: "8px",
            border: "1px solid var(--border)"
          }}
        />
      </label>
      <label style={{ display: "block", marginBottom: "1rem" }}>
        <span style={{ display: "block", fontWeight: 600, marginBottom: "0.25rem" }}>Parola</span>
        <input
          name="password"
          type="password"
          required
          placeholder="••••••••"
          style={{
            width: "100%",
            padding: "0.75rem",
            borderRadius: "8px",
            border: "1px solid var(--border)"
          }}
        />
      </label>

      {error && (
        <div
          style={{
            background: "rgba(228, 70, 70, 0.08)",
            color: "#a40000",
            padding: "0.75rem",
            borderRadius: "8px",
            marginBottom: "1rem",
            border: "1px solid rgba(228, 70, 70, 0.2)"
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          width: "100%",
          padding: "0.85rem 1rem",
          background: "var(--accent)",
          color: "#ffffff",
          border: "none",
          borderRadius: "8px",
          fontSize: "1rem",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          opacity: isSubmitting ? 0.7 : 1
        }}
      >
        {isSubmitting ? "Giriş yapılıyor..." : "Giriş yap"}
      </button>

      <p style={{ marginTop: "1.5rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>
        Demo hesap: demo@pensioncrm.test / Password123!
      </p>
    </form>
  );
}
