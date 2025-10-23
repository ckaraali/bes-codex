"use client";

import { useMemo, useState } from "react";

interface ClientInfo {
  id: string;
  name: string;
  email?: string;
}

export interface PlannedRecord {
  id: string;
  campaignName: string;
  recipients: number;
  channels: string[];
  reason: string;
  scheduledAt: string;
  status: "pending" | "scheduled" | "draft";
  bodyPreview: string;
}

export interface SentRecord {
  id: string;
  campaignName: string;
  recipients: number;
  channels: string[];
  reason: string;
  sentAt: string;
  bodyPreview: string;
}

interface Props {
  clients: ClientInfo[];
  plannedRecords: PlannedRecord[];
  sentRecords: SentRecord[];
}

type TabKey = "planned" | "sent";

export function CommunicationPlanTabs({ clients, plannedRecords, sentRecords }: Props) {
  const [tab, setTab] = useState<TabKey>("planned");
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedChannel, setSelectedChannel] = useState<string>("all");

  const filteredPlanned = useMemo(() => {
    return filterRecords(plannedRecords, search, selectedClient, selectedChannel);
  }, [plannedRecords, search, selectedClient, selectedChannel]);

  const filteredSent = useMemo(() => {
    return filterRecords(sentRecords, search, selectedClient, selectedChannel);
  }, [sentRecords, search, selectedClient, selectedChannel]);

  const clientOptions = [{ id: "all", name: "Tümü" }, ...clients];
  const channelOptions = [
    { id: "all", label: "Tümü" },
    { id: "email", label: "E-posta" },
    { id: "sms", label: "SMS" },
    { id: "whatsapp", label: "WhatsApp" }
  ];

  const records = tab === "planned" ? filteredPlanned : filteredSent;
  const showEmpty = records.length === 0;

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        background: "#ffffff",
        borderRadius: "16px",
        border: "1px solid var(--border)",
        boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
        padding: "1.5rem"
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <TabButton label="Planlanan Mesajlar" active={tab === "planned"} onClick={() => setTab("planned")} />
          <TabButton label="Gönderilen Mesajlar" active={tab === "sent"} onClick={() => setTab("sent")} />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "0.75rem",
            alignItems: "center"
          }}
        >
          <input
            placeholder="Seri adı veya içerik içinde arayın..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{
              padding: "0.7rem 0.9rem",
              borderRadius: "12px",
              border: "1px solid var(--border)"
            }}
          />
          <Select
            label="Ad Soyad Seçimi"
            value={selectedClient}
            onChange={setSelectedClient}
            options={clientOptions.map((client) => ({ value: client.id, label: client.name }))}
          />
          <Select
            label="İletişim Kanalı"
            value={selectedChannel}
            onChange={setSelectedChannel}
            options={channelOptions.map((channel) => ({ value: channel.id, label: channel.label }))}
          />
        </div>
      </header>

      {showEmpty ? (
        <div
          style={{
            padding: "2rem",
            borderRadius: "12px",
            border: "1px dashed rgba(148, 163, 184, 0.6)",
            background: "rgba(248, 250, 252, 0.7)",
            textAlign: "center",
            color: "var(--text-muted)"
          }}
        >
          {tab === "planned"
            ? "Henüz planlanan bir mesaj bulunmuyor. Yeni bir kampanya oluşturduğunuzda burada görünecek."
            : "Henüz gönderilen mesaj kaydı gözükmüyor. İlk gönderinizi yaptığınızda liste güncellenecek."}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr style={{ textAlign: "left", background: "rgba(248, 250, 252, 0.8)" }}>
                <HeaderCell>Ad Soyad Seçimi</HeaderCell>
                <HeaderCell>İletişim Kanalı</HeaderCell>
                <HeaderCell>{tab === "planned" ? "İletişim Durumu" : "İletişim Tarihi"}</HeaderCell>
                <HeaderCell>İletişim Sebebi</HeaderCell>
                <HeaderCell>İletişim İçeriği</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <Row key={record.id} tab={tab} record={record} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

type TableRecord = PlannedRecord | SentRecord;

interface RowProps {
  tab: TabKey;
  record: TableRecord;
}

function Row({ tab, record }: RowProps) {
  const dateLabel =
    tab === "planned"
      ? new Date((record as PlannedRecord).scheduledAt).toLocaleString("tr-TR")
      : new Date((record as SentRecord).sentAt).toLocaleString("tr-TR");

  const status = tab === "planned" ? (record as PlannedRecord).status : undefined;

  return (
    <tr
      style={{
        background: "#ffffff",
        borderBottom: "1px solid rgba(226, 232, 240, 0.8)"
      }}
    >
      <Cell>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <strong>{record.campaignName}</strong>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            {record.recipients} alıcı
          </span>
        </div>
      </Cell>
      <Cell>
        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
          {record.channels.map((channel) => (
            <Badge key={channel}>{channel.toUpperCase()}</Badge>
          ))}
        </div>
      </Cell>
      <Cell>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span>{dateLabel}</span>
          {status && <StatusPill status={status} />}
        </div>
      </Cell>
      <Cell>
        <span style={{ fontWeight: 600 }}>{record.reason}</span>
      </Cell>
      <Cell>
        <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          {record.bodyPreview?.slice(0, 80) || "—"}
        </span>
      </Cell>
    </tr>
  );
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "0.6rem 1.1rem",
        borderRadius: "999px",
        border: active ? "1px solid rgba(255, 107, 0, 0.8)" : "1px solid rgba(148, 163, 184, 0.6)",
        background: active ? "rgba(255, 107, 0, 0.15)" : "#ffffff",
        color: active ? "#b45309" : "#475569",
        fontWeight: 600,
        cursor: "pointer"
      }}
    >
      {label}
    </button>
  );
}

