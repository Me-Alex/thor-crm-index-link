import type {
  CanonicalFieldChoice,
  CanonicalFieldObservation,
  NormalizedListingObservation,
  PropertyType,
  RawListingObservation,
  TransactionType
} from "./types";

const DIACRITICS: Record<string, string> = {
  ă: "a",
  â: "a",
  î: "i",
  ș: "s",
  ş: "s",
  ț: "t",
  ţ: "t"
};

export function normalizeListingObservation(raw: RawListingObservation): NormalizedListingObservation {
  const title = normalizeWhitespace(raw.title);
  const description = normalizeWhitespace(raw.description ?? "");
  const city = normalizeLocation(raw.cityText);
  const district = normalizeLocation(raw.districtText);
  const neighborhood = normalizeLocation(raw.neighborhoodText);
  const agentName = normalizeWhitespace(raw.agentNameText ?? "") || undefined;
  const priceEur = parsePriceEur(raw.priceText);
  const areaSqm = parseDecimal(raw.areaText);
  const rooms = parseInteger(raw.roomsText);
  const floor = parseFloor(raw.floorText);
  const propertyType = normalizePropertyType(raw.propertyTypeText, title);
  const transactionType = normalizeTransactionType(raw.transactionTypeText, title);
  const searchText = normalizeSearchText([title, description, city, district, neighborhood].filter(Boolean).join(" "));
  const contentFingerprint = fingerprint([
    raw.sourceId,
    raw.sourceListingId ?? "",
    raw.url,
    title,
    priceEur ?? "",
    areaSqm ?? "",
    rooms ?? "",
    city ?? "",
    district ?? "",
    neighborhood ?? ""
  ].join("|"));

  const normalized: NormalizedListingObservation = {
    sourceId: raw.sourceId,
    url: raw.url,
    title,
    description,
    propertyType,
    transactionType,
    contentFingerprint,
    searchText,
    observedAt: raw.observedAt ?? new Date().toISOString()
  };

  if (raw.sourceListingId) normalized.sourceListingId = raw.sourceListingId;
  if (priceEur !== undefined) normalized.priceEur = priceEur;
  if (areaSqm !== undefined) normalized.areaSqm = areaSqm;
  if (rooms !== undefined) normalized.rooms = rooms;
  if (city) normalized.city = city;
  if (district) normalized.district = district;
  if (neighborhood) normalized.neighborhood = neighborhood;
  if (floor !== undefined) normalized.floor = floor;
  if (agentName) normalized.agentName = agentName;
  if (raw.phoneHash) normalized.phoneHash = raw.phoneHash;

  return normalized;
}

export function chooseCanonicalField<T>(observations: CanonicalFieldObservation<T>[]): CanonicalFieldChoice<T> | undefined {
  const candidates = observations
    .filter((item): item is CanonicalFieldObservation<T> & { value: T } => item.value !== undefined)
    .slice()
    .sort((left, right) => {
      if (right.confidence !== left.confidence) {
        return right.confidence - left.confidence;
      }
      return Date.parse(right.observedAt) - Date.parse(left.observedAt);
    });

  const selected = candidates[0];
  if (!selected) {
    return undefined;
  }

  return {
    value: selected.value,
    sourceId: selected.sourceId,
    confidence: selected.confidence
  };
}

export function normalizeSearchText(value: string): string {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeLocation(value: string | undefined): string | undefined {
  const normalized = normalizeSearchText(value ?? "");
  return normalized || undefined;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripDiacritics(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ăâîșşțţ]/g, (letter) => DIACRITICS[letter] ?? letter);
}

function parsePriceEur(value: string | undefined): number | undefined {
  const normalized = normalizeSearchText(value ?? "");
  if (!normalized || normalized.includes("cerere")) {
    return undefined;
  }
  return parseDecimal(value);
}

function parseDecimal(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const match = value.match(/\d[\d\s.,]*/);
  if (!match) {
    return undefined;
  }

  const compact = match[0].replace(/\s/g, "");
  const decimalComma = /,\d{1,2}$/.test(compact);
  const decimalDot = /\.\d{1,2}$/.test(compact) && !compact.includes(",");
  const normalized = compact
    .replace(decimalComma ? /\./g : /[.,](?=\d{3}(\D|$))/g, "")
    .replace(decimalComma ? "," : decimalDot ? "" : ",", ".");
  const parsed = Number.parseFloat(normalized);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseInteger(value: string | undefined): number | undefined {
  const parsed = parseDecimal(value);
  return parsed === undefined ? undefined : Math.trunc(parsed);
}

function parseFloor(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const lower = normalizeSearchText(value);
  if (lower.includes("parter")) {
    return 0;
  }

  return parseInteger(value);
}

function normalizePropertyType(value: string | undefined, fallback: string): PropertyType {
  const text = normalizeSearchText(`${value ?? ""} ${fallback}`);
  if (/\b(apartament|garsoniera|studio)\b/.test(text)) {
    return "apartment";
  }
  if (/\b(casa|vila|duplex)\b/.test(text)) {
    return "house";
  }
  if (/\b(teren|parcel[aă])\b/.test(text)) {
    return "land";
  }
  if (/\b(spatiu|birou|comercial|hale|depozit)\b/.test(text)) {
    return "commercial";
  }
  return "other";
}

function normalizeTransactionType(value: string | undefined, fallback: string): TransactionType {
  const text = normalizeSearchText(`${value ?? ""} ${fallback}`);
  return /\b(inchiriere|inchiriat|chirie|rent)\b/.test(text) ? "rent" : "sale";
}

function fingerprint(value: string): string {
  const bytes = new TextEncoder().encode(value);
  const seeds = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35, 0x27d4eb2f, 0x165667b1, 0xd3a2646c, 0xfd7046c5];

  return seeds
    .map((seed) => {
      let hash = seed;
      for (const byte of bytes) {
        hash ^= byte;
        hash = Math.imul(hash, 0x01000193);
      }
      return (hash >>> 0).toString(16).padStart(8, "0");
    })
    .join("");
}
