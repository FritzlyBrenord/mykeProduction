import { NextRequest, NextResponse } from 'next/server';
import {  supabaseAdmin  } from '@/lib/supabase-admin';

// GET /api/admin/paiements - List all paiements
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from('paiements')
      .select('*, user:profiles(full_name, email)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Paiements fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch paiements' },
      { status: 500 }
    );
  }
}
