import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET /api/admin/produits - List all produits
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('produits')
      .select('*, category:categories(name)')
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Produits fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch produits' },
      { status: 500 }
    );
  }
}

// POST /api/admin/produits - Create new produit
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { data, error } = await supabaseAdmin
      .from('produits')
      .insert({
        name: body.name,
        slug: body.slug,
        description: body.description,
        content: body.content,
        price: body.price,
        images: body.images,
        type: body.type,
        stock: body.stock,
        is_digital: body.is_digital,
        file_url: body.file_url,
        cas_number: body.cas_number,
        msds_url: body.msds_url,
        purity: body.purity,
        unit: body.unit,
        min_order: body.min_order,
        ghs_pictograms: body.ghs_pictograms,
        hazard_statements: body.hazard_statements,
        precautionary_statements: body.precautionary_statements,
        signal_word: body.signal_word,
        age_restricted: body.age_restricted,
        restricted_sale: body.restricted_sale,
        adr_class: body.adr_class,
        category_id: body.category_id || null,
        featured: body.featured,
        status: body.status || 'draft',
      })
      .select('*, category:categories(name)')
      .single();

    if (error) throw error;

    // Log audit
    await supabaseAdmin.from('audit_logs').insert({
      action: 'create',
      table_name: 'produits',
      record_id: data.id,
      new_data: data,
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Produit create error:', error);
    return NextResponse.json(
      { error: 'Failed to create produit' },
      { status: 500 }
    );
  }
}
