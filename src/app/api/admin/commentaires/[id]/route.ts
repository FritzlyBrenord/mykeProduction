import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();

        const { data, error } = await supabaseAdmin
            .from('commentaires')
            .update({
                status: body.status,
                updated_at: new Date().toISOString(),
            })
            .eq('id', params.id)
            .select()
            .single();

        if (error) throw error;

        // Log audit
        await supabaseAdmin.from('audit_logs').insert({
            action: 'update',
            table_name: 'commentaires',
            record_id: params.id,
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
    { params }: { params: { id: string } }
) {
    try {
        const { error: deleteError } = await supabaseAdmin
            .from('commentaires')
            .delete()
            .eq('id', params.id);

        if (deleteError) throw deleteError;

        // Log audit
        await supabaseAdmin.from('audit_logs').insert({
            action: 'delete',
            table_name: 'commentaires',
            record_id: params.id,
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
