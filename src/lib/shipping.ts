export interface ShippingRule {
  id?: string;
  country_code: string;
  country_name: string;
  base_fee: number;
  free_threshold: number;
  is_active: boolean;
  priority: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ShippingCountryOption {
  code: string;
  label: string;
}

export interface ShippingQuote {
  rule: ShippingRule | null;
  shippingCost: number;
  appliedCountryCode: string;
  isFallbackRule: boolean;
  hasMatchingRule: boolean;
}

export const SHIPPING_DEFAULT_COUNTRY_CODE = "default";
export const SHIPPING_DEFAULT_COUNTRY_NAME = "Regle globale";

export const SHIPPING_COUNTRY_OPTIONS: ShippingCountryOption[] = [
  { code: SHIPPING_DEFAULT_COUNTRY_CODE, label: SHIPPING_DEFAULT_COUNTRY_NAME },
  { code: "HT", label: "Haiti" },
  { code: "DO", label: "Republique dominicaine" },
  { code: "US", label: "Etats-Unis" },
  { code: "CA", label: "Canada" },
  { code: "MX", label: "Mexique" },
  { code: "JM", label: "Jamaique" },
  { code: "TT", label: "Trinite-et-Tobago" },
  { code: "BS", label: "Bahamas" },
  { code: "BB", label: "Barbade" },
  { code: "FR", label: "France" },
  { code: "BE", label: "Belgique" },
  { code: "CH", label: "Suisse" },
  { code: "LU", label: "Luxembourg" },
  { code: "NL", label: "Pays-Bas" },
  { code: "DE", label: "Allemagne" },
  { code: "ES", label: "Espagne" },
  { code: "IT", label: "Italie" },
  { code: "PT", label: "Portugal" },
  { code: "GB", label: "Royaume-Uni" },
  { code: "IE", label: "Irlande" },
  { code: "SE", label: "Suede" },
  { code: "NO", label: "Norvege" },
  { code: "DK", label: "Danemark" },
  { code: "PL", label: "Pologne" },
  { code: "AT", label: "Autriche" },
  { code: "GR", label: "Grece" },
  { code: "MA", label: "Maroc" },
  { code: "TN", label: "Tunisie" },
  { code: "DZ", label: "Algerie" },
  { code: "SN", label: "Senegal" },
  { code: "CI", label: "Cote d'Ivoire" },
  { code: "CM", label: "Cameroun" },
  { code: "NG", label: "Nigeria" },
  { code: "GH", label: "Ghana" },
  { code: "ZA", label: "Afrique du Sud" },
  { code: "BR", label: "Bresil" },
  { code: "AR", label: "Argentine" },
  { code: "CL", label: "Chili" },
  { code: "CO", label: "Colombie" },
  { code: "PE", label: "Perou" },
  { code: "EC", label: "Equateur" },
  { code: "PA", label: "Panama" },
  { code: "CR", label: "Costa Rica" },
  { code: "CN", label: "Chine" },
  { code: "JP", label: "Japon" },
  { code: "KR", label: "Coree du Sud" },
  { code: "IN", label: "Inde" },
  { code: "AE", label: "Emirats arabes unis" },
  { code: "SA", label: "Arabie saoudite" },
  { code: "AU", label: "Australie" },
  { code: "NZ", label: "Nouvelle-Zelande" },
];

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeCountryCode(value: unknown) {
  if (typeof value !== "string") return "";
  const normalized = value.trim().toUpperCase();
  if (normalized === SHIPPING_DEFAULT_COUNTRY_CODE.toUpperCase()) {
    return SHIPPING_DEFAULT_COUNTRY_CODE;
  }
  return /^[A-Z]{2}$/.test(normalized) ? normalized : "";
}

export function getShippingCountryLabel(code: string) {
  const normalized = normalizeCountryCode(code);
  const match = SHIPPING_COUNTRY_OPTIONS.find((option) => option.code === normalized);
  return match?.label ?? normalized;
}

export function normalizeShippingRule(input: Partial<ShippingRule> & Pick<ShippingRule, "country_code">): ShippingRule {
  const countryCode = normalizeCountryCode(input.country_code);
  const normalizedCountryCode = countryCode || SHIPPING_DEFAULT_COUNTRY_CODE;
  return {
    id: input.id,
    country_code: normalizedCountryCode,
    country_name:
      input.country_name?.trim() ||
      getShippingCountryLabel(normalizedCountryCode) ||
      SHIPPING_DEFAULT_COUNTRY_NAME,
    base_fee: Math.max(0, toNumber(input.base_fee, 0)),
    free_threshold: Math.max(0, toNumber(input.free_threshold, 0)),
    is_active:
      normalizedCountryCode === SHIPPING_DEFAULT_COUNTRY_CODE
        ? true
        : input.is_active ?? true,
    priority: Math.max(1, Math.floor(toNumber(input.priority, 9999))),
    created_at: input.created_at ?? null,
    updated_at: input.updated_at ?? null,
  };
}

export function sortShippingRules<T extends Partial<ShippingRule> & Pick<ShippingRule, "country_code">>(
  rules: T[],
) {
  return [...rules]
    .map((rule) => normalizeShippingRule(rule))
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }

      const leftCreated = left.created_at ? new Date(left.created_at).getTime() : 0;
      const rightCreated = right.created_at ? new Date(right.created_at).getTime() : 0;
      if (leftCreated !== rightCreated) {
        return leftCreated - rightCreated;
      }

      return left.country_name.localeCompare(right.country_name, "fr");
    });
}

