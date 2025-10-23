import { getAuthSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";

export default async function CampaignsPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return null;
  }

  const { data: campaigns, error } = await supabaseAdmin
    .from("communication_campaigns")
    .select("id, subject, status, scheduled_at, created_at")
    .eq("owner_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (
    <div className="page-shell">
      <header>
        <h1 style={{ margin: 0, fontSize: "2rem" }}>İletişim Planları</h1>
        <p className="text-muted">Planlanmış e-posta kampanyalarınızı yönetin.</p>
      </header>

      <div className="card">
        <h2 style={{ margin: "0 0 1.5rem 0" }}>Kampanyalar</h2>
        
        {campaigns?.length === 0 ? (
          <p className="text-muted">Henüz kampanya bulunmuyor.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "0.75rem", borderBottom: "1px solid var(--border)" }}>Konu</th>
                  <th style={{ textAlign: "left", padding: "0.75rem", borderBottom: "1px solid var(--border)" }}>Durum</th>
                  <th style={{ textAlign: "left", padding: "0.75rem", borderBottom: "1px solid var(--border)" }}>Tarih</th>
                  <th style={{ textAlign: "left", padding: "0.75rem", borderBottom: "1px solid var(--border)" }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {campaigns?.map((campaign) => (
                  <tr key={campaign.id}>
                    <td style={{ padding: "0.75rem", borderBottom: "1px solid var(--border)" }}>
                      {campaign.subject}
                    </td>
                    <td style={{ padding: "0.75rem", borderBottom: "1px solid var(--border)" }}>
                      <span className={campaign.status === 'DRAFT' ? 'text-muted' : 'text-success'}>
                        {campaign.status === 'DRAFT' ? 'Taslak' : campaign.status}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem", borderBottom: "1px solid var(--border)" }}>
                      {campaign.scheduled_at ? new Date(campaign.scheduled_at).toLocaleDateString("tr-TR") : "-"}
                    </td>
                    <td style={{ padding: "0.75rem", borderBottom: "1px solid var(--border)" }}>
                      <Link 
                        href={`/communications/campaigns/${campaign.id}`}
                        className="btn btn-secondary"
                        style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
                      >
                        Düzenle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}