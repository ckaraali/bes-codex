"use client";

import { useState, type ReactNode } from "react";

interface Props {
  hasBes: boolean;
  hasEs: boolean;
  besContent: ReactNode;
  esContent: ReactNode;
}

type TabKey = "BES" | "ES";

export function InsuranceTabs({ hasBes, hasEs, besContent, esContent }: Props) {
  const initialTab: TabKey = hasBes ? "BES" : "ES";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  const tabs: Array<{ key: TabKey; label: string; enabled: boolean }> = [
    { key: "BES", label: "BES", enabled: hasBes },
    { key: "ES", label: "ES", enabled: hasEs }
  ];

  if (!hasBes && !hasEs) {
    return null;
  }

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        background: "#ffffff",
        borderRadius: "14px",
        border: "1px solid var(--border)",
        padding: "1.25rem",
        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)"
      }}
    >
      <header
        style={{
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap"
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const isDisabled = !tab.enabled;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                if (!isDisabled) {
                  setActiveTab(tab.key);
                }
              }}
              disabled={isDisabled}
              style={{
                padding: "0.55rem 1.25rem",
                borderRadius: "999px",
                border: "1px solid",
                borderColor: isActive ? "rgba(67, 97, 238, 0.3)" : "rgba(148, 163, 184, 0.45)",
                background: isActive ? "rgba(67, 97, 238, 0.12)" : "transparent",
                color: isDisabled ? "rgba(148, 163, 184, 0.7)" : isActive ? "var(--accent)" : "var(--text-primary)",
                fontWeight: 600,
                cursor: isDisabled ? "not-allowed" : "pointer",
                transition: "all 0.2s ease"
              }}
              aria-pressed={isActive}
            >
              {tab.label}
            </button>
          );
        })}
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {activeTab === "BES" ? besContent : esContent}
      </div>
    </section>
  );
}

