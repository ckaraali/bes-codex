"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export interface ProfileActionResult {
  success: boolean;
  message: string;
}

const profileSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalı."),
  email: z.string().email("Geçerli bir e-posta girin."),
  phone: z.string().max(40, "Telefon alanı çok uzun.").optional(),
  bio: z
    .string()
    .max(280, "Hakkımda alanı en fazla 280 karakter olabilir.")
    .optional()
});

export async function updateProfileAction(
  _prevState: ProfileActionResult | undefined,
  formData: FormData
): Promise<ProfileActionResult> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return { success: false, message: "Oturum bulunamadı." };
  }

  const parsed = profileSchema.safeParse({
    name: formData.get("name")?.toString().trim(),
    email: formData.get("email")?.toString().trim(),
    phone: formData.get("phone")?.toString().trim() || undefined,
    bio: formData.get("bio")?.toString().trim() || undefined
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { success: false, message: issue?.message ?? "Bilgiler doğrulanamadı." };
  }

  const { name, email, phone, bio } = parsed.data;

  let avatarUrl: string | null | undefined = formData.get("existingAvatar")?.toString() ?? undefined;
  let avatarPath: string | null | undefined = formData.get("existingAvatarPath")?.toString() ?? undefined;

  const avatarFile = formData.get("avatar");
  if (avatarFile instanceof File && avatarFile.size > 0) {
    if (avatarFile.size > 5 * 1024 * 1024) {
      return { success: false, message: "Profil fotoğrafı 5MB boyutunu aşamaz." };
    }
    const arrayBuffer = await avatarFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileExt = avatarFile.name.includes(".") ? avatarFile.name.split(".").pop() ?? "jpg" : "jpg";
    const storagePath = `${session.user.id}/${randomUUID()}.${fileExt.toLowerCase()}`;

    const { error: uploadError } = await supabaseAdmin.storage.from("avatars").upload(storagePath, buffer, {
      cacheControl: "3600",
      upsert: true,
      contentType: avatarFile.type || "image/jpeg"
    });

    if (uploadError) {
      console.error("Avatar upload failed:", uploadError);
      return { success: false, message: "Profil fotoğrafı yüklenemedi." };
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from("avatars").getPublicUrl(storagePath);
    avatarUrl = publicUrlData?.publicUrl ?? null;
    avatarPath = storagePath;
  }

  const updatePayload: Record<string, unknown> = {
    name,
    email,
    phone: phone ?? null,
    bio: bio ?? null
  };

  if (avatarUrl !== undefined) {
    updatePayload.photo_url = avatarUrl;
  }
  if (avatarPath !== undefined) {
    updatePayload.photo_path = avatarPath;
  }

  const { error } = await supabaseAdmin
    .from("users")
    .update(updatePayload)
    .eq("id", session.user.id);

  if (error) {
    console.error("Profile update failed:", error);
    const message =
      error.code === "23505"
        ? "Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor."
        : "Profil güncellenirken bir hata oluştu.";
    return { success: false, message };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/clients");

  return { success: true, message: "Profil bilgileri güncellendi." };
}
