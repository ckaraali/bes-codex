import Link from "next/link";
import { getAuthSession } from "@/lib/auth";
import { NewClientForm } from "@/components/clients/NewClientForm";
import { ClientUploadForm } from "@/components/clients/ClientUploadForm";

export const dynamic = "force-dynamic";

export default async function NewClientPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return null;
  }

  return (
    <div className="page-shell">
      <header style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "2.1rem" }}>Müşteri Ekle</h1>
            <p style={{ margin: "0.4rem 0 0", color: "var(--text-muted)", maxWidth: "640px" }}>
              Yeni müşteri kayıtlarını manuel veya CSV yüklemesiyle sisteme aktarın. Kaydettiğiniz müşteriler anında portföy
              listesinde görüntülenir.
            </p>
          </div>
          <Link
            href="/clients"
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              background: "#ffffff",
              color: "var(--accent)",
              fontWeight: 600,
              textDecoration: "none"
            }}
          >
            Müşteri listesine dön
          </Link>
        </div>
      </header>

      <section
        style={{
          display: "grid",
          gap: "1.5rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          alignItems: "start"
        }}
      >
        <div
          style={{
            display: "grid",
            gap: "1.25rem",
            padding: "1.5rem",
            borderRadius: "18px",
            border: "1px solid rgba(148, 163, 184, 0.35)",
            background: "#ffffff",
            boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)"
          }}
        >
          <header style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <h2 style={{ margin: 0 }}>Yeni Müşteri Ekle</h2>
            <span style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
              Formu doldurup kaydedin, müşteri anında sisteme eklensin.
            </span>
          </header>
          <NewClientForm variant="plain" showTitle={false} />
        </div>

        <div
          style={{
            display: "grid",
            gap: "1.25rem",
            padding: "1.5rem",
            borderRadius: "18px",
            border: "1px solid rgba(148, 163, 184, 0.35)",
            background: "#ffffff",
            boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)"
          }}
        >
          <header style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <h2 style={{ margin: 0 }}>Çoklu Müşteri Ekle</h2>
            <span style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
              Excel veya CRM’den aldığınız listeyi CSV olarak yükleyin.
            </span>
          </header>
          <ClientUploadForm variant="plain" showTitle={false} />
        </div>
      </section>
    </div>
  );
}