export function resolveShippingRule(
  rules: Array<Partial<ShippingRule> & Pick<ShippingRule, "country_code">>,
  countryCode: string,
) {
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  const activeRules = sortShippingRules(
    rules.filter((rule) => (rule.is_active ?? true) === true),
  );

  const exactRule = activeRules.find((rule) => rule.country_code === normalizedCountryCode);
  if (exactRule) {
    return {
      rule: exactRule,
      appliedCountryCode: normalizedCountryCode,
      isFallbackRule: false,
    };
  }

  const defaultRule = activeRules.find(
    (rule) => rule.country_code === SHIPPING_DEFAULT_COUNTRY_CODE,
  );

  return {
    rule: defaultRule ?? null,
    appliedCountryCode: defaultRule?.country_code ?? normalizedCountryCode,
    isFallbackRule: Boolean(defaultRule),
  };
}

export function calculateShippingQuote(params: {
  rules: Array<Partial<ShippingRule> & Pick<ShippingRule, "country_code">>;
  countryCode: string;
  physicalSubtotal: number;
  hasPhysicalProducts: boolean;
}) {
  const { rules, countryCode, physicalSubtotal, hasPhysicalProducts } = params;
  const resolved = resolveShippingRule(rules, countryCode);
  const normalizedPhysicalSubtotal = Math.max(0, toNumber(physicalSubtotal, 0));

  if (!hasPhysicalProducts) {
    return {
      rule: resolved.rule,
      shippingCost: 0,
      appliedCountryCode: resolved.appliedCountryCode,
      isFallbackRule: resolved.isFallbackRule,
      hasMatchingRule: Boolean(resolved.rule),
    } satisfies ShippingQuote;
  }

  if (!resolved.rule) {
    return {
      rule: null,
      shippingCost: 0,
      appliedCountryCode: normalizeCountryCode(countryCode),
      isFallbackRule: true,
      hasMatchingRule: false,
    } satisfies ShippingQuote;
  }

  return {
    rule: resolved.rule,
      shippingCost:
      normalizedPhysicalSubtotal >= resolved.rule.free_threshold ? 0 : resolved.rule.base_fee,
    appliedCountryCode: resolved.appliedCountryCode,
    isFallbackRule: resolved.isFallbackRule,
    hasMatchingRule: true,
  } satisfies ShippingQuote;
}

export function extractCountryCodeFromHeaders(headers: Headers) {
  const raw =
    headers.get("x-vercel-ip-country") ||
    headers.get("cf-ipcountry") ||
    headers.get("x-country-code");

  return normalizeCountryCode(raw);
}

export function extractCountryCodeFromAcceptLanguage(headers: Headers) {
  const raw = headers.get("accept-language");
  if (!raw) return "";

  const locales = raw
    .split(",")
    .map((entry) => entry.split(";")[0]?.trim())
    .filter(Boolean);

  for (const locale of locales) {
    const region = locale?.split("-")[1] ?? locale?.split("_")[1];
    const code = normalizeCountryCode(region);
    if (code) return code;
  }

  return "";
}

export function detectCountryCode(headers: Headers) {
  return (
    extractCountryCodeFromHeaders(headers) ||
    extractCountryCodeFromAcceptLanguage(headers)
  );
}
