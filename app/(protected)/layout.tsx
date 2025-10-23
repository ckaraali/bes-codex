import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { ProtectedShell } from "@/components/navigation/ProtectedShell";

export default async function ProtectedLayout({
  children
}: {
  children: ReactNode;
}) {
  const session = await getAuthSession();
  if (!session) {
    redirect("/login");
  }

  return <ProtectedShell userName={session.user?.name}>{children}</ProtectedShell>;
}
