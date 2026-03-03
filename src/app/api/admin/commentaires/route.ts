import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

type AdminCommentRow = {
    id: string;
    parent_id: string | null;
    user?: { full_name: string | null; avatar_url: string | null } | null;
    article?: { title: string | null } | null;
    [key: string]: unknown;
};

type ParentCommentRow = {
    id: string;
    content: string;
    user?: { full_name: string | null; avatar_url: string | null } | null;
};

// GET /api/admin/commentaires - List all comments
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = (page - 1) * limit;
        const articleId = searchParams.get('article_id');
        const status = searchParams.get('status');

        let query = supabaseAdmin
            .from('commentaires')
            .select('*, user:profiles(full_name, avatar_url), article:articles(title)', { count: 'exact' })
            .order('created_at', { ascending: false });

        if (articleId) {
            query = query.eq('article_id', articleId);
        }

        if (status) {
            query = query.eq('status', status);
        }

        const { data, count, error } = await query.range(offset, offset + limit - 1);

        if (error) throw error;

        const commentsRows = (data || []) as AdminCommentRow[];
        const parentIds = Array.from(new Set(commentsRows.map((comment) => comment.parent_id).filter(Boolean))) as string[];

        let parentMap = new Map<string, ParentCommentRow>();

        if (parentIds.length > 0) {
            const { data: parentComments, error: parentError } = await supabaseAdmin
                .from('commentaires')
                .select('id, content, user:profiles(full_name, avatar_url)')
                .in('id', parentIds);

            if (parentError) throw parentError;

            const typedParents = (parentComments || []) as ParentCommentRow[];
            parentMap = new Map(typedParents.map((parent) => [parent.id, parent]));
        }

        const transformedData = commentsRows.map((comment) => ({
            ...comment,
            parent: comment.parent_id ? parentMap.get(comment.parent_id) || null : null,
        }));

        return NextResponse.json({
            data: transformedData,
            meta: {
                total: count || 0,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });
    } catch (error: unknown) {
        console.error('Commentaires fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch commentaires' },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/commentaires - Bulk delete comments
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const idsParam = searchParams.get('ids');

        if (!idsParam) {
            return NextResponse.json({ error: 'IDs required for bulk delete' }, { status: 400 });
        }

        const ids = idsParam.split(',');

        const { error } = await supabaseAdmin
            .from('commentaires')
            .delete()
            .in('id', ids);

        if (error) throw error;

        // Log audit
        await supabaseAdmin.from('audit_logs').insert({
            action: 'delete',
            table_name: 'commentaires',
            old_data: { bulk_delete_ids: ids },
        });

        return NextResponse.json({ success: true, deletedCount: ids.length });
    } catch (error: unknown) {
        console.error('Commentaires bulk delete error:', error);
        return NextResponse.json(
            { error: 'Failed to bulk delete commentaires' },
            { status: 500 }
        );
    }
}
