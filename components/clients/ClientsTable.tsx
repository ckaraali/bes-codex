"use client";

import { useMemo, useState, useTransition } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { deleteClient, restoreClient, type ActionResult } from "@/app/(protected)/clients/actions";
import { formatCurrency } from "@/lib/format";

interface ClientRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  firstSavings: number;
  currentSavings: number;
  createdAt: string;
  updatedAt: string;
  birthDate: string | null;
  clientType: string | null;
  policyType: string | null;
  policyStartDate: string | null;
  policyEndDate: string | null;
}

type ClientTableRow = ClientRow & {
  growth: number | null;
  hasBesTrack: boolean;
  hasEsTrack: boolean;
};

interface Props {
  clients: ClientRow[];
}

type SortKey = "name" | "currentSavings" | "growth" | "createdAt";

export function ClientsTable({ clients }: Props) {
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [lastDeleted, setLastDeleted] = useState<{ id: string; name: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const rows = useMemo<ClientTableRow[]>(
    () =>
      clients.map((client) => {
        const growth =
          client.firstSavings === 0
            ? null
            : ((client.currentSavings - client.firstSavings) / client.firstSavings) * 100;

        const normalisedType = client.clientType?.toUpperCase?.() ?? "";
        const hasBesTrack =
          normalisedType.includes("BES") ||
          client.firstSavings > 0 ||
          client.currentSavings > 0 ||
          Boolean(client.birthDate);
        const hasEsTrack =
          normalisedType.includes("ES") ||
          Boolean(client.policyType ?? client.policyStartDate ?? client.policyEndDate);

        return {
          ...client,
          growth,
          hasBesTrack,
          hasEsTrack
        };
      }),
    [clients]
  );

  const filtered = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    let result = rows;
    if (lowered) {
      result = result.filter(
        (client) =>
          client.name.toLowerCase().includes(lowered) || 
          (client.email && client.email.toLowerCase().includes(lowered))
      );
    }

    return [...result].sort((a, b) => compareClients(a, b, sortKey, sortDirection));
  }, [rows, query, sortKey, sortDirection]);

  const toggleSort = (key: SortKey) => {
    const defaultDescKeys: SortKey[] = ["currentSavings", "growth", "createdAt"];
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection(defaultDescKeys.includes(key) ? "desc" : "asc");
  };

  async function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteClient(id);
      setMessage(result);
      if (result.success) {
        const client = clients.find((item) => item.id === id);
        setLastDeleted(client ? { id, name: client.name } : { id, name: "" });
      }
    });
  }

  async function handleRestore(id: string) {
    startTransition(async () => {
      const result = await restoreClient(id);
      setMessage(result);
      if (result.success) {
        setLastDeleted(null);
      }
    });
  }

  return (
    <div className="card card-stack">
      <div className="card-header">
        <h2 className="card-header__title">Müşteri listesi</h2>
      </div>
      <div className="card-toolbar">
        <div className="card-toolbar__row">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="İsme veya e-postaya göre ara"
            className="input-search"
            aria-label="Müşteri ara"
          />
          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            {filtered.length} müşteri
          </span>
        </div>
      </div>
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
      {lastDeleted && (
        <div
          style={{
            margin: 0,
            padding: "0.5rem 0.75rem",
            borderRadius: "8px",
            background: "rgba(4, 120, 87, 0.1)",
            color: "#065f46",
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
            flexWrap: "wrap"
          }}
        >
          <span>{lastDeleted.name ? `${lastDeleted.name} silindi.` : "Müşteri silindi."}</span>
          <button
            type="button"
            onClick={() => handleRestore(lastDeleted.id)}
            disabled={isPending}
            style={{
              background: "transparent",
              border: "none",
              color: "#047857",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Geri al
          </button>
        </div>
      )}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <SortHeader label="Ad Soyad" active={sortKey === "name"} direction={sortDirection} onClick={() => toggleSort("name")} />
              <th style={thStyle}>BES (Güncel tasarruf)</th>
              <th style={thStyle}>ES</th>
              <SortHeader
                label="Güncel tasarruf"
                active={sortKey === "currentSavings"}
                direction={sortDirection}
                onClick={() => toggleSort("currentSavings")}
              />
              <SortHeader
                label="Büyüme"
                active={sortKey === "growth"}
                direction={sortDirection}
                onClick={() => toggleSort("growth")}
              />
              <SortHeader
                label="Eklenme"
                active={sortKey === "createdAt"}
                direction={sortDirection}
                onClick={() => toggleSort("createdAt")}
              />
              <th style={thStyle}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-muted)" }}>
                  Henüz müşteri yok. CSV içe aktarın veya manuel ekleyin.
                </td>
              </tr>
            )}
            {filtered.map((client) => (
              <tr key={client.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={tdStyle} data-label="Ad Soyad">
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <Link
                      href={`/clients/${client.id}`}
                      style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}
                    >
                      {client.name}
                    </Link>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      Son güncelleme {new Date(client.updatedAt).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                </td>
                <td style={tdStyle} data-label="BES">
                  {client.hasBesTrack ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <CheckBadge tone="bes" />
                      <span style={{ fontWeight: 600 }}>{formatCurrency(client.currentSavings)}</span>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td style={tdStyle} data-label="ES">
                  {client.hasEsTrack ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <CheckBadge tone="es" />
                      <span style={{ fontWeight: 600 }}>{client.policyType || "ES"}</span>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td style={tdStyle} data-label="Güncel tasarruf">
                  {formatCurrency(client.currentSavings)}
                </td>
                <td style={tdStyle} data-label="Büyüme">
                  {client.growth === null ? "—" : `${client.growth > 0 ? "+" : ""}${client.growth.toFixed(1)}%`}
                </td>
                <td style={tdStyle} data-label="Eklenme">
                  {new Date(client.createdAt).toLocaleDateString("tr-TR")}
                </td>
                <td style={tdStyle} data-label="İşlemler">
                  <div style={actionGroupStyle}>
                    <Link href={`/clients/${client.id}`} style={actionLinkStyle}>
                      Detay
                    </Link>
                    <Link href={`/clients/${client.id}#edit-client`} style={actionLinkStyle}>
                      Düzenle
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(client.id)}
                      disabled={isPending}
                      style={{ ...actionLinkStyle, background: "rgba(220, 38, 38, 0.12)", color: "#b91c1c", borderColor: "rgba(220,38,38,0.3)" }}
                    >
                      Sil
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "0.75rem",
  background: "rgba(20, 80, 163, 0.05)",
  fontWeight: 600,
  fontSize: "0.9rem"
};

const tdStyle: CSSProperties = {
  padding: "0.75rem",
  verticalAlign: "top"
};

const actionLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0.45rem 0.85rem",
  borderRadius: "8px",
  border: "1px solid rgba(67, 97, 238, 0.25)",
  background: "rgba(67, 97, 238, 0.08)",
  color: "var(--color-primary)",
  fontWeight: 600,
  textDecoration: "none",
  cursor: "pointer"
};

const actionGroupStyle: CSSProperties = {
  display: "flex",
  gap: "0.35rem",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "flex-end"
};

function compareClients(a: ClientTableRow, b: ClientTableRow, key: SortKey, direction: "asc" | "desc") {
  const multiplier = direction === "asc" ? 1 : -1;

  const getValue = (client: typeof a) => {
    switch (key) {
      case "currentSavings":
        return client.currentSavings;
      case "growth":
        if (client.growth == null) {
          return direction === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
        }
        return client.growth;
      case "createdAt":
        return new Date(client.createdAt).getTime();
      case "name":
      default:
        return client.name.toLowerCase();
    }
  };

  const valueA = getValue(a);
  const valueB = getValue(b);

  if (valueA < valueB) return -1 * multiplier;
  if (valueA > valueB) return 1 * multiplier;
  return 0;
}

function SortHeader({
  label,
  active,
  direction,
  onClick
}: {
  label: string;
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
}) {
  const ariaSort = active ? (direction === "asc" ? "ascending" : "descending") : "none";
  return (
    <th style={thStyle} aria-sort={ariaSort}>
      <button
        type="button"
        onClick={onClick}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem",
          background: "transparent",
          border: "none",
          padding: 0,
          margin: 0,
          font: "inherit",
          cursor: "pointer",
          color: active ? "var(--accent)" : "#1f2937"
        }}
      >
        {label}
        {active && (
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              color: "inherit",
              fontSize: "0.85rem"
            }}
          >
            {direction === "asc" ? "^" : "v"}
          </span>
        )}
      </button>
    </th>
  );
}

function CheckBadge({ tone }: { tone: "bes" | "es" }) {
  const palette: Record<"bes" | "es", { bg: string; color: string }> = {
    bes: { bg: "rgba(20, 80, 163, 0.12)", color: "var(--accent)" },
    es: { bg: "rgba(4, 120, 87, 0.12)", color: "#047857" }
  } as const;

  const { bg, color } = palette[tone];

  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "1.75rem",
        height: "1.75rem",
        borderRadius: "50%",
        background: bg,
        color,
        fontWeight: 700
      }}
    >
      ✓
    </span>
  );
}
