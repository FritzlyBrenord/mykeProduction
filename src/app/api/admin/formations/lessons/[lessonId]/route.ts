import { NextRequest, NextResponse } from 'next/server';
import {  supabaseAdmin  } from '@/lib/supabase-admin';

// PUT /api/admin/formations/lessons/[lessonId]
export async function PUT(request: NextRequest, context: { params: Promise<{ lessonId: string }> }) {
  try {
    const { lessonId } = await context.params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = String(body.title || '').trim();
    if (body.content !== undefined) updateData.content = body.content || null;
    if (body.video_url !== undefined) updateData.video_url = body.video_url || null;
    if (body.video_type !== undefined) updateData.video_type = body.video_type || null;
    if (body.duration_min !== undefined) {
      updateData.duration_min = body.duration_min === '' ? null : Number(body.duration_min) || 0;
    }
    if (body.order_index !== undefined) updateData.order_index = Number(body.order_index) || 0;
    if (body.is_preview !== undefined) updateData.is_preview = Boolean(body.is_preview);
    if (body.is_visible !== undefined) updateData.is_visible = Boolean(body.is_visible);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No data to update' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('formation_lecons')
      .update(updateData)
      .eq('id', lessonId)
      .select('*')
      .single();

    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      action: 'update',
      table_name: 'formation_lecons',
      record_id: lessonId,
      new_data: data,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Lesson update error:', error);
    return NextResponse.json(
      { error: 'Failed to update lesson' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/formations/lessons/[lessonId]
export async function DELETE(_: NextRequest, context: { params: Promise<{ lessonId: string }> }) {
  try {
    const { lessonId } = await context.params;

    const { error } = await supabaseAdmin
      .from('formation_lecons')
      .delete()
      .eq('id', lessonId);

    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      action: 'delete',
      table_name: 'formation_lecons',
      record_id: lessonId,
      new_data: null,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Lesson delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete lesson' },
      { status: 500 }
    );
  }
}
