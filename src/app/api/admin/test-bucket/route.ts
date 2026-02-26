import { NextRequest, NextResponse } from 'next/server';
import {  supabaseAdmin  } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    // Test 1: List files in images bucket
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from('images')
      .list('formations', { limit: 5, offset: 0 });

    // Test 2: Try to get a public URL
    const testPath = 'formations/test.jpg';
    const { data: publicUrl } = supabaseAdmin.storage
      .from('images')
      .getPublicUrl(testPath);

    // Test 3: Check bucket info
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      buckets: {
        list: buckets,
        error: bucketsError?.message,
      },
      formationImages: {
        files: files?.slice(0, 3),
        error: listError?.message,
      },
      publicUrlTest: {
        path: testPath,
        url: publicUrl?.publicUrl,
      },
      hints: [
        'Check if images bucket is public: RLS disabled and Public access enabled',
        'Check CORS settings in Supabase Storage',
        'Verify image file permissions',
      ],
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: error?.message || 'Test failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
