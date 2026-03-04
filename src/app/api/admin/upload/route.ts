import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  ensureVideosBucketConfig,
  formatBytes,
  getErrorMessage,
  isStoragePayloadTooLargeError,
  VIDEO_MAX_UPLOAD_BYTES,
} from "@/lib/video-upload";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const folder = (formData.get("folder") as string) || "general";
    const files = formData.getAll("file") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploadPromises = files.map(async (file) => {
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      let bucketName = "images";
      if (folder === "documents") {
        bucketName = "documents";
      } else if (folder === "videos") {
        bucketName = "videos";
        if (!file.type.startsWith("video/")) {
          throw new Error("Only video files are allowed");
        }
        if (file.size > VIDEO_MAX_UPLOAD_BYTES) {
          throw new Error(
            `Video exceeds application limit (${formatBytes(VIDEO_MAX_UPLOAD_BYTES)}).`,
          );
        }
        await ensureVideosBucketConfig(supabaseAdmin);
      }

      const { error } = await supabaseAdmin.storage.from(bucketName).upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

      if (error) throw error;

      const { data: publicUrl } = supabaseAdmin.storage.from(bucketName).getPublicUrl(filePath);

      return {
        url: publicUrl.publicUrl,
        path: filePath,
        bucket: bucketName,
      };
    });

    const filesData = await Promise.all(uploadPromises);
    const urls = filesData.map((file) => file.url);

    return NextResponse.json({ urls, files: filesData });
  } catch (error: unknown) {
    console.error("Upload error:", error);

    if (isStoragePayloadTooLargeError(error)) {
      return NextResponse.json(
        { error: "Uploaded file exceeds current bucket size limit." },
        { status: 413 },
      );
    }

    return NextResponse.json(
      { error: "Failed to upload files", details: getErrorMessage(error, "Failed to upload files") },
      { status: 500 },
    );
  }
}
