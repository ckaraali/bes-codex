import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getAuthSession } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { DeleteClientButton } from "@/components/clients/DeleteClientButton";
import { EditClientForm } from "@/components/clients/EditClientForm";
import { ClientSparkline, type SparklinePoint } from "@/components/clients/Sparkline";
import { supabaseAdmin } from "@/lib/supabase";

interface PageProps {
  params: {
    id: string;
  };
}

type ClientDetailRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  birth_date?: string | null;
  first_savings: number | string | null;
  current_savings: number | string | null;
  created_at: string | null;
  updated_at: string | null;
  client_type?: string | null;
  policy_type?: string | null;
  policy_start_date?: string | null;
  policy_end_date?: string | null;
};

export default async function ClientDetailPage({ params }: PageProps) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return null;
  }

  let supportsBirthDate = true;
  let supportsPolicyColumns = true;
  let clientRow: ClientDetailRow | null = null;
  let error: any = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const fields = [
      "id",
      "name",
      "email",
      "phone",
      "first_savings",
      "current_savings",
      "created_at",
      "updated_at"
    ];
    if (supportsBirthDate) {
      fields.push("birth_date");
    }
    if (supportsPolicyColumns) {
      fields.push("client_type", "policy_type", "policy_start_date", "policy_end_date");
    }

    const { data, error: fetchError } = await supabaseAdmin
      .from("clients")
      .select(fields.join(", "))
      .eq("owner_id", session.user.id)
      .eq("id", params.id)
      .is("deleted_at", null)
      .maybeSingle();

    clientRow = (data as ClientDetailRow | null) ?? null;
    error = fetchError;

    if (!error) {
      break;
    }

    const message = error.message ?? "";
    let retried = false;
    if (supportsBirthDate && message.includes("birth_date")) {
      supportsBirthDate = false;
      retried = true;
    }
    if (
      supportsPolicyColumns &&
      ["client_type", "policy_type", "policy_start_date", "policy_end_date"].some((column) =>
        message.includes(column)
      )
    ) {
      supportsPolicyColumns = false;
      retried = true;
    }

    if (!retried) {
      break;
    }
  }

  if (error) {
    console.error("Supabase client fetch error", error);
    notFound();
  }

  if (!clientRow) {
    notFound();
  }

  const { data: snapshotsData, error: snapshotError } = await supabaseAdmin
    .from("savings_snapshots")
    .select("id, amount, recorded_at")
    .eq("client_id", clientRow.id)
    .order("recorded_at", { ascending: false });

  if (snapshotError) {
    console.error("Supabase snapshots fetch error", snapshotError);
  }

  const snapshots =
    snapshotsData?.map((snapshot) => ({
      id: snapshot.id,
      amount: snapshot.amount,
      recordedAt: snapshot.recorded_at ? new Date(snapshot.recorded_at) : null
    })) ?? [];

  const monthlySeries: Array<{ monthKey: string; monthLabel: string; amount: number }> = [];
  if (snapshots.length > 0) {
    const monthMap = new Map<string, { monthKey: string; monthLabel: string; amount: number }>();
    for (const snapshot of snapshots) {
      if (!snapshot.recordedAt) {
        continue;
      }
      const monthKey = `${snapshot.recordedAt.getFullYear()}-${String(snapshot.recordedAt.getMonth() + 1).padStart(2, "0")}`;
      if (!monthMap.has(monthKey)) {
        const monthLabel = snapshot.recordedAt.toLocaleDateString("tr-TR", {
          year: "numeric",
          month: "long"
        });
        monthMap.set(monthKey, {
          monthKey,
          monthLabel,
          amount: Number(snapshot.amount ?? 0)
        });
      }
    }
    monthlySeries.push(...Array.from(monthMap.values()).sort((a, b) => (a.monthKey < b.monthKey ? -1 : 1)));
  }

  const sparklinePoints: SparklinePoint[] = monthlySeries.map((item, index) => ({ index, value: item.amount }));
  const currentMonth = monthlySeries.at(-1)?.amount ?? null;
  const previousMonth = monthlySeries.at(-2)?.amount ?? null;
  const delta = currentMonth !== null && previousMonth !== null ? currentMonth - previousMonth : null;

  const firstSavings = Number(clientRow.first_savings ?? 0);
  const currentSavings = Number(clientRow.current_savings ?? 0);
  const growth = firstSavings === 0 ? null : ((currentSavings - firstSavings) / firstSavings) * 100;
  const clientTypeRaw = supportsPolicyColumns ? clientRow.client_type ?? "" : "";
  const normalisedType = clientTypeRaw?.toUpperCase?.() ?? "";
  const hasBesTrack =
    normalisedType.includes("BES") ||
    firstSavings > 0 ||
    currentSavings > 0 ||
    snapshots.length > 0 ||
    Boolean(clientRow.birth_date);
  const hasEsTrack =
    normalisedType.includes("ES") ||
    (supportsPolicyColumns &&
      Boolean(clientRow.policy_type ?? clientRow.policy_start_date ?? clientRow.policy_end_date));
  const typeLabels = [];
  if (hasBesTrack) typeLabels.push("BES");
  if (hasEsTrack) typeLabels.push("ES");
  const typeDescription = typeLabels.length > 0 ? typeLabels.join(" + ") : "Tanımsız";
  const policyStart =
    supportsPolicyColumns && clientRow.policy_start_date ? new Date(clientRow.policy_start_date) : null;
  const policyEnd = supportsPolicyColumns && clientRow.policy_end_date ? new Date(clientRow.policy_end_date) : null;
  const totalPolicyDays =
    policyStart && policyEnd ? Math.ceil((policyEnd.getTime() - policyStart.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const remainingPolicyDays =
    policyEnd ? Math.ceil((policyEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
  const clientFormValues = {
    id: clientRow.id,
    name: clientRow.name ?? "",
    email: clientRow.email,
    phone: clientRow.phone,
    birthDate:
      supportsBirthDate && clientRow.birth_date ? new Date(clientRow.birth_date).toISOString().split("T")[0] : null,
    clientType: supportsPolicyColumns ? clientRow.client_type ?? (hasBesTrack ? "BES" : hasEsTrack ? "ES" : "") : null,
    policyType: supportsPolicyColumns ? clientRow.policy_type ?? null : null,
    policyStartDate:
      supportsPolicyColumns && clientRow.policy_start_date
        ? new Date(clientRow.policy_start_date).toISOString().split("T")[0]
        : null,
    policyEndDate:
      supportsPolicyColumns && clientRow.policy_end_date
        ? new Date(clientRow.policy_end_date).toISOString().split("T")[0]
        : null,
    firstSavings,
    currentSavings
  };

  return (
    <div className="page-shell">
      <Link href="/clients" style={{ color: "var(--accent)", fontWeight: 600 }}>
        ← Müşteri listesine dön
      </Link>

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "2rem" }}>{clientRow.name}</h1>
          <p style={{ marginTop: "0.5rem", color: "var(--text-muted)" }}>{clientRow.email}</p>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
            {typeLabels.length === 0 ? <TypeBadge tone="neutral">Tür bilgisi yok</TypeBadge> : null}
            {hasBesTrack && <TypeBadge tone="bes">BES</TypeBadge>}
            {hasEsTrack && <TypeBadge tone="es">ES</TypeBadge>}
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link
            href="#edit-client"
            style={{
              padding: "0.7rem 1.15rem",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "#fff",
              fontWeight: 600,
              color: "var(--accent)"
            }}
          >
            Bilgileri düzenle
          </Link>
          <Link
            href={{
              pathname: "/communications/new",
              query: { selected: clientRow.id, preset: "fund-summary" }
            }}
            style={{
              padding: "0.7rem 1.15rem",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "#fff",
              fontWeight: 600,
              color: "var(--accent)"
            }}
          >
            Fon özeti gönder
          </Link>
        </div>
      </header>

      <section className="card" style={{ display: "grid", gap: "1rem", padding: "1.5rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Müşteri bilgileri</h2>
        <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <InfoItem label="Telefon" value={clientRow.phone ?? "—"} />
          <InfoItem label="Müşteri türü" value={typeDescription} />
          {supportsBirthDate && clientRow.birth_date && (
            <InfoItem 
              label="Doğum Tarihi" 
              value={new Date(clientRow.birth_date).toLocaleDateString("tr-TR")} 
            />
          )}
          <InfoItem label="İlk tasarruf" value={formatCurrency(firstSavings)} />
          <InfoItem label="Güncel tasarruf" value={formatCurrency(currentSavings)} />
          <InfoItem
            label="Büyüme"
            value={growth === null ? "—" : `${growth > 0 ? "+" : ""}${growth.toFixed(1)}%`}
          />
          <InfoItem label="Eklenme tarihi" value={clientRow.created_at ? new Date(clientRow.created_at).toLocaleString("tr-TR") : "—"} />
          <InfoItem label="Son güncelleme" value={clientRow.updated_at ? new Date(clientRow.updated_at).toLocaleString("tr-TR") : "—"} />
        </div>
      </section>

      <section id="edit-client" className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Müşteri bilgilerini düzenle</h2>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Güncel tasarruf değerinde yaptığınız değişiklikler, aylık özete otomatik yansıtılır.
        </p>
        <EditClientForm
          client={clientFormValues}
          supportsBirthDate={supportsBirthDate}
          supportsPolicyColumns={supportsPolicyColumns}
        />
      </section>

      <section className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Aylık birikim özeti</h2>
        {monthlySeries.length === 0 ? (
          <p style={{ color: "var(--text-muted)", margin: 0 }}>Henüz aylık özet oluşturulmadı.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 160px",
              gap: "1.25rem",
              alignItems: "center"
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  <th style={{ paddingBottom: "0.75rem" }}>Ay</th>
                  <th style={{ paddingBottom: "0.75rem", textAlign: "right" }}>Birikim</th>
                </tr>
              </thead>
              <tbody>
                {monthlySeries.map((item) => (
                  <tr key={item.monthKey} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.75rem 0" }}>{item.monthLabel}</td>
                    <td style={{ padding: "0.75rem 0", textAlign: "right", fontWeight: 600 }}>{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <div style={{ height: "64px" }}>
                <ClientSparkline points={sparklinePoints} />
              </div>
              {delta !== null && (
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: delta >= 0 ? "var(--color-success)" : "var(--color-danger)",
                    textAlign: "right"
                  }}
                >
                  {delta >= 0 ? "+" : ""}
                  {formatCurrency(delta)} aylık değişim
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      {supportsPolicyColumns && hasEsTrack && (
        <section className="card" style={{ display: "grid", gap: "1rem", padding: "1.5rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Poliçe bilgileri</h2>
          <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <InfoItem label="Poliçe türü" value={clientRow.policy_type ?? "—"} />
            <InfoItem label="Başlangıç tarihi" value={policyStart ? formatDate(policyStart) : "—"} />
            <InfoItem label="Bitiş tarihi" value={policyEnd ? formatDate(policyEnd) : "—"} />
            {totalPolicyDays !== null && (
              <InfoItem label="Toplam süre" value={`${totalPolicyDays} gün`} />
            )}
            {remainingPolicyDays !== null && (
              <InfoItem
                label="Kalan süre"
                value={
                  remainingPolicyDays >= 0
                    ? `${remainingPolicyDays} gün`
                    : `${Math.abs(remainingPolicyDays)} gün önce bitti`
                }
              />
            )}
          </div>
        </section>
      )}

      <section className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Tasarruf geçmişi</h2>
        {snapshots.length === 0 ? (
          <p style={{ color: "var(--text-muted)", margin: 0 }}>Henüz kayıtlı tasarruf geçmişi bulunmuyor.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {snapshots.map((snapshot) => (
              <li
                key={snapshot.id}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: "1rem",
                  borderBottom: "1px solid var(--border)",
                  paddingBottom: "0.75rem"
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>
                  {snapshot.recordedAt ? snapshot.recordedAt.toLocaleString("tr-TR") : "—"}
                </span>
                <strong>{formatCurrency(Number(snapshot.amount ?? 0))}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <DeleteClientButton clientId={clientRow.id} clientName={clientRow.name} />
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TypeBadge({ children, tone }: { children: ReactNode; tone: "bes" | "es" | "neutral" }) {
  const palette: Record<"bes" | "es" | "neutral", { bg: string; color: string }> = {
    bes: { bg: "rgba(20, 80, 163, 0.1)", color: "var(--accent)" },
    es: { bg: "rgba(4, 120, 87, 0.1)", color: "#047857" },
    neutral: { bg: "rgba(148, 163, 184, 0.15)", color: "var(--text-muted)" }
  } as const;
  const current = palette[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: "999px",
        padding: "0.2rem 0.75rem",
        fontSize: "0.8rem",
        fontWeight: 600,
        background: current.bg,
        color: current.color,
        textTransform: "uppercase",
        letterSpacing: "0.05em"
      }}
    >
      {children}
    </span>
  );
}

function formatDate(date: Date) {
  return date.toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}
