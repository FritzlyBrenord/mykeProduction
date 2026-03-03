import { sendOrderAuthorizedEmail } from '@/lib/email/orders';
import {
  appendTrackingEvent,
  canTransitionOrderItemStatus,
  deriveOrderStatusFromItems,
  orderItemStatusLabel,
  orderStatusLabel,
} from '@/lib/orders/tracking';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ITEM_STATUSES = new Set([
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]);

type ItemType = 'produit' | 'formation' | 'video';

interface OrderItemWorkflow {
  id: string;
  item_type: ItemType;
  item_status: string | null;
  formation_id: string | null;
  authorized_at: string | null;
  processing_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  tracking_timeline: unknown;
  formation: { title: string } | null;
  produit: { type: 'chimique' | 'document' | 'autre' | null; is_digital: boolean | null } | null;
}

interface OrderWithItems {
  id: string;
  user_id: string;
  status: string;
  shipping_address: Record<string, unknown> | null;
  tracking_timeline: unknown;
  estimated_delivery_at: string | null;
  processing_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  user: { full_name: string | null } | null;
  items: OrderItemWorkflow[];
}

function shippingField(shipping: Record<string, unknown> | null, key: string) {
  const value = shipping?.[key];
  return typeof value === 'string' ? value : '';
}

function customerDisplayName(order: OrderWithItems) {
  const shippingName = `${shippingField(order.shipping_address, 'first_name')} ${shippingField(order.shipping_address, 'last_name')}`.trim();
  return order.user?.full_name || shippingName || 'Client';
}

