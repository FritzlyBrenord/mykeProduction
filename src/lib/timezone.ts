import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export interface TimezoneOption {
  value: string;
  label: string;
}

export const DEFAULT_TIMEZONE = "UTC";

export const TIMEZONE_OPTIONS: ReadonlyArray<TimezoneOption> = [
  { value: "UTC", label: "UTC (GMT)" },
  { value: "America/Port-au-Prince", label: "America/Port-au-Prince (GMT-5/-4)" },
  { value: "Europe/Paris", label: "Europe/Paris (GMT+1/+2)" },
  { value: "Europe/London", label: "Europe/London (GMT+0/+1)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (GMT+1/+2)" },
  { value: "Europe/Madrid", label: "Europe/Madrid (GMT+1/+2)" },
  { value: "America/New_York", label: "America/New_York (EST/EDT)" },
  { value: "America/Chicago", label: "America/Chicago (CST/CDT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai (CST)" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok (ICT)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEDT/AEST)" },
];

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}

function getSafeTimezone(timezone?: string | null): string {
  return timezone || DEFAULT_TIMEZONE;
}

function parseDatetimeLocal(dateStr: string): Date | null {
  const [datePart, timePart] = dateStr.split("T");
  if (!datePart || !timePart) return null;

  const [yearRaw, monthRaw, dayRaw] = datePart.split("-");
  const [hourRaw, minuteRaw] = timePart.split(":");

  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if ([year, month, day, hour, minute].some((part) => Number.isNaN(part))) {
    return null;
  }

  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

export function convertLocalDateToUTC(dateStr: string, timezone: string): string {
  if (!dateStr) return "";

  const parsedLocalDate = parseDatetimeLocal(dateStr);
  if (!parsedLocalDate || !isValidDate(parsedLocalDate)) return "";

  try {
    const utcDate = fromZonedTime(parsedLocalDate, getSafeTimezone(timezone));
    return utcDate.toISOString();
  } catch (error) {
    console.error("convertLocalDateToUTC error:", error);
    return "";
  }
}

export function convertUTCToLocalDateString(
  utcDateStr: string,
  timezone: string,
): string {
  if (!utcDateStr) return "";

  const utcDate = new Date(utcDateStr);
  if (!isValidDate(utcDate)) return "";

  try {
    return formatInTimeZone(
      utcDate,
      getSafeTimezone(timezone),
      "yyyy-MM-dd'T'HH:mm",
    );
  } catch (error) {
    console.error("convertUTCToLocalDateString error:", error);
    return "";
  }
}

export function formatUTCDateInTimeZone(
  utcDateStr: string,
  timezone: string,
  includeSeconds = false,
): string {
  if (!utcDateStr) return "";

  const utcDate = new Date(utcDateStr);
  if (!isValidDate(utcDate)) return "";

  const pattern = includeSeconds ? "dd/MM/yyyy 'a' HH:mm:ss" : "dd/MM/yyyy 'a' HH:mm";

  try {
    return formatInTimeZone(utcDate, getSafeTimezone(timezone), pattern);
  } catch (error) {
    console.error("formatUTCDateInTimeZone error:", error);
    return "";
  }
}
