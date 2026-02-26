import { NextRequest, NextResponse } from 'next/server';
import {  supabaseAdmin  } from '@/lib/supabase-admin';

function normalizeIntroType(value: unknown): 'text' | 'video' | null {
  return value === 'text' || value === 'video' ? value : null;
}

function normalizeVideoType(value: unknown): 'upload' | 'youtube' | 'vimeo' | null {
  return value === 'upload' || value === 'youtube' || value === 'vimeo' ? value : null;
}

// POST /api/admin/formations/[id]/modules
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: formationId } = await context.params;
    const body = await request.json();
    const title = String(body.title || '').trim();

    if (!title) {
      return NextResponse.json({ error: 'Module title is required' }, { status: 400 });
    }

    let orderIndex = Number(body.order_index);
    if (!Number.isFinite(orderIndex)) {
      const { count } = await supabaseAdmin
        .from('formation_modules')
        .select('*', { count: 'exact', head: true })
        .eq('formation_id', formationId);
      orderIndex = count || 0;
    }

    const { data, error } = await supabaseAdmin
      .from('formation_modules')
      .insert({
        formation_id: formationId,
        title,
        description: body.description || null,
        intro_type: normalizeIntroType(body.intro_type),
        intro_text: body.intro_text || null,
        intro_video_url: body.intro_video_url || null,
        intro_video_type: normalizeVideoType(body.intro_video_type),
        order_index: orderIndex,
      })
      .select('*')
      .single();

    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      action: 'create',
      table_name: 'formation_modules',
      record_id: data.id,
      new_data: data,
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Module create error:', error);
    return NextResponse.json(
      { error: 'Failed to create module' },
      { status: 500 }
    );
  }
}
