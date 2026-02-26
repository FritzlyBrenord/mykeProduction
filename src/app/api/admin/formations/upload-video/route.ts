import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {  supabaseAdmin  } from '@/lib/supabase-admin';

const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024; // 500MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const formationId = String(formData.get('formationId') || 'general');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Video file is required' }, { status: 400 });
    }

    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'Only video files are allowed' }, { status: 400 });
    }

    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      return NextResponse.json({ error: 'Video exceeds 500MB limit' }, { status: 400 });
    }

    const ext = (file.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '');
    const safeExt = ext || 'mp4';
    const filePath = `formations/${formationId}/${randomUUID()}.${safeExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from('videos')
      .upload(filePath, buffer, {
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
  } catch (error: any) {
    console.error('Formation video upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload video' },
      { status: 500 }
    );
  }
}
