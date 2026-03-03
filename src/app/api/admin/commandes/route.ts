import { supabaseAdmin } from '@/lib/supabase-admin';
import { buildTrackingTimelineFromOrder } from '@/lib/orders/tracking';
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
          estimated_delivery_at,
          processing_at,
          shipped_at,
          delivered_at,
          cancelled_at,
          tracking_timeline,
          created_at,
          updated_at,
          user:profiles(
            id,
            full_name,
            avatar_url,
            role,
            country,
            bio,
            is_active,
            two_fa_enabled,
            created_at
          ),
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

    const orders = (data ?? []) as Array<{
      id: string;
      status: string;
      created_at: string;
      processing_at: string | null;
      shipped_at: string | null;
      delivered_at: string | null;
      cancelled_at: string | null;
      tracking_timeline: unknown;
    }>;

    const orderIds = orders.map((order) => order.id);

    const paymentByOrder = new Map<
      string,
      {
        id: string;
        provider: 'stripe' | 'paypal';
        status: string | null;
        amount: number;
        metadata: Record<string, unknown> | null;
        created_at: string;
      }
    >();

    if (orderIds.length > 0) {
      const { data: payments, error: paymentError } = await supabaseAdmin
        .from('paiements')
        .select('id,commande_id,provider,status,amount,metadata,created_at')
        .in('commande_id', orderIds)
        .order('created_at', { ascending: false });

      if (paymentError) {
        console.error('Admin orders payment fetch warning:', paymentError);
      } else {
        (payments ?? []).forEach((payment) => {
          const orderId = payment.commande_id as string | null;
          if (!orderId || paymentByOrder.has(orderId)) return;

          paymentByOrder.set(orderId, {
            id: payment.id as string,
            provider: (payment.provider as 'stripe' | 'paypal') || 'stripe',
            status: (payment.status as string | null) ?? null,
            amount: Number(payment.amount || 0),
            metadata:
              payment.metadata && typeof payment.metadata === 'object'
                ? (payment.metadata as Record<string, unknown>)
                : null,
            created_at: payment.created_at as string,
          });
        });
      }
    }

    return NextResponse.json(
      orders.map((order) => ({
        ...order,
        payment: paymentByOrder.get(order.id) ?? null,
        tracking_timeline: buildTrackingTimelineFromOrder(order),
        items: ((order as { items?: Array<Record<string, unknown>> }).items ?? []).map((item) => ({
          ...item,
          item_status: typeof item.item_status === 'string' ? item.item_status : 'paid',
        })),
      })),
    );
  } catch (error) {
    console.error('Commandes fetch error:', error);
    return NextResponse.json(
      { error: 'Impossible de recuperer les commandes.' },
      { status: 500 },
    );
  }
}
