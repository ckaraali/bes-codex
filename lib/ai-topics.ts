export interface AiTopic {
  id: string;
  label: string;
  description: string;
  instruction: string;
}

export const AI_MARKET_TOPICS: AiTopic[] = [
  {
    id: "bist",
    label: "BIST 100",
    description: "Borsa İstanbul endeksinin son 1 aylık performansı",
    instruction: "Borsa İstanbul (BIST 100) endeksinin son 1 aylık puan ve yüzde değişimini, varsa önemli haberi özetle"
  },
  {
    id: "usdtry",
    label: "USD/TRY",
    description: "Dolar/TL kurundaki son 1 aylık değişim",
    instruction: "USD/TRY kurunun son 1 aylık seviyesini ve yüzde değişimini açıkla"
  },
  {
    id: "eurusd",
    label: "EUR/USD",
    description: "Euro/Dolar paritesi",
    instruction: "EUR/USD paritesinin son 1 aylık seyrini ve temel etkenleri özetle"
  },
  {
    id: "gold",
    label: "Altın",
    description: "Ons veya gram altın fiyatı",
    instruction: "Altın fiyatlarının (ons ve/veya gram) son 1 ayda nasıl değiştiğini belirt"
  },
  {
    id: "bitcoin",
    label: "Bitcoin",
    description: "Bitcoin fiyatındaki son 1 aylık değişim",
    instruction: "Bitcoin fiyatının son 1 aylık performansını ve ana başlıkları özetle"
  },
  {
    id: "ethereum",
    label: "Ethereum",
    description: "Ethereum fiyatındaki son 1 aylık değişim",
    instruction: "Ethereum fiyatının son 1 aydaki hareketini ve öne çıkan haberi paylaş"
  }
];
