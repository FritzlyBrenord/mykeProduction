import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { buildTrackingTimelineFromOrder } from '@/lib/orders/tracking';
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
        console.error('User orders payment fetch warning:', paymentError);
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
      payment: paymentByOrder.get(order.id) ?? null,
      tracking_timeline: buildTrackingTimelineFromOrder(order),
      items: (order.items ?? []).map((item) => {
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
