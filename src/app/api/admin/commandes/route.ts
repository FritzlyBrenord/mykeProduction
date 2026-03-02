import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('commandes')
      .select(
        `
          id,
          user_id,
          status,
          subtotal,
          discount_amount,
          tax_amount,
          total_amount,
          currency,
          shipping_address,
          payment_method,
          payment_id,
          created_at,
          updated_at,
          user:profiles(id,full_name,avatar_url),
          items:commande_items(
            id,
            commande_id,
            produit_id,
            formation_id,
            video_id,
            item_type,
            quantity,
            unit_price,
            total_price,
            created_at,
            produit:produits(id,name,slug,images,is_digital,type),
            formation:formations(id,title,slug,thumbnail_url,is_free),
            video:videos(id,title,slug,thumbnail_url)
          )
        `,
      )
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error('Commandes fetch error:', error);
    return NextResponse.json(
      { error: 'Impossible de recuperer les commandes.' },
      { status: 500 },
    );
  }
}
