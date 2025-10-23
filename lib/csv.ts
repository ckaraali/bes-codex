import { z } from "zod";

const besRowSchema = z.object({
  name: z.string().min(1, "Ad soyad boş olamaz."),
  email: z.string().email("Geçerli bir e-posta adresi gerekli."),
  phone: z.string().optional(),
  birthDate: z.date().optional(),
  firstSavings: z.number().min(0, "İlk tasarruf tutarı 0'dan küçük olamaz."),
  currentSavings: z.number().min(0, "Güncel tasarruf tutarı 0'dan küçük olamaz.")
});

const elementerRowSchema = z.object({
  name: z.string().min(1, "Müşteri adı boş olamaz."),
  email: z.string().email("Geçerli bir e-posta adresi gerekli."),
  phone: z.string().optional(),
  policyType: z.string().min(1, "Poliçe türü gerekli."),
  policyStartDate: z.date({ required_error: "Poliçe başlangıç tarihi gerekli." }),
  policyEndDate: z.date({ required_error: "Poliçe bitiş tarihi gerekli." })
});

export type ClientCsvRow = z.infer<typeof besRowSchema>;
export type ElementerCsvRow = z.infer<typeof elementerRowSchema>;

export function parseClientCsv(content: string): ClientCsvRow[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error("CSV dosyasında başlık satırı ve en az bir kayıt bulunmalıdır.");
  }

  const headerRaw = lines[0];
  const delimiter = headerRaw.includes(";") ? ";" : ",";
  const headerCells = splitRow(headerRaw, delimiter);
  const headerMap = headerCells.map((cell) => mapBesHeader(normaliseHeader(cell)));

  type FieldKey = "name" | "email" | "phone" | "birthDate" | "firstSavings" | "currentSavings";
  const fieldPositions: Record<FieldKey, number | null> = {
    name: null,
    email: null,
    phone: null,
    birthDate: null,
    firstSavings: null,
    currentSavings: null
  };

  headerMap.forEach((field, index) => {
    if (!field || field === "ignore") {
      return;
    }
    if (fieldPositions[field] === null) {
      fieldPositions[field] = index;
    }
  });

  const missingFields = (["name", "email", "firstSavings", "currentSavings"] as const).filter(
    (field) => fieldPositions[field] === null
  );

  if (missingFields.length > 0) {
    const labels = missingFields
      .map((field) => {
        switch (field) {
          case "name":
            return "Ad Soyad";
          case "email":
            return "E-posta";
          case "firstSavings":
            return "İlk Tasarruf";
          case "currentSavings":
            return "Güncel Tasarruf";
          default:
            return field;
        }
      })
      .join(", ");
    throw new Error(
      `Başlıklar eksik veya tanınmadı. Dosya en azından ${labels} kolonlarını içermelidir. (Mevcut başlık satırı: ${lines[0]})`
    );
  }

  const rows: ClientCsvRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const raw = lines[i];
    if (!raw) continue;
    const parts = splitRow(raw, delimiter);
    if (parts.every((part) => part.trim().length === 0)) {
      continue;
    }

    const getValue = (field: FieldKey) => {
      const index = fieldPositions[field];
      if (index === null || index >= parts.length) {
        return "";
      }
      return cleanValue(parts[index]);
    };

    const name = getValue("name");
    const email = sanitiseEmail(getValue("email"));
    const phone = getValue("phone") || undefined;
    const birthDateStr = getValue("birthDate");
    const birthDate = birthDateStr ? parseDate(birthDateStr) : undefined;

    if (!name && !email) {
      continue;
    }

    const nameKey = normaliseHeader(name);
    const emailKey = normaliseHeader(email);
    if (
      ["adsoyad", "isim", "advesoyad", "musteriadsoyad"].includes(nameKey) ||
      ["eposta", "email"].includes(emailKey)
    ) {
      // Fazladan başlık satırlarını yoksay.
      continue;
    }

    const parsed = besRowSchema.safeParse({
      name,
      email,
      phone,
      birthDate,
      firstSavings: normaliseNumber(getValue("firstSavings")),
      currentSavings: normaliseNumber(getValue("currentSavings"))
    });

    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => issue.message).join(", ");
      throw new Error(`Satır ${i + 1}: ${message}`);
    }

    rows.push(parsed.data);
  }

  return rows;
}

