import { sendOrderAuthorizedEmail } from '@/lib/email/orders';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORDER_STATUSES = new Set([
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]);

interface OrderWithItems {
  id: string;
  user_id: string;
  status: string;
  shipping_address: Record<string, unknown> | null;
  user: { full_name: string | null } | null;
  items: Array<{
    item_type: 'produit' | 'formation' | 'video';
    formation_id: string | null;
    formation: { title: string } | null;
    produit: { type: 'chimique' | 'document' | 'autre' | null; is_digital: boolean | null } | null;
  }>;
}

function shippingField(shipping: Record<string, unknown> | null, key: string) {
  const value = shipping?.[key];
  return typeof value === 'string' ? value : '';
}

function customerDisplayName(order: OrderWithItems) {
  const shippingName = `${shippingField(order.shipping_address, 'first_name')} ${shippingField(order.shipping_address, 'last_name')}`.trim();
  return order.user?.full_name || shippingName || 'Client';
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Payload JSON invalide.' }, { status: 400 });
    }

    const payload = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {};
    const authorize = payload.authorize === true;
    const requestedStatus =
      typeof payload.status === 'string' ? payload.status.trim().toLowerCase() : null;

    if (requestedStatus && !ALLOWED_ORDER_STATUSES.has(requestedStatus)) {
      return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 });
    }

    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('commandes')
      .select(
        `
          id,
          user_id,
          status,
          shipping_address,
          user:profiles(full_name),
          items:commande_items(
            item_type,
            formation_id,
            formation:formations(title),
            produit:produits(type,is_digital)
          )
        `,
      )
      .eq('id', id)
      .maybeSingle();

    if (orderError) {
      throw orderError;
    }

    if (!orderData) {
      return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 });
    }

    const order = orderData as unknown as OrderWithItems;
    const nowIso = new Date().toISOString();
    const hasChemicalPhysicalProducts = (order.items ?? []).some(
      (item) =>
        item.item_type === 'produit' &&
        item.produit?.type === 'chimique' &&
        item.produit?.is_digital === false,
    );

    if (authorize) {
      const formationsToAuthorize = new Map<string, string>();
      for (const item of order.items ?? []) {
        if (item.item_type !== 'formation' || !item.formation_id) continue;
        formationsToAuthorize.set(item.formation_id, item.formation?.title ?? 'Formation');
      }

      if (formationsToAuthorize.size > 0) {
        const enrollmentPayload = Array.from(formationsToAuthorize.keys()).map((formationId) => ({
          user_id: order.user_id,
          formation_id: formationId,
          progress: 0,
          enrolled_at: nowIso,
        }));

        const { error: enrollmentError } = await supabaseAdmin
          .from('enrollments')
          .upsert(enrollmentPayload, {
            onConflict: 'user_id,formation_id',
            ignoreDuplicates: true,
          });

        if (enrollmentError) {
          throw enrollmentError;
        }
      }

      const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
        action: 'update',
        table_name: 'commandes',
        record_id: id,
        new_data: {
          event: 'order_authorized',
          authorized_formations: Array.from(formationsToAuthorize.values()),
        },
      });

      if (auditError) {
        console.error('Order authorization audit log error:', auditError);
      }

      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
        const customerEmail = shippingField(order.shipping_address, 'email');
        const emailTo = authUser?.user?.email ?? customerEmail;
        if (emailTo) {
          await sendOrderAuthorizedEmail({
            to: emailTo,
            customerName: customerDisplayName(order),
            orderId: order.id,
            unlockedFormations: Array.from(formationsToAuthorize.values()),
          });
        }
      } catch (emailError) {
        console.error('Order authorized email error:', emailError);
      }
    }

    const nextStatus =
      requestedStatus ??
      (authorize && !hasChemicalPhysicalProducts ? 'delivered' : order.status);

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('commandes')
      .update({
        status: nextStatus,
        updated_at: nowIso,
      })
      .eq('id', id)
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
          updated_at
        `,
      )
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      data: updatedOrder,
      message: authorize
        ? "Commande autorisee. Le client a ete notifie par email."
        : 'Statut de commande mis a jour.',
    });
  } catch (error) {
    console.error('Order status update error:', error);
    return NextResponse.json(
      { error: 'Impossible de mettre a jour la commande.' },
      { status: 500 },
    );
  }
}
