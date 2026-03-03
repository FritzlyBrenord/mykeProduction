import { Produit } from "@/lib/types";

const VALID_PRODUCT_TYPES = new Set<Produit["type"]>([
  "chimique",
  "document",
  "autre",
]);

function isHttpUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

function coerceString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeProductType(value: unknown): Produit["type"] {
  const candidate = coerceString(value).toLowerCase();
  if (VALID_PRODUCT_TYPES.has(candidate as Produit["type"])) {
    return candidate as Produit["type"];
  }
  return "autre";
}

export function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => coerceString(item))
      .filter((item) => item.length > 0);
  }

  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => coerceString(item))
          .filter((item) => item.length > 0);
      }
    } catch {
      // fall back to plain string parsing
    }
  }

  return trimmed
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function normalizeProductImageUrl(value: unknown): string | null {
  const src = coerceString(value);
  if (!src) return null;
  if (src.startsWith("/")) return src;
  if (isHttpUrl(src)) return src;
  return null;
}

export function getPrimaryProductImage(images: unknown): string | null {
  const list = normalizeStringArray(images);
  for (const image of list) {
    const normalized = normalizeProductImageUrl(image);
    if (normalized) return normalized;
  }
  return null;
}

export function normalizeProductRecord<T extends Record<string, unknown>>(record: T): T {
  return {
    ...record,
    type: normalizeProductType(record.type),
    images: normalizeStringArray(record.images),
  };
}

