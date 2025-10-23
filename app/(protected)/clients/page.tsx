import Link from "next/link";
import { getAuthSession } from "@/lib/auth";
import { ClientsTable } from "@/components/clients/ClientsTable";
import { DeleteAllClientsButton } from "@/components/clients/DeleteAllClientsButton";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return null;
  }

  const userId = session.user.id;

  let supportsBirthDate = true;
  let supportsPolicyColumns = true;
  let clientRows: any[] | null = null;
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
      .eq("owner_id", userId)
      .is("deleted_at", null)
      .order("name", { ascending: true });

    clientRows = data;
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
      ["client_type", "policy_type", "policy_start_date", "policy_end_date"].some((column) => message.includes(column))
    ) {
      supportsPolicyColumns = false;
      retried = true;
    }

    if (!retried) {
      break;
    }
  }

  if (error) {
    console.error("Clients fetch error:", error);
    throw error;
  }

  const formattedClients =
    clientRows?.map((client) => ({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone ?? "",
      firstSavings: Number(client.first_savings ?? 0),
      currentSavings: Number(client.current_savings ?? 0),
      createdAt: client.created_at ? new Date(client.created_at).toISOString() : "",
      updatedAt: client.updated_at ? new Date(client.updated_at).toISOString() : "",
      birthDate:
        supportsBirthDate && client.birth_date ? new Date(client.birth_date).toISOString().split("T")[0] : null,
      clientType: supportsPolicyColumns ? client.client_type ?? null : null,
      policyType: supportsPolicyColumns ? client.policy_type ?? null : null,
      policyStartDate:
        supportsPolicyColumns && client.policy_start_date
          ? new Date(client.policy_start_date).toISOString().split("T")[0]
          : null,
      policyEndDate:
        supportsPolicyColumns && client.policy_end_date
          ? new Date(client.policy_end_date).toISOString().split("T")[0]
          : null
    })) ?? [];

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <h1 className="page-title">Müşteriler</h1>
          <p className="text-muted">
            Portföyünüzü yönetin, BES ve ES müşterilerinizle ilgili tüm ayrıntıları tek yerden takip edin.
          </p>
        </div>
        <div className="page-actions">
          <Link href="/clients/new" className="btn btn-primary">
            Yeni müşteri ekle
          </Link>
          <Link href="/communications/new" className="btn btn-secondary">
            Fon özeti gönder
          </Link>
        </div>
      </header>

      {formattedClients.length === 0 && (
        <section className="card onboarding-card" aria-label="Müşteri oluşturma adımları">
          <div className="onboarding-card__content">
            <div>
              <h2>Hazır olduğunuzda: üç kolay adım</h2>
              <p className="text-muted">
                CSV yükleyebilir veya tek tek müşteri ekleyerek BES portföyünüzü hızla sisteme taşıyın.
              </p>
            </div>
            <div className="onboarding-card__actions">
              <Link href="/clients/new" className="btn btn-primary">
                Müşteri oluştur
              </Link>
              <Link href="/clients/new#upload" className="btn btn-secondary">
                CSV yükle
              </Link>
              <Link href="/communications/new" className="btn btn-ghost">
                İletişim planı oluştur
              </Link>
            </div>
          </div>
          <ul className="onboarding-card__steps">
            <li>
              <strong>Müşteri bilgilerini girin:</strong> İsim, e-posta ve telefon yeterli.
            </li>
            <li>
              <strong>BES/ES durumunu işaretleyin:</strong> Tasarruf ve poliçe detaylarını kaydedin.
            </li>
            <li>
              <strong>Hazır şablonları kullanın:</strong> İlk fon özetinizi birkaç dakika içinde gönderin.
            </li>
          </ul>
        </section>
      )}

      <ClientsTable clients={formattedClients} />

      <div style={{ marginTop: "1rem" }}>
        <DeleteAllClientsButton />
      </div>
    </div>
  );
}
