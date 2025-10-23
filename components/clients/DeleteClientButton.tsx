"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteClient } from "@/app/(protected)/clients/actions";

interface Props {
  clientId: string;
  clientName: string;
}

export function DeleteClientButton({ clientId, clientName }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    const confirmed = window.confirm(
      `${clientName} adlı müşteriyi kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
    );
    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deleteClient(clientId);
      if (result.success) {
        router.push("/clients");
        router.refresh();
      } else {
        alert(result.message);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      style={{
        padding: "0.75rem 1.5rem",
        borderRadius: "999px",
        border: "1px solid rgba(220, 38, 38, 0.4)",
        background: "rgba(220, 38, 38, 0.1)",
        color: "#b91c1c",
        fontWeight: 600,
        cursor: "pointer",
        opacity: isPending ? 0.7 : 1
      }}
    >
      {isPending ? "Siliniyor..." : "Müşteriyi sil"}
    </button>
  );
}