function Select({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontWeight: 600 }}>
      <span style={{ fontSize: "0.9rem", color: "#475569" }}>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          padding: "0.7rem 0.9rem",
          borderRadius: "12px",
          border: "1px solid var(--border)",
          background: "#fff"
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Badge({ children }: { children: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0.25rem 0.6rem",
        borderRadius: "999px",
        background: "rgba(255, 107, 0, 0.12)",
        color: "#b45309",
        fontSize: "0.8rem",
        fontWeight: 700,
        letterSpacing: "0.02em"
      }}
    >
      {children}
    </span>
  );
}

function StatusPill({ status }: { status: "pending" | "scheduled" | "draft" }) {
  const labelMap: Record<typeof status, string> = {
    pending: "Gönderim Beklemede",
    scheduled: "İletişim Planlandı",
    draft: "Taslak"
  };
  const colorMap: Record<typeof status, { bg: string; fg: string; border: string }> = {
    pending: { bg: "rgba(253, 224, 71, 0.18)", fg: "#a16207", border: "rgba(250, 204, 21, 0.55)" },
    scheduled: { bg: "rgba(110, 231, 183, 0.18)", fg: "#047857", border: "rgba(16, 185, 129, 0.55)" },
    draft: { bg: "rgba(148, 163, 184, 0.15)", fg: "#1f2937", border: "rgba(148, 163, 184, 0.55)" }
  };
  const colors = colorMap[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0.25rem 0.6rem",
        borderRadius: "999px",
        background: colors.bg,
        color: colors.fg,
        fontSize: "0.75rem",
        fontWeight: 700,
        border: `1px solid ${colors.border}`,
        width: "fit-content"
      }}
    >
      {labelMap[status]}
    </span>
  );
}

function HeaderCell({ children }: { children: string }) {
  return (
    <th
      style={{
        padding: "0.85rem 1rem",
        fontSize: "0.85rem",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: "#475569"
      }}
    >
      {children}
    </th>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <td
      style={{
        padding: "1rem",
        fontSize: "0.95rem",
        verticalAlign: "top"
      }}
    >
      {children}
    </td>
  );
}

function filterRecords<T extends PlannedRecord | SentRecord>(
  records: T[],
  search: string,
  selectedClient: string,
  selectedChannel: string
): T[] {
  return records.filter((record) => {
    const matchSearch = !search
      ? true
      : record.campaignName.toLowerCase().includes(search.toLowerCase()) ||
        record.bodyPreview.toLowerCase().includes(search.toLowerCase());

    const matchChannel = selectedChannel === "all" ? true : record.channels.includes(selectedChannel);

    if (selectedClient === "all") {
      return matchSearch && matchChannel;
    }

    return matchSearch && matchChannel;
  });
}
