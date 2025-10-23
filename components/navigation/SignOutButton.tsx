"use client";

import { signOut } from "next-auth/react";

interface SignOutButtonProps {
  condensed?: boolean;
}

export function SignOutButton({ condensed = false }: SignOutButtonProps) {
  if (condensed) {
    return (
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        title="Çıkış yap"
        style={{
          width: "42px",
          height: "42px",
          borderRadius: "14px",
          border: "1px solid rgba(203, 213, 225, 0.35)",
          background: "rgba(22, 43, 101, 0.9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#e2e8f0",
          cursor: "pointer"
        }}
      >
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <path d="M12 3v9" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
          <path
            d="M7.5 6.1A7.5 7.5 0 1 0 16 6"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      style={{
        width: "100%",
        backgroundColor: "var(--color-primary-light)",
        color: "#f8fafc",
        border: "1px solid rgba(67, 97, 238, 0.4)",
        borderRadius: "12px",
        padding: "0.75rem 1rem",
        fontWeight: 600,
        cursor: "pointer"
      }}
    >
      Çıkış yap
    </button>
  );
}
