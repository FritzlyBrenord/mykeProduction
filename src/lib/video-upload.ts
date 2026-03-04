import type { SupabaseClient } from "@supabase/supabase-js";

const KB = 1024;
const MB = KB * KB;
const GB = MB * KB;

const DEFAULT_MAX_UPLOAD_BYTES = 5 * GB;
const DEFAULT_BUCKET_LIMIT_BYTES = 5 * GB;

const DEFAULT_ALLOWED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-matroska",
  "video/x-msvideo",
  "video/mpeg",
  "video/mp2t",
];

function parseBytes(rawValue: string | undefined, fallback: number) {
  if (!rawValue) return fallback;
  const value = rawValue.trim().toLowerCase();
  if (!value) return fallback;

  const plainNumber = Number(value);
  if (Number.isFinite(plainNumber) && plainNumber > 0) {
    return Math.floor(plainNumber);
  }

  const match = value.match(/^(\d+(?:\.\d+)?)\s*(kb|mb|gb)$/i);
  if (!match) return fallback;

  const numericPart = Number(match[1]);
  if (!Number.isFinite(numericPart) || numericPart <= 0) return fallback;

  const unit = match[2].toLowerCase();
  const multiplier = unit === "kb" ? KB : unit === "mb" ? MB : GB;
  return Math.floor(numericPart * multiplier);
}

export const VIDEO_MAX_UPLOAD_BYTES = parseBytes(
  process.env.VIDEO_MAX_UPLOAD_BYTES,
  DEFAULT_MAX_UPLOAD_BYTES,
);

export const VIDEO_BUCKET_FILE_SIZE_LIMIT_BYTES = parseBytes(
  process.env.VIDEO_BUCKET_FILE_SIZE_LIMIT_BYTES,
  DEFAULT_BUCKET_LIMIT_BYTES,
);

export const VIDEO_ALLOWED_MIME_TYPES = DEFAULT_ALLOWED_VIDEO_MIME_TYPES;

let ensureBucketPromise: Promise<void> | null = null;

export function formatBytes(bytes: number) {
  if (bytes >= GB) return `${(bytes / GB).toFixed(2)} GB`;
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
  if (bytes >= KB) return `${(bytes / KB).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function sanitizeStorageSegment(value: string | null | undefined) {
  if (!value) return "general";
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || "general";
}

export function getSafeVideoExtension(fileName: string) {
  const ext = (fileName.split(".").pop() || "mp4")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return ext || "mp4";
}

export function isStoragePayloadTooLargeError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const record = error as {
    status?: number;
    statusCode?: number | string;
    message?: string;
  };
  if (record.status === 413 || String(record.statusCode) === "413") return true;
  if (
    typeof record.message === "string" &&
    /exceeded the maximum allowed size|payload too large/i.test(record.message)
  ) {
    return true;
  }
  return false;
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}

export async function ensureVideosBucketConfig(supabase: SupabaseClient) {
  if (!ensureBucketPromise) {
    ensureBucketPromise = (async () => {
      const { error } = await supabase.storage.updateBucket("videos", {
        public: true,
        fileSizeLimit: VIDEO_BUCKET_FILE_SIZE_LIMIT_BYTES,
        allowedMimeTypes: VIDEO_ALLOWED_MIME_TYPES,
      });

      if (error) {
        console.warn("Unable to update videos bucket settings:", error.message);
      }
    })().finally(() => {
      ensureBucketPromise = null;
    });
  }

  await ensureBucketPromise;
}
