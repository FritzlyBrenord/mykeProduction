import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET /api/admin/articles - List all articles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('articles')
      .select('*, author:profiles(full_name), article_categories(category_id)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const { data, count, error } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    // Transform response format to include a simple categories array
    const transformedData = data?.map(article => ({
      ...article,
      categories: article.article_categories?.map((ac: any) => ac.category_id) || []
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
  } catch (error: any) {
    console.error('Articles fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}

// POST /api/admin/articles - Create new article
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { data, error } = await supabaseAdmin
      .from('articles')
      .insert({
        title: body.title,
        slug: body.slug,
        excerpt: body.excerpt,
        content: body.content,
        thumbnail_url: body.thumbnail_url,
        status: body.status || 'draft',
        category_id: null,
        seo_title: body.seo_title,
        seo_description: body.seo_description,
        allow_comments: body.allow_comments ?? true,
        published_at: body.status === 'published' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) throw error;

    // Log audit
    await supabaseAdmin.from('audit_logs').insert({
      action: 'create',
      table_name: 'articles',
      record_id: data.id,
      new_data: data,
    });

    if (body.categories && body.categories.length > 0) {
      const categoryInserts = body.categories.map((catId: string) => ({
        article_id: data.id,
        category_id: catId,
      }));

      const { error: catError } = await supabaseAdmin
        .from('article_categories')
        .insert(categoryInserts);

      if (catError) {
        console.error('Failed to link categories:', catError);
      }
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Article create error:', error);
    return NextResponse.json(
      { error: 'Failed to create article' },
      { status: 500 }
    );
  }
}
