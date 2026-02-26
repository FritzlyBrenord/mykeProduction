import { NextRequest, NextResponse } from 'next/server';
import {  supabaseAdmin  } from '@/lib/supabase-admin';

function normalizeIntroType(value: unknown): 'text' | 'video' | null {
  return value === 'text' || value === 'video' ? value : null;
}

function normalizeVideoType(value: unknown): 'upload' | 'youtube' | 'vimeo' | null {
  return value === 'upload' || value === 'youtube' || value === 'vimeo' ? value : null;
}

// PUT /api/admin/formations/modules/[moduleId]
export async function PUT(request: NextRequest, context: { params: Promise<{ moduleId: string }> }) {
  try {
    const { moduleId } = await context.params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = String(body.title || '').trim();
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.order_index !== undefined) updateData.order_index = Number(body.order_index) || 0;
    if (body.intro_type !== undefined) updateData.intro_type = normalizeIntroType(body.intro_type);
    if (body.intro_text !== undefined) updateData.intro_text = body.intro_text || null;
    if (body.intro_video_url !== undefined) updateData.intro_video_url = body.intro_video_url || null;
    if (body.intro_video_type !== undefined) updateData.intro_video_type = normalizeVideoType(body.intro_video_type);
    if (body.is_visible !== undefined) updateData.is_visible = Boolean(body.is_visible);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No data to update' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('formation_modules')
      .update(updateData)
      .eq('id', moduleId)
      .select('*')
      .single();

    if (error) throw error;

    // If module is hidden (is_visible = false), hide all its lessons too
    if (body.is_visible === false) {
      const { error: lessonsError } = await supabaseAdmin
        .from('formation_lecons')
        .update({ is_visible: false })
        .eq('module_id', moduleId);

      if (lessonsError) {
        console.warn('Failed to hide lessons for module:', lessonsError.message);
        // Don't throw - the module was updated successfully
      }
    }

    await supabaseAdmin.from('audit_logs').insert({
      action: 'update',
      table_name: 'formation_modules',
      record_id: moduleId,
      new_data: data,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Module update error:', error);
    return NextResponse.json(
      { error: 'Failed to update module' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/formations/modules/[moduleId]
export async function DELETE(_: NextRequest, context: { params: Promise<{ moduleId: string }> }) {
  try {
    const { moduleId } = await context.params;

    const { error } = await supabaseAdmin
      .from('formation_modules')
      .delete()
      .eq('id', moduleId);

    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      action: 'delete',
      table_name: 'formation_modules',
      record_id: moduleId,
      new_data: null,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Module delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete module' },
      { status: 500 }
    );
  }
}
