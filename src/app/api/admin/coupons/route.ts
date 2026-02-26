import { NextRequest, NextResponse } from 'next/server';
import {  supabaseAdmin  } from '@/lib/supabase-admin';

// GET /api/admin/coupons - List all coupons
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Coupons fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coupons' },
      { status: 500 }
    );
  }
}

// POST /api/admin/coupons - Create new coupon
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { data, error } = await supabaseAdmin
      .from('coupons')
      .insert({
        code: body.code,
        discount_type: body.discount_type,
        discount_value: body.discount_value,
        valid_from: body.valid_from,
        valid_until: body.valid_until,
        usage_limit: body.usage_limit,
        min_order_amount: body.min_order_amount,
        is_active: true,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Log audit
    await supabaseAdmin.from('audit_logs').insert({
      action: 'create',
      table_name: 'coupons',
      record_id: data.id,
      new_data: data,
    });
    
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Coupon create error:', error);
    return NextResponse.json(
      { error: 'Failed to create coupon' },
      { status: 500 }
    );
  }
}
