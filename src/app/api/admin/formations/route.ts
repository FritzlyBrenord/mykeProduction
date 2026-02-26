import { NextRequest, NextResponse } from 'next/server';
import {  supabaseAdmin  } from '@/lib/supabase-admin';

const FORMATION_SELECT = '*, category:categories(name), author:profiles(full_name)';

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildFormationPayload(body: any) {
  const payload: any = {
    title: String(body.title || '').trim(),
    slug: String(body.slug || '').trim(),
    description: body.description ? String(body.description) : null,
    content: body.content ? String(body.content) : null,
    thumbnail_url: body.thumbnail_url ? String(body.thumbnail_url) : null,
    price: parseNumber(body.price) ?? 0,
    is_free: Boolean(body.is_free),
    format: body.format === 'text' ? 'text' : 'video',
    level: body.level || null,
    language: body.language ? String(body.language) : 'fr',
    duration_hours: parseNumber(body.duration_hours),
    certificate: Boolean(body.certificate),
    category_id: body.category_id || null,
    status: body.status || 'draft',
    scheduled_publish_at: body.status === 'scheduled' ? body.scheduled_publish_at || null : null,
    scheduled_timezone: body.status === 'scheduled' ? (body.scheduled_timezone || 'UTC') : 'UTC',
  };
  
  return payload;
}

// GET /api/admin/formations - List all formations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let queryWithRelations = supabaseAdmin
      .from('formations')
      .select(FORMATION_SELECT)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (status) queryWithRelations = queryWithRelations.eq('status', status);
    if (search) queryWithRelations = queryWithRelations.ilike('title', `%${search}%`);

    const withRelations = await queryWithRelations;
    if (!withRelations.error) {
      // Enrich each formation with module and lesson counts
      const formations = await Promise.all(
        (withRelations.data || []).map(async (formation: any) => {
          // Get visible modules count
          const { data: modules } = await supabaseAdmin
            .from('formation_modules')
            .select('id', { count: 'exact', head: false })
            .eq('formation_id', formation.id)
            .eq('is_visible', true);

          const moduleCount = (modules || []).length;
          const moduleIds = (modules || []).map((m: any) => m.id);
          let lessonCount = 0;

          if (moduleIds.length > 0) {
            const { data: lessons } = await supabaseAdmin
              .from('formation_lecons')
              .select('id', { count: 'exact', head: false })
              .in('module_id', moduleIds)
              .eq('is_visible', true);

            lessonCount = (lessons || []).length;
          }

          return {
            ...formation,
            moduleCount,
            lessonCount,
          };
        })
      );

      return NextResponse.json(formations);
    }

    console.warn('Formations relation select failed, fallback to plain select:', withRelations.error.message);

    let fallbackQuery = supabaseAdmin
      .from('formations')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (status) fallbackQuery = fallbackQuery.eq('status', status);
    if (search) fallbackQuery = fallbackQuery.ilike('title', `%${search}%`);

    const fallback = await fallbackQuery;
    if (fallback.error) throw fallback.error;

    const formations = (fallback.data || []).map((f: any) => ({ 
      ...f, 
      moduleCount: 0, 
      lessonCount: 0 
    }));
    return NextResponse.json(formations);
  } catch (error: any) {
    console.error('Formations fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch formations' },
      { status: 500 }
    );
  }
}

// POST /api/admin/formations - Create new formation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = buildFormationPayload(body);

    if (!payload.title || !payload.slug) {
      return NextResponse.json(
        { error: 'Title and slug are required' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabaseAdmin
      .from('formations')
      .insert(payload)
      .select(FORMATION_SELECT)
      .single();
    
    if (error) throw error;
    
    // Log audit
    await supabaseAdmin.from('audit_logs').insert({
      action: 'create',
      table_name: 'formations',
      record_id: data.id,
      new_data: data,
    });
    
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Formation create error:', error);
    return NextResponse.json(
      { error: 'Failed to create formation' },
      { status: 500 }
    );
  }
}
