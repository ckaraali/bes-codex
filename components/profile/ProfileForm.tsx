"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useFormState } from "react-dom";
import type { ProfileActionResult } from "@/app/(protected)/profile/actions";
import { updateProfileAction } from "@/app/(protected)/profile/actions";

interface ProfileFormProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    bio: string | null;
    photoUrl: string | null;
    photoPath: string | null;
  };
}

const initialState: ProfileActionResult = { success: true, message: "" };

export function ProfileForm({ user }: ProfileFormProps) {
  const [state, formAction] = useFormState(updateProfileAction, initialState);
  const [preview, setPreview] = useState<string | null>(user.photoUrl);

  useEffect(() => {
    if (state.success && state.message) {
      // keep preview as is
    }
  }, [state.success, state.message]);

  const avatarInitials = useMemo(() => {
    const parts = (user.name ?? user.email ?? "").split(" ").filter(Boolean);
    if (parts.length === 0) {
      return "K";
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [user.name, user.email]);

  return (
    <form
      action={formAction}
      style={{
        display: "grid",
        gap: "1.5rem",
        gridTemplateColumns: "minmax(0, 320px) minmax(0, 1fr)",
        alignItems: "start"
      }}
    >
      <section
        className="card"
        style={{
          display: "grid",
          gap: "1.25rem",
          padding: "1.75rem",
          textAlign: "center"
        }}
      >
        <div
          style={{
            width: "132px",
            height: "132px",
            borderRadius: "50%",
            overflow: "hidden",
            margin: "0 auto",
            border: "3px solid rgba(37, 99, 235, 0.2)",
            background: "#eef2ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
            fontWeight: 600,
            color: "#1e293b",
            position: "relative"
          }}
        >
          {preview ? (
            <Image src={preview} alt="Profil fotoğrafı" fill style={{ objectFit: "cover" }} />
          ) : (
            avatarInitials
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label
            htmlFor="avatar"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.6rem 1rem",
              borderRadius: "999px",
              cursor: "pointer",
              color: "#2563eb",
              background: "rgba(37, 99, 235, 0.08)",
              border: "1px dashed rgba(37, 99, 235, 0.4)",
              fontWeight: 600,
              fontSize: "0.9rem"
            }}
          >
            Fotoğraf yükle
          </label>
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                setPreview(user.photoUrl);
                return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                if (typeof reader.result === "string") {
                  setPreview(reader.result);
                }
              };
              reader.readAsDataURL(file);
            }}
          />
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
            JPG veya PNG, maksimum 5MB. Kare görseller önerilir.
          </p>
        </div>
      </section>

      <section
        className="card"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          padding: "1.75rem"
        }}
      >
        <header style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <h2 style={{ margin: 0 }}>İletişim Bilgileri</h2>
          <p style={{ margin: 0, color: "var(--text-muted)" }}>
            Bu bilgiler kontrol paneli ve müşteriye gönderilen içeriklerde kullanılabilir.
          </p>
        </header>

        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <label style={labelStyle}>
            <span>Ad Soyad</span>
            <input defaultValue={user.name ?? ""} name="name" required style={inputStyle} placeholder="Demo Danışman" />
          </label>
          <label style={labelStyle}>
            <span>E-posta</span>
            <input defaultValue={user.email} name="email" type="email" required style={inputStyle} />
          </label>
          <label style={labelStyle}>
            <span>Telefon</span>
            <input defaultValue={user.phone ?? ""} name="phone" style={inputStyle} placeholder="+90 555 555 55 55" />
          </label>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <span>Hakkımda</span>
          <textarea
            name="bio"
            defaultValue={user.bio ?? ""}
            rows={4}
            maxLength={280}
            style={{
              ...inputStyle,
              resize: "vertical"
            }}
            placeholder="Müşterilerime tasarruf hedeflerine ulaşmaları için bire bir destek veriyorum."
          />
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>En fazla 280 karakter.</span>
        </label>

        {state.message && (
          <p
            style={{
              margin: 0,
              padding: "0.65rem 0.85rem",
              borderRadius: "10px",
              background: state.success ? "rgba(37, 99, 235, 0.08)" : "rgba(228, 70, 70, 0.12)",
              color: state.success ? "#1d4ed8" : "#b91c1c",
              fontWeight: 500
            }}
          >
            {state.message}
          </p>
        )}

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <input type="hidden" name="existingAvatar" value={user.photoUrl ?? ""} />
          <input type="hidden" name="existingAvatarPath" value={user.photoPath ?? ""} />
          <button
            type="submit"
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "999px",
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Profilimi güncelle
          </button>
        </div>
      </section>
    </form>
  );
}

const labelStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "0.35rem",
  fontSize: "0.95rem",
  color: "#1e293b"
};

const inputStyle = {
  padding: "0.65rem 0.8rem",
  borderRadius: "10px",
  border: "1px solid var(--border)",
  background: "#ffffff",
  fontSize: "0.95rem"
};