function parseEstimatedDeliveryInput(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(`${trimmed}T18:00:00.000Z`);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function normalizeItemStatus(status: string | null | undefined) {
  if (!status) return 'paid';
  if (ALLOWED_ITEM_STATUSES.has(status)) return status;
  return 'paid';
}

function isPhysicalProductItem(item: OrderItemWorkflow) {
  return item.item_type === 'produit' && item.produit?.is_digital === false;
}

function resolveRequestedAction(payload: Record<string, unknown>) {
  const actionRaw =
    typeof payload.action === 'string'
      ? payload.action.trim().toLowerCase()
      : typeof payload.status === 'string'
        ? payload.status.trim().toLowerCase()
        : null;
  const authorize = payload.authorize === true || actionRaw === 'authorize';
  const requestedStatus = authorize ? null : actionRaw;
  return { authorize, requestedStatus };
}

function resolveTargetItems(
  order: OrderWithItems,
  itemId: string | null,
  authorize: boolean,
  requestedStatus: string | null,
) {
  if (itemId) {
    return order.items.filter((item) => item.id === itemId);
  }

  if (authorize) {
    return order.items.filter((item) => item.item_type === 'formation');
  }

  if (!requestedStatus) return [];

  if (requestedStatus === 'processing' || requestedStatus === 'shipped' || requestedStatus === 'delivered') {
    return order.items.filter((item) => isPhysicalProductItem(item));
  }

  if (requestedStatus === 'cancelled' || requestedStatus === 'refunded') {
    return order.items;
  }

  if (requestedStatus === 'paid') {
    return order.items;
  }

  return [];
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

    const payload = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
    const { authorize, requestedStatus } = resolveRequestedAction(payload);
    const itemIdRaw = payload.itemId ?? payload.item_id;
    const itemId = typeof itemIdRaw === 'string' && itemIdRaw.trim().length > 0 ? itemIdRaw.trim() : null;

    const estimatedDeliveryRaw = payload.estimatedDeliveryAt ?? payload.estimated_delivery_at;
    const estimatedDeliveryAt = parseEstimatedDeliveryInput(estimatedDeliveryRaw);
    const trackingNote =
      typeof payload.note === 'string' && payload.note.trim().length > 0
        ? payload.note.trim().slice(0, 240)
        : undefined;

    if (requestedStatus && !ALLOWED_ITEM_STATUSES.has(requestedStatus)) {
      return NextResponse.json({ error: 'Statut item invalide.' }, { status: 400 });
    }

    if (!authorize && !requestedStatus && estimatedDeliveryRaw == null) {
      return NextResponse.json({ error: 'Aucune action a appliquer.' }, { status: 400 });
    }

    if (estimatedDeliveryRaw != null && !estimatedDeliveryAt) {
      return NextResponse.json(
        { error: 'Date de livraison prevue invalide.' },
        { status: 400 },
      );
    }

    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('commandes')
      .select(
        `
          id,
          user_id,
          status,
          shipping_address,
          tracking_timeline,
          estimated_delivery_at,
          processing_at,
          shipped_at,
          delivered_at,
          cancelled_at,
          user:profiles(full_name),
          items:commande_items(
            id,
            item_type,
            item_status,
            formation_id,
            authorized_at,
            processing_at,
            shipped_at,
            delivered_at,
            cancelled_at,
            tracking_timeline,
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
    const targetItems = resolveTargetItems(order, itemId, authorize, requestedStatus);

    if (itemId && targetItems.length === 0) {
      return NextResponse.json({ error: 'Item introuvable dans la commande.' }, { status: 404 });
    }

    if ((authorize || requestedStatus) && targetItems.length === 0) {
      return NextResponse.json(
        { error: 'Aucun item compatible avec cette action dans la commande.' },
        { status: 409 },
      );
    }

    const nowIso = new Date().toISOString();
    const updatedItems = new Map<string, OrderItemWorkflow>();
    const authorizedFormationTitles: string[] = [];
    const authorizedFormationIds = new Set<string>();
    let itemMutations = 0;

    for (const item of targetItems) {
      const currentItemStatus = normalizeItemStatus(item.item_status);
      let nextItemStatus = currentItemStatus;

      if (authorize) {
        if (item.item_type !== 'formation' || !item.formation_id) {
          return NextResponse.json(
            { error: "L'action autoriser est reservee aux items formation." },
            { status: 409 },
          );
        }
        nextItemStatus = 'delivered';
      } else if (requestedStatus) {
        nextItemStatus = requestedStatus;
      }

      if (!canTransitionOrderItemStatus(currentItemStatus, nextItemStatus)) {
        return NextResponse.json(
          {
            error: `Transition item invalide: ${orderItemStatusLabel(currentItemStatus)} -> ${orderItemStatusLabel(nextItemStatus)}.`,
          },
          { status: 409 },
        );
      }

      if (currentItemStatus === nextItemStatus && !authorize) {
        continue;
      }

      const nextTimeline = appendTrackingEvent(item.tracking_timeline, {
        status: nextItemStatus as
          | 'paid'
          | 'processing'
          | 'shipped'
          | 'delivered'
          | 'cancelled'
          | 'refunded',
        at: nowIso,
        label:
          authorize && item.item_type === 'formation'
            ? 'Formation autorisee'
            : orderItemStatusLabel(nextItemStatus),
        note: trackingNote,
      });

      const updateItemPayload: Record<string, unknown> = {
        item_status: nextItemStatus,
        tracking_timeline: nextTimeline,
        updated_at: nowIso,
      };

      if (authorize && item.item_type === 'formation') {
        updateItemPayload.authorized_at = item.authorized_at || nowIso;
      }
      if (nextItemStatus === 'processing' && !item.processing_at) {
        updateItemPayload.processing_at = nowIso;
      }
      if (nextItemStatus === 'shipped' && !item.shipped_at) {
        updateItemPayload.shipped_at = nowIso;
      }
      if (nextItemStatus === 'delivered' && !item.delivered_at) {
        updateItemPayload.delivered_at = nowIso;
      }
      if ((nextItemStatus === 'cancelled' || nextItemStatus === 'refunded') && !item.cancelled_at) {
        updateItemPayload.cancelled_at = nowIso;
      }

      const { error: updateItemError } = await supabaseAdmin
        .from('commande_items')
        .update(updateItemPayload)
        .eq('id', item.id);

      if (updateItemError) {
        throw updateItemError;
      }

      itemMutations += 1;
      updatedItems.set(item.id, {
        ...item,
        item_status: nextItemStatus,
        authorized_at:
          typeof updateItemPayload.authorized_at === 'string'
            ? (updateItemPayload.authorized_at as string)
            : item.authorized_at,
        processing_at:
          typeof updateItemPayload.processing_at === 'string'
            ? (updateItemPayload.processing_at as string)
            : item.processing_at,
        shipped_at:
          typeof updateItemPayload.shipped_at === 'string'
            ? (updateItemPayload.shipped_at as string)
            : item.shipped_at,
        delivered_at:
          typeof updateItemPayload.delivered_at === 'string'
            ? (updateItemPayload.delivered_at as string)
            : item.delivered_at,
        cancelled_at:
          typeof updateItemPayload.cancelled_at === 'string'
            ? (updateItemPayload.cancelled_at as string)
            : item.cancelled_at,
        tracking_timeline: nextTimeline,
      });

      if (authorize && item.item_type === 'formation' && item.formation_id) {
        authorizedFormationIds.add(item.formation_id);
        authorizedFormationTitles.push(item.formation?.title ?? 'Formation');
      }
    }

    if (authorize && authorizedFormationIds.size > 0) {
      const enrollmentPayload = Array.from(authorizedFormationIds).map((formationId) => ({
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

      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
        const customerEmail = shippingField(order.shipping_address, 'email');
        const emailTo = authUser?.user?.email ?? customerEmail;
        if (emailTo) {
          await sendOrderAuthorizedEmail({
            to: emailTo,
            customerName: customerDisplayName(order),
            orderId: order.id,
            unlockedFormations: authorizedFormationTitles,
          });
        }
      } catch (emailError) {
        console.error('Order authorized email error:', emailError);
      }
    }

    const nextItems = order.items.map((item) => updatedItems.get(item.id) ?? item);
    const nextOrderStatus = deriveOrderStatusFromItems(
      nextItems.map((item) => ({ item_status: normalizeItemStatus(item.item_status) })),
    );
    const statusHasChanged = nextOrderStatus !== order.status;

    const orderUpdatePayload: Record<string, unknown> = {
      status: nextOrderStatus,
      updated_at: nowIso,
      tracking_timeline: statusHasChanged
        ? appendTrackingEvent(order.tracking_timeline, {
            status: nextOrderStatus,
            at: nowIso,
            label: orderStatusLabel(nextOrderStatus),
            note: trackingNote,
          })
        : order.tracking_timeline,
    };

    if (estimatedDeliveryAt) {
      orderUpdatePayload.estimated_delivery_at = estimatedDeliveryAt;
    }

    if (statusHasChanged) {
      if (nextOrderStatus === 'processing' && !order.processing_at) {
        orderUpdatePayload.processing_at = nowIso;
      }
      if (nextOrderStatus === 'shipped' && !order.shipped_at) {
        orderUpdatePayload.shipped_at = nowIso;
      }
      if (nextOrderStatus === 'delivered' && !order.delivered_at) {
        orderUpdatePayload.delivered_at = nowIso;
      }
      if ((nextOrderStatus === 'cancelled' || nextOrderStatus === 'refunded') && !order.cancelled_at) {
        orderUpdatePayload.cancelled_at = nowIso;
      }
    }

    if (itemMutations === 0 && !estimatedDeliveryAt) {
      return NextResponse.json({ error: 'Aucune modification appliquee.' }, { status: 409 });
    }

    const { data: updatedOrder, error: updateOrderError } = await supabaseAdmin
      .from('commandes')
      .update(orderUpdatePayload)
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
          estimated_delivery_at,
          processing_at,
          shipped_at,
          delivered_at,
          cancelled_at,
          tracking_timeline,
          created_at,
          updated_at
        `,
      )
      .single();

    if (updateOrderError) {
      throw updateOrderError;
    }

    const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
      action: 'update',
      table_name: 'commandes',
      record_id: id,
      new_data: {
        event: authorize ? 'authorize_item' : 'update_item_status',
        item_id: itemId,
        requested_status: requestedStatus,
        authorized_count: authorizedFormationIds.size,
      },
    });

    if (auditError) {
      console.error('Order item workflow audit log error:', auditError);
    }

    return NextResponse.json({
      data: updatedOrder,
      message: authorize
        ? 'Formation autorisee pour cet item.'
        : estimatedDeliveryAt && itemMutations === 0
          ? 'Date de livraison prevue mise a jour.'
          : 'Workflow item de commande mis a jour.',
    });
  } catch (error) {
    console.error('Order status update error:', error);
    return NextResponse.json(
      { error: 'Impossible de mettre a jour la commande.' },
      { status: 500 },
    );
  }
}
