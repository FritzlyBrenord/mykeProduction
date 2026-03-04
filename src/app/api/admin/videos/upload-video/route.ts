import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  ensureVideosBucketConfig,
  formatBytes,
  getErrorMessage,
  getSafeVideoExtension,
  isStoragePayloadTooLargeError,
  VIDEO_BUCKET_FILE_SIZE_LIMIT_BYTES,
  VIDEO_MAX_UPLOAD_BYTES,
} from '@/lib/video-upload';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Video file is required' }, { status: 400 });
    }

    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'Only video files are allowed' }, { status: 400 });
    }

    if (file.size > VIDEO_MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `Video exceeds application limit (${formatBytes(VIDEO_MAX_UPLOAD_BYTES)}).` },
        { status: 413 },
      );
    }

    await ensureVideosBucketConfig(supabaseAdmin);

    const safeExt = getSafeVideoExtension(file.name);
    const filePath = `videos/${randomUUID()}.${safeExt}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('videos')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: publicData } = supabaseAdmin.storage.from('videos').getPublicUrl(filePath);
    const publicUrl = publicData.publicUrl;

    return NextResponse.json({
      path: filePath,
      url: publicUrl,
      contentType: file.type,
      size: file.size,
    });
  } catch (error: unknown) {
    console.error('Video upload error:', error);

    if (isStoragePayloadTooLargeError(error)) {
      return NextResponse.json(
        {
          error: `The uploaded file exceeds your Supabase bucket limit. Current target limit: ${formatBytes(
            VIDEO_BUCKET_FILE_SIZE_LIMIT_BYTES,
          )}.`,
        },
        { status: 413 },
      );
    }

    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to upload video') },
      { status: 500 }
    );
  }
}
