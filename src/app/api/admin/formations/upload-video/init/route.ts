import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  ensureVideosBucketConfig,
  formatBytes,
  getErrorMessage,
  getSafeVideoExtension,
  sanitizeStorageSegment,
  VIDEO_MAX_UPLOAD_BYTES,
} from "@/lib/video-upload";

interface InitUploadBody {
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  formationId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as InitUploadBody;
    const fileName = String(payload.fileName || "");
    const fileType = String(payload.fileType || "");
    const fileSize = Number(payload.fileSize || 0);
    const formationId = sanitizeStorageSegment(payload.formationId || "general");

    if (!fileName) {
      return NextResponse.json({ error: "fileName is required" }, { status: 400 });
    }

    if (!fileType.startsWith("video/")) {
      return NextResponse.json({ error: "Only video files are allowed" }, { status: 400 });
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return NextResponse.json({ error: "Invalid fileSize" }, { status: 400 });
    }

    if (fileSize > VIDEO_MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `Video exceeds application limit (${formatBytes(VIDEO_MAX_UPLOAD_BYTES)}).` },
        { status: 413 },
      );
    }

    await ensureVideosBucketConfig(supabaseAdmin);

    const safeExt = getSafeVideoExtension(fileName);
    const filePath = `formations/${formationId}/${randomUUID()}.${safeExt}`;

    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from("videos")
      .createSignedUploadUrl(filePath, {
        upsert: false,
      });

    if (signedError || !signedData?.signedUrl) {
      throw signedError || new Error("Unable to create signed upload url");
    }

    const { data: publicData } = supabaseAdmin.storage.from("videos").getPublicUrl(filePath);

    return NextResponse.json({
      signedUrl: signedData.signedUrl,
      path: filePath,
      url: publicData.publicUrl,
    });
  } catch (error: unknown) {
    console.error("Formation video signed upload init error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to initialize video upload") },
      { status: 500 },
    );
  }
}
