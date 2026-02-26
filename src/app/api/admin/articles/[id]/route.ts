import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { data, error } = await supabaseAdmin
            .from('articles')
            .select('*, article_categories(category_id)')
            .eq('id', id)
            .single();

        if (error) throw error;

        // Transform response structure
        const transformedData = {
            ...data,
            categories: data.article_categories?.map((ac: any) => ac.category_id) || []
        };

        return NextResponse.json(transformedData);
    } catch (error: any) {
        console.error('Article fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch article' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const { data, error } = await supabaseAdmin
            .from('articles')
            .update({
                title: body.title,
                slug: body.slug,
                excerpt: body.excerpt,
                content: body.content,
                thumbnail_url: body.thumbnail_url,
                status: body.status,
                category_id: null,
                seo_title: body.seo_title,
                seo_description: body.seo_description,
                allow_comments: body.allow_comments,
                published_at: body.status === 'published' ? new Date().toISOString() : null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Log audit
        await supabaseAdmin.from('audit_logs').insert({
            action: 'update',
            table_name: 'articles',
            record_id: id,
            new_data: data,
        });

        // Update categories
        if (body.categories) {
            // First delete existing
            await supabaseAdmin
                .from('article_categories')
                .delete()
                .eq('article_id', id);

            // Then insert new ones
            if (body.categories.length > 0) {
                const categoryInserts = body.categories.map((catId: string) => ({
                    article_id: id,
                    category_id: catId,
                }));

                const { error: catError } = await supabaseAdmin
                    .from('article_categories')
                    .insert(categoryInserts);

                if (catError) {
                    console.error('Failed to link categories:', catError);
                }
            }
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Article update error:', error);
        return NextResponse.json(
            { error: 'Failed to update article' },
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
            .from('articles')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        // Log audit
        await supabaseAdmin.from('audit_logs').insert({
            action: 'delete',
            table_name: 'articles',
            record_id: id,
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Article delete error:', error);
        return NextResponse.json(
            { error: 'Failed to delete article' },
            { status: 500 }
        );
    }
}
