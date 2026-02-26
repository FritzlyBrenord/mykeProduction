import { NextRequest, NextResponse } from 'next/server';
import {  supabaseAdmin  } from '@/lib/supabase-admin';

// GET /api/admin/utilisateurs - List all users
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Users fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/utilisateurs/[id]/role - Update user role
export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    const body = await request.json();
    
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ role: body.role, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Log audit
    await supabaseAdmin.from('audit_logs').insert({
      action: 'update',
      table_name: 'profiles',
      record_id: id,
      new_data: { role: body.role },
    });
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('User role update error:', error);
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    );
  }
}
