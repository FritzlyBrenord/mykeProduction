import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
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
          coupon_id,
          shipping_address,
          payment_method,
          payment_id,
          invoice_url,
          created_at,
          updated_at,
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
            produit:produits(id,name,slug,images,is_digital),
            formation:formations(id,title,slug,thumbnail_url,is_free),
            video:videos(id,title,slug,thumbnail_url)
          )
        `,
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const orders = (data ?? []) as Array<{
      id: string;
      items?: Array<{
        item_type: 'produit' | 'formation' | 'video';
        formation_id: string | null;
      }>;
    }>;

    const formationIds = Array.from(
      new Set(
        orders
          .flatMap((order) => order.items ?? [])
          .filter((item) => item.item_type === 'formation' && item.formation_id)
          .map((item) => item.formation_id as string),
      ),
    );

    let progressByFormationId = new Map<string, number>();
    if (formationIds.length > 0) {
      const { data: enrollments, error: enrollmentsError } = await supabaseAdmin
        .from('enrollments')
        .select('formation_id,progress')
        .eq('user_id', user.id)
        .in('formation_id', formationIds);

      if (!enrollmentsError) {
        progressByFormationId = new Map(
          (enrollments ?? []).map((enrollment) => [
            enrollment.formation_id as string,
            Number(enrollment.progress ?? 0),
          ]),
        );
      }
    }

    const enrichedOrders = orders.map((order) => ({
      ...order,
      items: (order.items ?? []).map((item) => {
        if (item.item_type !== 'formation' || !item.formation_id) {
          return {
            ...item,
            formation_authorized: null,
            formation_progress: null,
          };
        }

        const progress = progressByFormationId.get(item.formation_id);
        return {
          ...item,
          formation_authorized: typeof progress === 'number',
          formation_progress: typeof progress === 'number' ? progress : 0,
        };
      }),
    }));

    return NextResponse.json(enrichedOrders);
  } catch (error) {
    console.error('User orders fetch error:', error);
    return NextResponse.json(
      { error: 'Impossible de recuperer vos commandes.' },
      { status: 500 },
    );
  }
}
