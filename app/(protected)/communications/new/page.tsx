import Link from "next/link";
import { getAuthSession } from "@/lib/auth";
import { CommunicationPlannerForm } from "@/components/communications/CommunicationPlannerForm";
import { COMMUNICATION_REASONS } from "@/lib/communication-reasons";
import { supabaseAdmin } from "@/lib/supabase";

const CHANNELS = [
  { id: "email", label: "E-posta" },
  { id: "sms", label: "SMS" },
  { id: "whatsapp", label: "WhatsApp" }
];

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export default async function NewCommunicationPage({ searchParams }: PageProps) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return null;
  }

  const selectedParam = searchParams?.selected;
  const selectedClientIds = Array.isArray(selectedParam)
    ? selectedParam
    : selectedParam
    ? [selectedParam]
    : [];

  const preset = typeof searchParams?.preset === "string" ? searchParams.preset : undefined;

  let defaultSubject = "";
  let defaultBody = "";

  if (preset === "fund-summary") {
    defaultSubject = "Fon Özeti";
    defaultBody = "<p>Merhaba,</p><p>Talep ettiğiniz fon özetini ekte paylaşıyorum. Herhangi bir sorunuz olursa memnuniyetle yardımcı olurum.</p><p>İyi günler dilerim.</p>";
  }

  const { data: clients, error } = await supabaseAdmin
    .from("clients")
    .select("id, name, email")
    .eq("owner_id", session.user.id)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (
    <div className="page-shell" style={{ gap: "1.5rem" }}>
      <header style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.8rem" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "2.2rem" }}>İletişim Ekle</h1>
            <p style={{ margin: "0.35rem 0 0", color: "var(--text-muted)", maxWidth: "720px" }}>
              Çoklu müşteri seçerek kişiselleştirilmiş kampanyalar oluşturun. Yapay zeka destekli taslaklarla konu ve içerik
              üretin, kanal ve zamanlama seçerek otomatik gönderim planlayın.
            </p>
          </div>
          <Link
            href="/communications"
            style={{
              padding: "0.75rem 1.25rem",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              background: "#ffffff",
              color: "var(--accent)",
              fontWeight: 600,
              textDecoration: "none"
            }}
          >
            Planlanan mesajlara dön
          </Link>
        </div>
      </header>

      <CommunicationPlannerForm
        clients={clients ?? []}
        reasons={COMMUNICATION_REASONS}
        channels={CHANNELS}
        defaultSubject={defaultSubject}
        defaultBody={defaultBody}
        initialClientIds={selectedClientIds}
      />
    </div>
  );
}
