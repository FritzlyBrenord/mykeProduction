import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const { data, error } = await supabaseAdmin
            .from('commentaires')
            .update({
                status: body.status,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Log audit
        await supabaseAdmin.from('audit_logs').insert({
            action: 'update',
            table_name: 'commentaires',
            record_id: id,
            new_data: data,
        });

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Commentaire update error:', error);
        return NextResponse.json(
            { error: 'Failed to update commentaire' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { error: deleteError } = await supabaseAdmin
            .from('commentaires')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        // Log audit
        await supabaseAdmin.from('audit_logs').insert({
            action: 'delete',
            table_name: 'commentaires',
            record_id: id,
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Commentaire delete error:', error);
        return NextResponse.json(
            { error: 'Failed to delete commentaire' },
            { status: 500 }
        );
    }
}
