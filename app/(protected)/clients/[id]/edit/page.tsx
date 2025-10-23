import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function EditClientPage({ params }: PageProps) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  redirect(`/clients/${params.id}`);
}
