import Link from "next/link";
import { getAuthSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { formatCurrency } from "@/lib/format";

function Sparklines({ points }: { points: Array<{ index: number; value: number }> }) {
  if (points.length === 0) {
    return <div style={{ width: "100%", height: "100%", background: "rgba(148, 163, 184, 0.2)", borderRadius: "8px" }} />;
  }

  const values = points.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  const normalized = points.map((point, index) => ({
    x: (index / Math.max(points.length - 1, 1)) * 100,
    y: 100 - ((point.value - minValue) / range) * 100
  }));

  const path = normalized
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
      <path d={path} fill="none" stroke="#2563eb" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={normalized.at(-1)?.x ?? 0} cy={normalized.at(-1)?.y ?? 0} r={3} fill="#2563eb" />
    </svg>
  );
}

async function getMarketSnapshot() {
  const endpoints = [
    ["usdTry", "https://api.frankfurter.app/latest?from=USD&to=TRY"],
    ["eurTry", "https://api.frankfurter.app/latest?from=EUR&to=TRY"],
    ["eurUsd", "https://api.frankfurter.app/latest?from=EUR&to=USD"]
  ] as const;

  try {
    const results = await Promise.all(
      endpoints.map(async ([key, url]) => {
        const response = await fetch(url, { next: { revalidate: 1800 } });
        if (!response.ok) {
          throw new Error(`Request failed for ${key}`);
        }
        const json = await response.json();
        const rateKey = Object.keys(json.rates ?? {})[0];
        return [key, rateKey ? Number(json.rates[rateKey]) : null, json.date ?? null] as const;
      })
    );

    const snapshot = {
      usdTry: results[0][1],
      eurTry: results[1][1],
      eurUsd: results[2][1],
      date: results[0][2] || results[1][2] || results[2][2] || null
    };

    return snapshot;
  } catch (error) {
    console.error("Piyasa verileri alınamadı:", error);
    return null;
  }
}