export function parseElementerCsv(content: string): ElementerCsvRow[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error("CSV dosyasında başlık satırı ve en az bir kayıt bulunmalıdır.");
  }

  const headerRaw = lines[0];
  const delimiter = headerRaw.includes(";") ? ";" : ",";
  const headerCells = splitRow(headerRaw, delimiter);
  const headerMap = headerCells.map((cell) => mapElementerHeader(normaliseHeader(cell)));

  type FieldKey = "name" | "email" | "phone" | "policyType" | "policyStartDate" | "policyEndDate";
  const fieldPositions: Record<FieldKey, number | null> = {
    name: null,
    email: null,
    phone: null,
    policyType: null,
    policyStartDate: null,
    policyEndDate: null
  };

  headerMap.forEach((field, index) => {
    if (!field || field === "ignore") {
      return;
    }
    if (fieldPositions[field] === null) {
      fieldPositions[field] = index;
    }
  });

  const missingFields = (["name", "email", "policyType", "policyStartDate", "policyEndDate"] as const).filter(
    (field) => fieldPositions[field] === null
  );

  if (missingFields.length > 0) {
    const labels = missingFields
      .map((field) => {
        switch (field) {
          case "name":
            return "Kişi";
          case "email":
            return "E-posta";
          case "policyType":
            return "Poliçe Türü";
          case "policyStartDate":
            return "Poliçe Başlangıç Tarihi";
          case "policyEndDate":
            return "Poliçe Bitiş Tarihi";
          default:
            return field;
        }
      })
      .join(", ");
    throw new Error(
      `Başlıklar eksik veya tanınmadı. Dosya en azından ${labels} kolonlarını içermelidir. (Mevcut başlık satırı: ${lines[0]})`
    );
  }

  const rows: ElementerCsvRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const raw = lines[i];
    if (!raw) continue;
    const parts = splitRow(raw, delimiter);
    if (parts.every((part) => part.trim().length === 0)) {
      continue;
    }

    const getValue = (field: FieldKey) => {
      const index = fieldPositions[field];
      if (index === null || index >= parts.length) {
        return "";
      }
      return cleanValue(parts[index]);
    };

    const name = getValue("name");
    const email = sanitiseEmail(getValue("email"));
    const phone = getValue("phone") || undefined;
    const policyType = getValue("policyType");
    const policyStartDateStr = getValue("policyStartDate");
    const policyEndDateStr = getValue("policyEndDate");

    if (!name && !email) {
      continue;
    }

    const parsedStart = parseDate(policyStartDateStr);
    const parsedEnd = parseDate(policyEndDateStr);

    const parsed = elementerRowSchema.safeParse({
      name,
      email,
      phone,
      policyType,
      policyStartDate: parsedStart,
      policyEndDate: parsedEnd
    });

    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => issue.message).join(", ");
      throw new Error(`Satır ${i + 1}: ${message}`);
    }

    rows.push(parsed.data);
  }

  return rows;
}

function normaliseHeader(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/\s+/g, "")
    .replace(/[-_.]/g, "");
}

