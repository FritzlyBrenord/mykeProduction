import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET /api/admin/produits/[id] - Get a single produit
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const { data, error } = await supabaseAdmin
            .from('produits')
            .select('*, category:categories(name)')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) {
            return NextResponse.json({ error: 'Produit not found' }, { status: 404 });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Produit fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch produit' },
            { status: 500 }
        );
    }
}

// PUT /api/admin/produits/[id] - Update a produit
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        // Get current data for audit
        const { data: oldData } = await supabaseAdmin
            .from('produits')
            .select('*')
            .eq('id', id)
            .single();

        const { data, error } = await supabaseAdmin
            .from('produits')
            .update({
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
                status: body.status,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select('*, category:categories(name)')
            .single();

        if (error) throw error;

        // Log audit
        await supabaseAdmin.from('audit_logs').insert({
            action: 'update',
            table_name: 'produits',
            record_id: id,
            old_data: oldData,
            new_data: data,
        });

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Produit update error:', error);
        return NextResponse.json(
            { error: 'Failed to update produit' },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/produits/[id] - Delete a produit
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Get current data for audit
        const { data: oldData } = await supabaseAdmin
            .from('produits')
            .select('*')
            .eq('id', id)
            .single();

        const { error } = await supabaseAdmin
            .from('produits')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Log audit
        await supabaseAdmin.from('audit_logs').insert({
            action: 'delete',
            table_name: 'produits',
            record_id: id,
            old_data: oldData,
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Produit delete error:', error);
        return NextResponse.json(
            { error: 'Failed to delete produit' },
            { status: 500 }
        );
    }
}
