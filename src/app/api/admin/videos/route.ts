import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET /api/admin/videos - List all videos
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from('videos')
      .select('*, category:categories(name), playlist:video_playlists(title)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return NextResponse.json(data || []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch videos';
    console.error('Videos fetch error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// POST /api/admin/videos - Create new video
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { data, error } = await supabaseAdmin
      .from('videos')
      .insert({
        title: body.title,
        slug: body.slug,
        video_url: body.video_url,
        video_type: body.video_type,
        thumbnail_url: body.thumbnail_url || null,
        access_type: body.access_type,
        price: body.price,
        category_id: body.category_id,
        playlist_id: body.playlist_id,
        status: body.status || 'draft',
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Log audit
    await supabaseAdmin.from('audit_logs').insert({
      action: 'create',
      table_name: 'videos',
      record_id: data.id,
      new_data: data,
    });
    
    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create video';
    console.error('Video create error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
