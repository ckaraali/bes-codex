import { getAuthSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { notFound } from "next/navigation";

export default async function EditCampaignPage({ params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return null;
  }

  const { data: campaign, error } = await supabaseAdmin
    .from("communication_campaigns")
    .select("*")
    .eq("id", params.id)
    .eq("owner_id", session.user.id)
    .single();

  if (error || !campaign) {
    notFound();
  }

  return (
    <div className="page-shell">
      <header>
        <h1 style={{ margin: 0, fontSize: "2rem" }}>Kampanya Düzenle</h1>
        <p className="text-muted">E-posta kampanyanızı düzenleyin.</p>
      </header>

      <div className="card">
        <form>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                Konu
              </label>
              <input
                type="text"
                name="subject"
                defaultValue={campaign.subject}
                className="input-field"
                required
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                E-posta İçeriği
              </label>
              <textarea
                name="body"
                defaultValue={campaign.body_text}
                className="input-field"
                rows={12}
                style={{ resize: "vertical" }}
                required
              />
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <button type="submit" className="btn btn-primary">
                Kaydet
              </button>
              <button type="button" className="btn btn-secondary">
                Gönder
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}