export default async function DashboardPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return null;
  }

  const userId = session.user.id;

  const [
    marketSnapshot,
    clientSummaryResponse,
    latestUploadResponse,
    recentClientsResponse,
    recentEmailsResponse,
    snapshotsResponse
  ] = await Promise.all([
    getMarketSnapshot(),
    supabaseAdmin
      .from("clients")
      .select("first_savings, current_savings", { count: "exact" })
      .eq("owner_id", userId)
      .is("deleted_at", null),
    supabaseAdmin
      .from("uploads")
      .select("id, filename, total_records, processed_at")
      .eq("owner_id", userId)
      .order("processed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("clients")
      .select("id, name, email, created_at")
      .eq("owner_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5),
    supabaseAdmin
      .from("email_logs")
      .select("id, subject, recipients, sent_at")
      .eq("owner_id", userId)
      .order("sent_at", { ascending: false })
      .limit(5),
    supabaseAdmin
      .from("savings_snapshots")
      .select("amount, recorded_at, clients!inner(owner_id)")
      .eq("clients.owner_id", userId)
      .order("recorded_at", { ascending: false })
      .limit(60)
  ]);

  if (clientSummaryResponse.error) {
    throw clientSummaryResponse.error;
  }
  if (latestUploadResponse.error) {
    throw latestUploadResponse.error;
  }
  if (recentClientsResponse.error) {
    throw recentClientsResponse.error;
  }
  if (recentEmailsResponse.error) {
    throw recentEmailsResponse.error;
  }
  if (snapshotsResponse.error) {
    throw snapshotsResponse.error;
  }

  const clientSummary = clientSummaryResponse.data ?? [];
  const clientCount = clientSummaryResponse.count ?? 0;
  const totalCurrent = clientSummary.reduce((sum, row) => sum + Number(row.current_savings ?? 0), 0);
  const totalFirst = clientSummary.reduce((sum, row) => sum + Number(row.first_savings ?? 0), 0);
  const growth = totalFirst === 0 ? 0 : (totalCurrent - totalFirst) / totalFirst;
  const latestUpload = latestUploadResponse.data
    ? {
        id: latestUploadResponse.data.id,
        filename: latestUploadResponse.data.filename,
        totalRecords: latestUploadResponse.data.total_records,
        processedAt: latestUploadResponse.data.processed_at ? new Date(latestUploadResponse.data.processed_at) : null
      }
    : null;
  const recentClients =
    recentClientsResponse.data?.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: row.created_at ? new Date(row.created_at) : null
    })) ?? [];
  const recentEmails =
    recentEmailsResponse.data?.map((row) => ({
      id: row.id,
      subject: row.subject,
      recipients: row.recipients,
      sentAt: row.sent_at ? new Date(row.sent_at) : null
    })) ?? [];

  const snapshots = snapshotsResponse.data ?? [];
  const monthMap = new Map<string, { label: string; amount: number }>();
  const normalizeMonth = (date: string | null) => {
    if (!date) {
      return null;
    }
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    const key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
    const label = parsed.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
    return { key, label, date: parsed };
  };

  for (const item of snapshots) {
    const normalized = normalizeMonth(item.recorded_at);
    if (!normalized) {
      continue;
    }
    const amount = Number(item.amount ?? 0);
    const existing = monthMap.get(normalized.key);
    if (!existing || amount >= existing.amount) {
      monthMap.set(normalized.key, { label: normalized.label, amount });
    }
  }

  const monthlySeries = Array.from(monthMap.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([, value]) => value);

  const lastMonth = monthlySeries.at(-2)?.amount ?? null;
  const currentMonth = monthlySeries.at(-1)?.amount ?? null;
  const delta = currentMonth !== null && lastMonth !== null ? currentMonth - lastMonth : null;
  const sparklinePoints = monthlySeries.slice(-6).map((item, index) => ({ index, value: item.amount }));

  const hasClients = clientCount > 0;

  return (
    <div className="page-shell">
      <div className="dashboard">
      <header className="dashboard__header">
        <div>
          <h1>Kontrol Paneli</h1>
          <p className="text-muted">Portföyünüz ve son aktivitelerinizin hızlı özeti.</p>
        </div>
        <aside className="card dashboard__upload">
          <span className="dashboard__label">Son veri yüklemesi</span>
          {latestUpload ? (
            <>
              <p className="dashboard__upload-title">{latestUpload.filename}</p>
              <span className="text-muted">
                {latestUpload.totalRecords} kayıt • {latestUpload.processedAt?.toLocaleString("tr-TR")}
              </span>
            </>
          ) : (
            <p className="text-muted dashboard__upload-empty">Henüz yükleme yapılmadı</p>
          )}
        </aside>
      </header>

      <section className="card onboarding-card" aria-label="Hızlı başlangıç adımları">
        <div className="onboarding-card__content">
          <div>
            <h2>{hasClients ? "Günlük aksiyonlar" : "BES Codex'e hoş geldiniz"}</h2>
            <p className="text-muted">
              {hasClients
                ? "Portföyünüzü güncel tutmak ve iletişim göndermek için hızlı aksiyonlara buradan ulaşabilirsiniz."
                : "İlk müşterinizi ekleyip tasarruf takibini başlatmak için aşağıdaki adımları izleyin."}
            </p>
          </div>
          <div className="onboarding-card__actions">
            <Link href="/clients/new" className="btn btn-primary" prefetch>
              {hasClients ? "Yeni müşteri ekle" : "1. Müşteri oluştur"}
            </Link>
            <Link href="/communications/new" className="btn btn-secondary" prefetch>
              {hasClients ? "Fon özeti gönder" : "2. Fon özeti hazırla"}
            </Link>
            <Link href="/clients" className="btn btn-ghost" prefetch>
              {hasClients ? "Portföyü görüntüle" : "3. Müşteri listesini incele"}
            </Link>
          </div>
        </div>
        {!hasClients && (
          <ul className="onboarding-card__steps">
            <li>
              <strong>Müşteri ekle:</strong> Birkaç temel bilgiyi girerek müşteri kaydı oluşturun.
            </li>
            <li>
              <strong>Tasarrufları güncelle:</strong> Güncel BES bakiyesini girin, sistem büyümeyi hesaplasın.
            </li>
            <li>
              <strong>İletişim planlayın:</strong> Hazır şablonlarla fon özeti göndermeye başlayın.
            </li>
          </ul>
        )}
      </section>

      <section className="dashboard__stats">
        <div className="card dashboard__stat">
          <span className="dashboard__label">Toplam müşteri</span>
          <strong>{clientCount}</strong>
        </div>
        <div className="card dashboard__stat">
          <span className="dashboard__label">Yönetilen varlıklar</span>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem", flexWrap: "wrap" }}>
            <strong>{formatCurrency(totalCurrent)}</strong>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", minWidth: "160px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                <span>Bu ay</span>
                <span>Geçen ay</span>
              </div>
              <div style={{ height: "34px", position: "relative" }}>
                <Sparklines points={sparklinePoints} />
              </div>
              {delta !== null && (
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: delta >= 0 ? "#16a34a" : "#dc2626",
                    fontWeight: 600
                  }}
                >
                  {delta >= 0 ? "+" : ""}
                  {formatCurrency(delta)} değişim
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="card dashboard__stat">
          <span className="dashboard__label">Başlangıca göre büyüme</span>
          <strong className={growth === 0 ? "text-muted" : "text-success"}>
            {growth === 0 ? "—" : `${(growth * 100).toFixed(1)}%`}
          </strong>
        </div>
        <div className="card dashboard__stat">
          <span className="dashboard__label">Piyasa kurları</span>
          {marketSnapshot ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.9rem" }}>
              {marketSnapshot.date && (
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {new Date(marketSnapshot.date).toLocaleString("tr-TR", {
                    year: "numeric",
                    month: "short",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZoneName: "short"
                  })} itibarıyla
                </span>
              )}
              <span style={{ display: "flex", justifyContent: "space-between" }}>
                <span>USD/TRY</span>
                <strong>{marketSnapshot.usdTry ? marketSnapshot.usdTry.toFixed(2) : "—"}</strong>
              </span>
              <span style={{ display: "flex", justifyContent: "space-between" }}>
                <span>EUR/TRY</span>
                <strong>{marketSnapshot.eurTry ? marketSnapshot.eurTry.toFixed(2) : "—"}</strong>
              </span>
              <span style={{ display: "flex", justifyContent: "space-between" }}>
                <span>EUR/USD</span>
                <strong>{marketSnapshot.eurUsd ? marketSnapshot.eurUsd.toFixed(3) : "—"}</strong>
              </span>
            </div>
          ) : (
            <span className="text-muted" style={{ fontSize: "0.85rem" }}>
              Güncel kurlar alınamadı.
            </span>
          )}
        </div>
      </section>

      <section className="dashboard__panels">
        <div className="card dashboard__panel">
          <div className="dashboard__panel-header">
            <h2>Son eklenen müşteriler</h2>
            <Link href="/clients" className="text-blue-600">
              Tümünü gör →
            </Link>
          </div>
          <ul className="dashboard__list">
            {recentClients.length === 0 && (
              <li className="dashboard__empty">Henüz müşteri yok. CSV içe aktarın veya manuel ekleyin.</li>
            )}
            {recentClients.map((client) => (
              <li key={client.id} className="dashboard__list-row">
                <div>
                  <span className="dashboard__item-title">{client.name}</span>
                  <span className="dashboard__item-subtitle">{client.email}</span>
                </div>
                <span className="dashboard__pill">
                  {client.createdAt ? client.createdAt.toLocaleDateString("tr-TR") : "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card dashboard__panel">
          <div className="dashboard__panel-header">
            <h2>Son iletişimler</h2>
            <Link href="/communications" className="text-blue-600">
              Kayıtları gör →
            </Link>
          </div>
          <ul className="dashboard__list">
            {recentEmails.length === 0 && (
              <li className="dashboard__empty">Henüz tasarruf özeti gönderilmedi. Müşteriler sayfasından gönderebilirsiniz.</li>
            )}
            {recentEmails.map((log) => (
              <li key={log.id} className="dashboard__list-row">
                <div>
                  <span className="dashboard__item-title">{log.subject}</span>
                  <span className="dashboard__item-subtitle">
                    {log.recipients} kişi • {log.sentAt ? log.sentAt.toLocaleDateString("tr-TR") : "—"}
                  </span>
                </div>
                <span className="dashboard__pill">
                  {log.sentAt
                    ? log.sentAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      </div>
    </div>
  );
}
