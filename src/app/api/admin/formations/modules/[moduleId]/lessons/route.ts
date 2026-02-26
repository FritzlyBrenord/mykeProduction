import { NextRequest, NextResponse } from 'next/server';
import {  supabaseAdmin  } from '@/lib/supabase-admin';

// POST /api/admin/formations/modules/[moduleId]/lessons
export async function POST(request: NextRequest, context: { params: Promise<{ moduleId: string }> }) {
  try {
    const { moduleId } = await context.params;
    const body = await request.json();
    const title = String(body.title || '').trim();

    if (!title) {
      return NextResponse.json({ error: 'Lesson title is required' }, { status: 400 });
    }

    let orderIndex = Number(body.order_index);
    if (!Number.isFinite(orderIndex)) {
      const { count } = await supabaseAdmin
        .from('formation_lecons')
        .select('*', { count: 'exact', head: true })
        .eq('module_id', moduleId);
      orderIndex = count || 0;
    }

    const { data, error } = await supabaseAdmin
      .from('formation_lecons')
      .insert({
        module_id: moduleId,
        title,
        content: body.content || null,
        video_url: body.video_url || null,
        video_type: body.video_type || null,
        duration_min: body.duration_min ? Number(body.duration_min) : null,
        order_index: orderIndex,
        is_preview: Boolean(body.is_preview),
      })
      .select('*')
      .single();

    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      action: 'create',
      table_name: 'formation_lecons',
      record_id: data.id,
      new_data: data,
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Lesson create error:', error);
    return NextResponse.json(
      { error: 'Failed to create lesson' },
      { status: 500 }
    );
  }
}
