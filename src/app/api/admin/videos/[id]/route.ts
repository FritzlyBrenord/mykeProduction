import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

type RouteParams = { id: string };

// GET /api/admin/videos/[id] - Get single video
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from('videos')
      .select('*, category:categories(name), playlist:video_playlists(title)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch video';
    console.error('Video fetch error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/videos/[id] - Update video
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Get current data for audit log
    const { data: oldData } = await supabaseAdmin
      .from('videos')
      .select()
      .eq('id', id)
      .single();

    const updateData: Record<string, unknown> = {};

    // Update allowed fields
    if (body.title !== undefined) updateData.title = body.title;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.video_url !== undefined) updateData.video_url = body.video_url;
    if (body.video_type !== undefined) updateData.video_type = body.video_type;
    if (body.thumbnail_url !== undefined) updateData.thumbnail_url = body.thumbnail_url;
    if (body.access_type !== undefined) updateData.access_type = body.access_type;
    if (body.price !== undefined) updateData.price = body.price;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.category_id !== undefined) updateData.category_id = body.category_id;
    if (body.playlist_id !== undefined) updateData.playlist_id = body.playlist_id;

    // Only update if there are fields to update
    let data = oldData;
    if (Object.keys(updateData).length > 0) {
      const { data: updatedData, error } = await supabaseAdmin
        .from('videos')
        .update(updateData)
        .eq('id', id)
        .select('*, category:categories(name), playlist:video_playlists(title)')
        .single();

      if (error) throw error;
      data = updatedData;

      // Log audit
      await supabaseAdmin.from('audit_logs').insert({
        action: 'update',
        table_name: 'videos',
        record_id: id,
        old_data: oldData,
        new_data: data,
      });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update video';
    console.error('Video update error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/videos/[id] - Delete video (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id } = await params;
    // Get current data for audit log
    const { data: oldData } = await supabaseAdmin
      .from('videos')
      .select()
      .eq('id', id)
      .single();

    // Soft delete
    const { data, error } = await supabaseAdmin
      .from('videos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log audit
    await supabaseAdmin.from('audit_logs').insert({
      action: 'delete',
      table_name: 'videos',
      record_id: id,
      old_data: oldData,
      new_data: null,
    });

    return NextResponse.json(
      { message: 'Video deleted successfully', data },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete video';
    console.error('Video delete error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
