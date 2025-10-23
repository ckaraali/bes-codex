import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { ProfileForm } from "@/components/profile/ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("id, name, email, phone, bio, photo_url, photo_path")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) {
    console.error("Supabase kullanıcı verisi alınamadı:", error);
    throw error;
  }

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="page-shell">
      <header style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
        <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--accent)" }}>Profil</span>
        <h1 style={{ margin: 0, fontSize: "2.15rem" }}>Kişisel Bilgileriniz</h1>
        <p style={{ margin: 0, color: "var(--text-muted)", maxWidth: "640px" }}>
          İletişim bilgilerinizi güncelleyebilir, müşterilerinizin gördüğü profil fotoğrafınızı yükleyebilirsiniz.
        </p>
      </header>

      <ProfileForm
        user={{
          id: user.id,
          name: user.name ?? "",
          email: user.email,
          phone: user.phone,
          bio: user.bio,
          photoUrl: user.photo_url,
          photoPath: user.photo_path
        }}
      />
    </div>
  );
}
