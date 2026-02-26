import { NextRequest, NextResponse } from 'next/server';
import {  supabaseAdmin  } from '@/lib/supabase-admin';

// GET /api/admin/commandes - List all commandes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    let query = supabaseAdmin
      .from('commandes')
      .select('*, user:profiles(full_name, email), items:commande_items(*)')
      .order('created_at', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Commandes fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch commandes' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/commandes/[id]/status - Update commande status
export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    const body = await request.json();
    
    const { data, error } = await supabaseAdmin
      .from('commandes')
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Log audit
    await supabaseAdmin.from('audit_logs').insert({
      action: 'update',
      table_name: 'commandes',
      record_id: id,
      new_data: { status: body.status },
    });
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Commande update error:', error);
    return NextResponse.json(
      { error: 'Failed to update commande' },
      { status: 500 }
    );
  }
}
