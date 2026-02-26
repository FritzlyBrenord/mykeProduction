import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {  supabaseAdmin  } from '@/lib/supabase-admin';

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const BUCKET_NAME = 'images';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Image exceeds 10MB limit' }, { status: 500 });
    }

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const safeExt = ext || 'jpg';
    const filePath = `formations/${randomUUID()}.${safeExt}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Generate public URL
    const { data: publicData } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    // Verify the URL is correct
    if (!publicData?.publicUrl) {
      throw new Error('Failed to generate public URL for uploaded image');
    }

    return NextResponse.json({
      path: filePath,
      url: publicData.publicUrl,
      contentType: file.type,
      size: file.size,
    });
  } catch (error: any) {
    console.error('Formation image upload error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to upload image' },
      { status: 500 }
    );
  }
}
