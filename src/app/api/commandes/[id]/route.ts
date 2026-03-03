import { createClient } from '@/lib/supabase/server';
import { buildTrackingTimelineFromOrder } from '@/lib/orders/tracking';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: orderData, error: orderError } = await supabaseAdmin
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
          estimated_delivery_at,
          processing_at,
          shipped_at,
          delivered_at,
          cancelled_at,
          tracking_timeline,
          created_at,
          updated_at,
          items:commande_items(
            id,
            commande_id,
            produit_id,
            formation_id,
            video_id,
            item_type,
            item_status,
            authorized_at,
            processing_at,
            shipped_at,
            delivered_at,
            cancelled_at,
            tracking_timeline,
            quantity,
            unit_price,
            total_price,
            produit:produits(id,name,slug,images,is_digital,type),
            formation:formations(id,title,slug,thumbnail_url,is_free),
            video:videos(id,title,slug,thumbnail_url)
          )
        `,
      )
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (orderError) {
      throw orderError;
    }

    if (!orderData) {
      return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 });
    }

    const order = orderData as {
      id: string;
      status: string;
      created_at: string;
      processing_at: string | null;
      shipped_at: string | null;
      delivered_at: string | null;
      cancelled_at: string | null;
      tracking_timeline: unknown;
      items?: Array<{
        item_type: 'produit' | 'formation' | 'video';
        formation_id: string | null;
        authorized_at?: string | null;
      }>;
    };

    const { data: paymentRows, error: paymentError } = await supabaseAdmin
      .from('paiements')
      .select('id,commande_id,provider,status,amount,metadata,created_at')
      .eq('commande_id', order.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (paymentError) {
      console.error('Single order payment fetch warning:', paymentError);
    }

    const payment = (paymentRows ?? [])[0]
      ? {
          id: paymentRows?.[0]?.id as string,
          provider: (paymentRows?.[0]?.provider as 'stripe' | 'paypal') || 'stripe',
          status: (paymentRows?.[0]?.status as string | null) ?? null,
          amount: Number(paymentRows?.[0]?.amount || 0),
          metadata:
            paymentRows?.[0]?.metadata && typeof paymentRows[0].metadata === 'object'
              ? (paymentRows[0].metadata as Record<string, unknown>)
              : null,
          created_at: paymentRows?.[0]?.created_at as string,
        }
      : null;

    const formationIds = Array.from(
      new Set(
        (order.items ?? [])
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

    const enrichedOrder = {
      ...orderData,
      payment,
      tracking_timeline: buildTrackingTimelineFromOrder(order),
      items: (orderData.items ?? []).map((item) => {
        const itemStatus = typeof (item as { item_status?: unknown }).item_status === 'string'
          ? (item as { item_status: string }).item_status
          : 'paid';
        if (item.item_type !== 'formation' || !item.formation_id) {
          return {
            ...item,
            item_status: itemStatus,
            formation_authorized: null,
            formation_progress: null,
          };
        }

        const progress = progressByFormationId.get(item.formation_id);
        const itemAuthorized = typeof item.authorized_at === 'string' && item.authorized_at.length > 0;
        return {
          ...item,
          item_status: itemStatus,
          formation_authorized: itemAuthorized || typeof progress === 'number',
          formation_progress: typeof progress === 'number' ? progress : 0,
        };
      }),
    };

    return NextResponse.json(enrichedOrder);
  } catch (error) {
    console.error('Single user order fetch error:', error);
    return NextResponse.json(
      { error: 'Impossible de recuperer cette commande.' },
      { status: 500 },
    );
  }
}
