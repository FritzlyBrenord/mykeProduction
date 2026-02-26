import { NextRequest, NextResponse } from 'next/server';
import {  supabaseAdmin  } from '@/lib/supabase-admin';

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildFormationUpdate(body: any) {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.title !== undefined) updateData.title = String(body.title || '').trim();
  if (body.slug !== undefined) updateData.slug = String(body.slug || '').trim();
  if (body.description !== undefined) updateData.description = body.description || null;
  if (body.content !== undefined) updateData.content = body.content || null;
  if (body.thumbnail_url !== undefined) updateData.thumbnail_url = body.thumbnail_url || null;
  if (body.price !== undefined) updateData.price = parseNumber(body.price) ?? 0;
  if (body.is_free !== undefined) updateData.is_free = Boolean(body.is_free);
  if (body.format !== undefined) updateData.format = body.format === 'text' ? 'text' : 'video';
  if (body.level !== undefined) updateData.level = body.level || null;
  if (body.language !== undefined) updateData.language = body.language || 'fr';
  if (body.duration_hours !== undefined) updateData.duration_hours = parseNumber(body.duration_hours);
  if (body.certificate !== undefined) updateData.certificate = Boolean(body.certificate);
  if (body.category_id !== undefined) updateData.category_id = body.category_id || null;
  
  // Gestion du statut
  if (body.status !== undefined) {
    const validStatuses = ['draft', 'published', 'archived', 'scheduled'];
    updateData.status = validStatuses.includes(body.status) ? body.status : 'draft';
  }
  
  // Gestion des champs de planification
  if (body.status === 'scheduled') {
    // Si on passe en "scheduled", le champ scheduled_publish_at est requis
    if (body.scheduled_publish_at) {
      updateData.scheduled_publish_at = body.scheduled_publish_at;
    }
    if (body.scheduled_timezone) {
      updateData.scheduled_timezone = body.scheduled_timezone;
    } else {
      updateData.scheduled_timezone = 'UTC';
    }
  } else {
    // Si on change de statut vers non-scheduled, nettoyer les champs
    updateData.scheduled_publish_at = null;
    updateData.scheduled_timezone = 'UTC';
  }

  return updateData;
}

async function getFormationGraph(id: string) {
  const { data: formation, error: formationError } = await supabaseAdmin
    .from('formations')
    .select('*, category:categories(name), author:profiles(full_name)')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (formationError) throw formationError;

  const { data: modules, error: modulesError } = await supabaseAdmin
    .from('formation_modules')
    .select('*')
    .eq('formation_id', id)
    .order('order_index', { ascending: true });

  if (modulesError) throw modulesError;

  const moduleIds = (modules || []).map((module) => module.id);
  let lessons: any[] = [];

  if (moduleIds.length > 0) {
    const { data: lessonsData, error: lessonsError } = await supabaseAdmin
      .from('formation_lecons')
      .select('*')
      .in('module_id', moduleIds)
      .order('order_index', { ascending: true });

    if (lessonsError) throw lessonsError;
    lessons = lessonsData || [];
  }

  const modulesWithLessons = (modules || []).map((module) => ({
    ...module,
    lecons: lessons.filter((lesson) => lesson.module_id === module.id),
  }));

  return { ...formation, modules: modulesWithLessons };
}

// GET /api/admin/formations/[id]
export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const data = await getFormationGraph(id);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Formation fetch by id error:', error);
    const status = error?.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json(
      { error: status === 404 ? 'Formation not found' : 'Failed to fetch formation' },
      { status }
    );
  }
}

// PUT /api/admin/formations/[id]
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const updateData = buildFormationUpdate(body);

    const { data, error } = await supabaseAdmin
      .from('formations')
      .update(updateData)
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .single();

    // Si erreur PGRST204 (colonne non trouvée), réessayer sans les champs de planification
    if (error?.code === 'PGRST204' && error?.message?.includes('scheduled_publish_at')) {
      console.warn('Scheduling columns not found, retrying without them:', error.message);
      
      // Créer une version sans les champs de planification
      const fallbackData = { ...updateData };
      delete fallbackData.scheduled_publish_at;
      delete fallbackData.scheduled_timezone;
      
      const { data: fallbackResult, error: fallbackError } = await supabaseAdmin
        .from('formations')
        .update(fallbackData)
        .eq('id', id)
        .is('deleted_at', null)
        .select('*')
        .single();

      if (fallbackError) {
        throw new Error(`Formation update failed: ${fallbackError.message}. Please apply the database migration SQL file (005_add_scheduled_publishing.sql) to use scheduling features.`);
      }

      await supabaseAdmin.from('audit_logs').insert({
        action: 'update',
        table_name: 'formations',
        record_id: id,
        new_data: fallbackResult,
      });

      return NextResponse.json({
        ...fallbackResult,
        _migration_warning: 'Scheduling columns not yet available. Please apply migration: 005_add_scheduled_publishing.sql'
      });
    }

    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      action: 'update',
      table_name: 'formations',
      record_id: id,
      new_data: data,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Formation update error:', error);
    
    // Gérer les erreurs de contrainte CHECK
    if (error?.message?.includes('formations_status_check')) {
      return NextResponse.json(
        { error: 'The "scheduled" status is not available yet. Please apply the database migration SQL file (005_add_scheduled_publishing.sql) in Supabase.' },
        { status: 400 }
      );
    }
    
    // Gérer les colonnes manquantes
    if (error?.code === 'PGRST204' && error?.message?.includes('scheduled')) {
      return NextResponse.json(
        { error: 'Scheduling columns not yet available. Please apply the database migration (005_add_scheduled_publishing.sql).' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error?.message || 'Failed to update formation' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/formations/[id] (soft delete)
export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const deletedAt = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('formations')
      .update({
        status: 'archived',
        deleted_at: deletedAt,
        updated_at: deletedAt,
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      action: 'delete',
      table_name: 'formations',
      record_id: id,
      new_data: { deleted_at: deletedAt, status: 'archived' },
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Formation delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete formation' },
      { status: 500 }
    );
  }
}
