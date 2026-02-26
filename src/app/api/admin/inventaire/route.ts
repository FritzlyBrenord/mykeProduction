import { NextRequest, NextResponse } from 'next/server';
import {  supabaseAdmin  } from '@/lib/supabase-admin';

// GET /api/admin/inventaire - List all inventory movements
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from('chemical_inventory')
      .select('*, produit:produits(name, cas_number)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Inventory fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}

// POST /api/admin/inventaire - Create new inventory movement
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Calculate quantity_current based on movement type
    let quantityCurrent = 0;
    if (body.movement_type === 'entree') {
      quantityCurrent = body.quantity_in;
    } else if (body.movement_type === 'vente' || body.movement_type === 'perte' || body.movement_type === 'peremption') {
      quantityCurrent = -body.quantity_out;
    } else if (body.movement_type === 'retour') {
      quantityCurrent = body.quantity_in;
    }
    
    const { data, error } = await supabaseAdmin
      .from('chemical_inventory')
      .insert({
        produit_id: body.produit_id,
        batch_number: body.batch_number,
        quantity_in: body.quantity_in || null,
        quantity_out: body.quantity_out || null,
        quantity_current: quantityCurrent,
        purity_percent: body.purity_percent,
        manufacturing_date: body.manufacturing_date,
        expiry_date: body.expiry_date,
        storage_location: body.storage_location,
        safety_class: body.safety_class,
        movement_type: body.movement_type,
        notes: body.notes,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Log audit
    await supabaseAdmin.from('audit_logs').insert({
      action: 'create',
      table_name: 'chemical_inventory',
      record_id: data.id,
      new_data: data,
    });
    
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Inventory create error:', error);
    return NextResponse.json(
      { error: 'Failed to create inventory movement' },
      { status: 500 }
    );
  }
}
