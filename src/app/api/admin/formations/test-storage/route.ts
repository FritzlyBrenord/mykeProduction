import { NextRequest, NextResponse } from 'next/server';
import {  supabaseAdmin  } from '@/lib/supabase-admin';

/**
 * GET /api/admin/formations/test-storage
 * Diagnostic endpoint to check Supabase storage configuration
 */
export async function GET(request: NextRequest) {
  try {
    const results: any = {
      timestamp: new Date().toISOString(),
      tests: {},
    };

    // Test 1: Check if admin client is initialized
    try {
      const { data, error } = await supabaseAdmin.storage.listBuckets();
      results.tests.listBuckets = {
        status: error ? 'failed' : 'success',
        message: error?.message || `Found ${data?.length || 0} buckets`,
        data: error ? null : data?.map(b => ({ name: b.name, id: b.id })),
      };
    } catch (e: any) {
      results.tests.listBuckets = { status: 'error', message: e.message };
    }

    // Test 2: Check if 'videos' bucket exists
    try {
      const { data, error } = await supabaseAdmin.storage
        .from('videos')
        .list('', { limit: 1 });
      
      results.tests.videosBucket = {
        status: error ? 'failed' : 'success',
        message: error?.message || 'Videos bucket is accessible',
        error: error?.message,
      };
    } catch (e: any) {
      results.tests.videosBucket = { status: 'error', message: e.message };
    }

    // Test 3: Check if 'images' bucket exists
    try {
      const { data, error } = await supabaseAdmin.storage
        .from('images')
        .list('', { limit: 1 });
      
      results.tests.imagesBucket = {
        status: error ? 'failed' : 'success',
        message: error?.message || 'Images bucket is accessible',
        error: error?.message,
      };
    } catch (e: any) {
      results.tests.imagesBucket = { status: 'error', message: e.message };
    }

    // Test 4: Get test URL structure
    try {
      const testPath = 'test-formation/test-video.mp4';
      const { data } = supabaseAdmin.storage.from('videos').getPublicUrl(testPath);
      results.tests.publicUrlStructure = {
        status: 'success',
        testPath,
        publicUrl: data?.publicUrl,
        message: 'This is the URL structure returned by getPublicUrl()',
      };
    } catch (e: any) {
      results.tests.publicUrlStructure = { status: 'error', message: e.message };
    }

    // Test 5: List formations folder if it exists
    try {
      const { data, error } = await supabaseAdmin.storage
        .from('videos')
        .list('formations', { limit: 5 });
      
      results.tests.formationsFolder = {
        status: error && error.message.includes('not found') ? 'not_found' : error ? 'failed' : 'success',
        message: error?.message || `Found ${data?.length || 0} items`,
        data: error ? null : data?.slice(0, 3).map(f => ({ name: f.name, id: f.id })),
      };
    } catch (e: any) {
      results.tests.formationsFolder = { status: 'error', message: e.message };
    }

    // Test 6: Check environment variables
    results.environment = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '✗ Missing',
    };

    // Summary
    const passedTests = Object.values(results.tests).filter((t: any) => t.status === 'success').length;
    const failedTests = Object.values(results.tests).filter((t: any) => t.status === 'failed' || t.status === 'error').length;

    results.summary = {
      totalTests: Object.keys(results.tests).length,
      passed: passedTests,
      failed: failedTests,
      recommendation: failedTests === 0 ? '✓ Storage configuration looks good!' : '⚠ Check failed tests above',
    };

    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
