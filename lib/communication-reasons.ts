export interface CommunicationReason {
  id: string;
  label: string;
  description?: string;
}

export const COMMUNICATION_REASONS: CommunicationReason[] = [
  {
    id: "policy-update",
    label: "BES Poliçe Bilgilendirme",
    description: "Poliçe değişikliği, katkı payı artışı veya avantajlı kampanyaları duyurun."
  },
  {
    id: "birthday",
    label: "Doğum Günü Kutlaması",
    description: "Müşterilerin özel günlerinde kutlama mesajı gönderin."
  },
  {
    id: "renewal-reminder",
    label: "Katkı Payı Hatırlatma",
    description: "Ödeme tarihi yaklaşan müşteriler için hatırlatma paylaşın."
  },
  {
    id: "performance",
    label: "Fon Performansı Özeti",
    description: "Son dönem performans değişikliklerini özetleyin."
  }
];

const reasonMap = new Map(COMMUNICATION_REASONS.map((reason) => [reason.id, reason.label]));

export function formatReasonLabels(ids: string[]): string {
  if (!ids || ids.length === 0) {
    return "Genel iletişim";
  }
  return ids
    .map((id) => reasonMap.get(id) ?? id)
    .filter(Boolean)
    .join(", ");
}