function mapBesHeader(
  value: string
): "name" | "email" | "phone" | "birthDate" | "firstSavings" | "currentSavings" | "ignore" | null {
  const mapping: Record<string, "name" | "email" | "phone" | "birthDate" | "firstSavings" | "currentSavings" | "ignore"> = {
    name: "name",
    isim: "name",
    ad: "name",
    adsoyad: "name",
    adivesoyadi: "name",
    soyisim: "name",
    email: "email",
    mail: "email",
    eposta: "email",
    epostaadres: "email",
    telefon: "phone",
    phone: "phone",
    tel: "phone",
    gsm: "phone",
    dogumtarihi: "birthDate",
    dogumgunu: "birthDate",
    birthdate: "birthDate",
    birthday: "birthDate",
    tarih: "birthDate",
    firstsavings: "firstSavings",
    ilktasarruf: "firstSavings",
    ilktasarruftutari: "firstSavings",
    ilkbirikim: "firstSavings",
    currentsavings: "currentSavings",
    gunceltasarruf: "currentSavings",
    gunceltasarruftutari: "currentSavings",
    mevcuttasarruf: "currentSavings",
    mevcutsaving: "currentSavings",
    aktarimtarihi: "ignore",
    aktarim: "ignore",
    aktarimtar: "ignore",
    aktarimtarih: "ignore",
    aktarimtarihii: "ignore",
    aylikodeme: "ignore",
    aylikodemesi: "ignore",
    aylikodemetutari: "ignore",
    odemetutari: "ignore",
    tutar: "ignore"
  };

  return mapping[value] ?? null;
}

function mapElementerHeader(
  value: string
): "name" | "email" | "phone" | "policyType" | "policyStartDate" | "policyEndDate" | "ignore" | null {
  const mapping: Record<
    string,
    "name" | "email" | "phone" | "policyType" | "policyStartDate" | "policyEndDate" | "ignore"
  > = {
    name: "name",
    isim: "name",
    kisi: "name",
    musteri: "name",
    adsoyad: "name",
    adivesoyadi: "name",
    email: "email",
    mail: "email",
    eposta: "email",
    epostaadres: "email",
    telefon: "phone",
    phone: "phone",
    tel: "phone",
    gsm: "phone",
    policeturu: "policyType",
    policetur: "policyType",
    policetip: "policyType",
    policedurumu: "policyType",
    sigortaturu: "policyType",
    policenot: "ignore",
    policeno: "ignore",
    policenumarasi: "ignore",
    policenumarasiid: "ignore",
    policenumber: "ignore",
    policestart: "policyStartDate",
    policestartdate: "policyStartDate",
    policebaslangic: "policyStartDate",
    policebaslangictarihi: "policyStartDate",
    baslangictarihi: "policyStartDate",
    baslangic: "policyStartDate",
    policend: "policyEndDate",
    policebitis: "policyEndDate",
    policebitistarihi: "policyEndDate",
    bitistarihi: "policyEndDate",
    bitis: "policyEndDate",
    policekapsami: "ignore",
    kapsam: "ignore"
  };

  return mapping[value] ?? null;
}

function splitRow(row: string, delimiter: string) {
  return row.split(delimiter);
}

function cleanValue(value: string) {
  return value.replace(/^"+|"+$/g, "").trim();
}

function sanitiseEmail(value: string) {
  const cleaned = value.replace(/\s+/g, "").replace(/,/g, ".").toLowerCase();
  return cleaned;
}

function normaliseNumber(raw: string): number {
  const cleaned = raw.replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) return NaN;

  const commaCount = (cleaned.match(/,/g) ?? []).length;
  const dotCount = (cleaned.match(/\./g) ?? []).length;

  if (commaCount && dotCount) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    if (lastComma > lastDot) {
      const withoutThousands = cleaned.replace(/\./g, "");
      return Number(withoutThousands.replace(",", "."));
    }
    const withoutThousands = cleaned.replace(/,/g, "");
    return Number(withoutThousands.replace(/\./g, "."));
  }

  if (commaCount) {
    if (commaCount > 1) {
      return Number(cleaned.replace(/,/g, ""));
    }
    return Number(cleaned.replace(",", "."));
  }

  if (dotCount) {
    const thousandsPattern = /^\d{1,3}(\.\d{3})+$/;
    if (thousandsPattern.test(cleaned) || dotCount > 1) {
      return Number(cleaned.replace(/\./g, ""));
    }
  }

  return Number(cleaned);
}

function parseDate(dateStr: string): Date | undefined {
  if (!dateStr.trim()) return undefined;
  
  // Try different date formats
  const formats = [
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, // DD.MM.YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      let day, month, year;
      if (format === formats[2]) { // YYYY-MM-DD
        [, year, month, day] = match;
      } else { // DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY
        [, day, month, year] = match;
      }
      
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  return undefined;
}
