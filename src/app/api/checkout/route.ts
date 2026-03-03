import { sendOrderCreatedEmail } from '@/lib/email/orders';
import { appendTrackingEvent } from '@/lib/orders/tracking';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CartItemType = 'produit' | 'formation' | 'video';
type PaymentInputMethod = 'card' | 'paypal';
type PaymentProvider = 'stripe' | 'paypal';

interface CheckoutCartItemRow {
  id: string;
  item_type: CartItemType;
  quantity: number;
  unit_price: number;
  produit_id: string | null;
  formation_id: string | null;
  video_id: string | null;
  produit?: {
    id: string;
    name: string;
    slug: string;
    is_digital: boolean;
    status: string;
    stock: number | null;
  } | null;
  formation?: {
    id: string;
    title: string;
    slug: string;
    status: string;
    is_free: boolean;
  } | null;
  video?: {
    id: string;
    title: string;
    slug: string;
    status: string;
  } | null;
}

interface ShippingAddress {
  first_name: string;
  last_name: string;
  email: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  phone: string | null;
}

interface ClientCheckoutItemInput {
  item_type: CartItemType;
  item_id: string;
  quantity: number;
  unit_price: number;
}

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function parseBody(payload: unknown) {
  const record = typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : {};
  const shippingRaw =
    typeof record.shipping === 'object' && record.shipping !== null
      ? record.shipping as Record<string, unknown>
      : {};
  const paymentMethodRaw =
    typeof record.paymentMethod === 'string' ? record.paymentMethod.toLowerCase().trim() : 'card';
  const paymentMethod: PaymentInputMethod = paymentMethodRaw === 'paypal' ? 'paypal' : 'card';

  const shipping: ShippingAddress = {
    first_name: normalizeText(shippingRaw.first_name ?? shippingRaw.firstName, 80),
    last_name: normalizeText(shippingRaw.last_name ?? shippingRaw.lastName, 80),
    email: normalizeText(shippingRaw.email, 160).toLowerCase(),
    address: normalizeText(shippingRaw.address, 200),
    city: normalizeText(shippingRaw.city, 120),
    postal_code: normalizeText(shippingRaw.postal_code ?? shippingRaw.postalCode, 24),
    country: normalizeText(shippingRaw.country, 80),
    phone: normalizeText(shippingRaw.phone, 40) || null,
  };

  const cartItemsRaw = Array.isArray(record.cart_items)
    ? record.cart_items
    : Array.isArray(record.cartItems)
      ? record.cartItems
      : [];

  const merged = new Map<string, ClientCheckoutItemInput>();
  cartItemsRaw.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    const row = entry as Record<string, unknown>;
    const itemType = typeof row.item_type === 'string' ? row.item_type : row.itemType;
    if (itemType !== 'produit' && itemType !== 'formation' && itemType !== 'video') return;
    const itemIdRaw = typeof row.item_id === 'string' ? row.item_id : row.itemId;
    if (typeof itemIdRaw !== 'string') return;
    const itemId = itemIdRaw.trim();
    if (!itemId) return;

    const rawQuantity = Number(row.quantity ?? 1);
    const quantity = Number.isFinite(rawQuantity) ? Math.max(1, Math.floor(rawQuantity)) : 1;
    const rawUnitPrice = Number(row.unit_price ?? row.unitPrice ?? 0);
    const unitPrice = Number.isFinite(rawUnitPrice) ? Math.max(0, rawUnitPrice) : 0;

    const key = `${itemType}:${itemId}`;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity = Math.max(1, existing.quantity + quantity);
      return;
    }

    merged.set(key, {
      item_type: itemType,
      item_id: itemId,
      quantity,
      unit_price: unitPrice,
    });
  });

  return { paymentMethod, shipping, cartItems: Array.from(merged.values()) };
}

function getItemName(item: CheckoutCartItemRow) {
  if (item.item_type === 'produit') return item.produit?.name ?? 'Produit';
  if (item.item_type === 'formation') return item.formation?.title ?? 'Formation';
  return item.video?.title ?? 'Video';
}

function getPaymentProvider(method: PaymentInputMethod): PaymentProvider {
  return method === 'paypal' ? 'paypal' : 'stripe';
}

function buildInitialItemWorkflow(item: CheckoutCartItemRow, nowIso: string) {
  const paidTimeline = appendTrackingEvent([], {
    status: 'paid',
    at: nowIso,
    label: 'Paiement valide',
  });

  if (item.item_type === 'formation') {
    return {
      item_status: 'paid',
      authorized_at: null,
      processing_at: null,
      shipped_at: null,
      delivered_at: null,
      cancelled_at: null,
      tracking_timeline: appendTrackingEvent(paidTimeline, {
        status: 'paid',
        at: nowIso,
        label: 'En attente d autorisation formation',
      }),
    };
  }

  if (item.item_type === 'video' || (item.item_type === 'produit' && item.produit?.is_digital)) {
    return {
      item_status: 'delivered',
      authorized_at: null,
      processing_at: null,
      shipped_at: null,
      delivered_at: nowIso,
      cancelled_at: null,
      tracking_timeline: appendTrackingEvent(paidTimeline, {
        status: 'delivered',
        at: nowIso,
        label: 'Livre automatiquement (numerique)',
      }),
    };
  }

  return {
    item_status: 'paid',
    authorized_at: null,
    processing_at: null,
    shipped_at: null,
    delivered_at: null,
    cancelled_at: null,
    tracking_timeline: paidTimeline,
  };
}

async function buildCartItemsFromClientPayload(
  inputItems: ClientCheckoutItemInput[],
): Promise<CheckoutCartItemRow[]> {
  if (inputItems.length === 0) return [];

  const productIds = Array.from(
    new Set(inputItems.filter((item) => item.item_type === 'produit').map((item) => item.item_id)),
  );
  const formationIds = Array.from(
    new Set(inputItems.filter((item) => item.item_type === 'formation').map((item) => item.item_id)),
  );
  const videoIds = Array.from(
    new Set(inputItems.filter((item) => item.item_type === 'video').map((item) => item.item_id)),
  );

  const productsById = new Map<
    string,
    {
      id: string;
      name: string;
      slug: string;
      is_digital: boolean;
      status: string;
      stock: number | null;
      price: number | null;
    }
  >();
  const formationsById = new Map<
    string,
    {
      id: string;
      title: string;
      slug: string;
      status: string;
      is_free: boolean;
      price: number | null;
    }
  >();
  const videosById = new Map<
    string,
    {
      id: string;
      title: string;
      slug: string;
      status: string;
      price: number | null;
    }
  >();

  if (productIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('produits')
      .select('id,name,slug,is_digital,status,stock,price')
      .in('id', productIds);
    (data ?? []).forEach((row) => {
      productsById.set(row.id as string, {
        id: row.id as string,
        name: (row.name as string) ?? 'Produit',
        slug: (row.slug as string) ?? '',
        is_digital: Boolean(row.is_digital),
        status: (row.status as string) ?? 'draft',
        stock: typeof row.stock === 'number' ? row.stock : null,
        price: typeof row.price === 'number' ? row.price : null,
      });
    });
  }

  if (formationIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('formations')
      .select('id,title,slug,status,is_free,price')
      .in('id', formationIds);
    (data ?? []).forEach((row) => {
      formationsById.set(row.id as string, {
        id: row.id as string,
        title: (row.title as string) ?? 'Formation',
        slug: (row.slug as string) ?? '',
        status: (row.status as string) ?? 'draft',
        is_free: Boolean(row.is_free),
        price: typeof row.price === 'number' ? row.price : null,
      });
    });
  }

  if (videoIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('videos')
      .select('id,title,slug,status,price')
      .in('id', videoIds);
    (data ?? []).forEach((row) => {
      videosById.set(row.id as string, {
        id: row.id as string,
        title: (row.title as string) ?? 'Video',
        slug: (row.slug as string) ?? '',
        status: (row.status as string) ?? 'draft',
        price: typeof row.price === 'number' ? row.price : null,
      });
    });
  }

  return inputItems.map((item, index) => {
    if (item.item_type === 'produit') {
      const product = productsById.get(item.item_id);
      return {
        id: `client:produit:${item.item_id}:${index}`,
        item_type: 'produit' as const,
        quantity: Math.max(1, Number(item.quantity || 1)),
        unit_price: Number(product?.price ?? item.unit_price ?? 0),
        produit_id: item.item_id,
        formation_id: null,
        video_id: null,
        produit: product
          ? {
              id: product.id,
              name: product.name,
              slug: product.slug,
              is_digital: product.is_digital,
              status: product.status,
              stock: product.stock,
            }
          : null,
        formation: null,
        video: null,
      } satisfies CheckoutCartItemRow;
    }

    if (item.item_type === 'formation') {
      const formation = formationsById.get(item.item_id);
      return {
        id: `client:formation:${item.item_id}:${index}`,
        item_type: 'formation' as const,
        quantity: Math.max(1, Number(item.quantity || 1)),
        unit_price: Number(formation ? (formation.is_free ? 0 : formation.price ?? 0) : item.unit_price ?? 0),
        produit_id: null,
        formation_id: item.item_id,
        video_id: null,
        produit: null,
        formation: formation
          ? {
              id: formation.id,
              title: formation.title,
              slug: formation.slug,
              status: formation.status,
              is_free: formation.is_free,
            }
          : null,
        video: null,
      } satisfies CheckoutCartItemRow;
    }

    const video = videosById.get(item.item_id);
    return {
      id: `client:video:${item.item_id}:${index}`,
      item_type: 'video' as const,
      quantity: Math.max(1, Number(item.quantity || 1)),
      unit_price: Number(video?.price ?? item.unit_price ?? 0),
      produit_id: null,
      formation_id: null,
      video_id: item.item_id,
      produit: null,
      formation: null,
      video: video
        ? {
            id: video.id,
            title: video.title,
            slug: video.slug,
            status: video.status,
          }
        : null,
    } satisfies CheckoutCartItemRow;
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Payload JSON invalide.' }, { status: 400 });
    }

    const { paymentMethod, shipping, cartItems: clientCartItems } = parseBody(body);

    const { data: userCart, error: cartError } = await supabaseAdmin
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (cartError) {
      throw cartError;
    }

    let userCartId = userCart?.id ?? null;
    if (!userCartId) {
      const { data: createdCart, error: createCartError } = await supabaseAdmin
        .from('carts')
        .insert({ user_id: user.id, session_id: null })
        .select('id')
        .single();

      if (createCartError) {
        throw createCartError;
      }

      userCartId = createdCart.id;
    }

    const { data: dbCartItemsRaw, error: cartItemsError } = await supabaseAdmin
      .from('cart_items')
      .select(
        `
          id,
          item_type,
          quantity,
          unit_price,
          produit_id,
          formation_id,
          video_id,
          produit:produits(id,name,slug,is_digital,status,stock),
          formation:formations(id,title,slug,status,is_free),
          video:videos(id,title,slug,status)
        `,
      )
      .eq('cart_id', userCartId)
      .order('added_at', { ascending: true });

    if (cartItemsError) {
      throw cartItemsError;
    }

    const hasDbCartItems = (dbCartItemsRaw ?? []).length > 0;
    const cartItems = hasDbCartItems
      ? ((dbCartItemsRaw ?? []) as CheckoutCartItemRow[])
      : await buildCartItemsFromClientPayload(clientCartItems);

    if (cartItems.length === 0) {
      return NextResponse.json({ error: 'Votre panier est vide.' }, { status: 400 });
    }

    const unavailableItems = cartItems.filter((item) => {
      if (item.item_type === 'produit') {
        return !item.produit || item.produit.status !== 'published';
      }
      if (item.item_type === 'formation') {
        return !item.formation || item.formation.status !== 'published';
      }
      return !item.video || item.video.status !== 'published';
    });

    if (unavailableItems.length > 0) {
      return NextResponse.json(
        {
          error: 'Certains articles ne sont plus disponibles.',
          unavailableItems: unavailableItems.map(getItemName),
        },
        { status: 409 },
      );
    }

    const insufficientStockItems = cartItems
      .filter((item) => item.item_type === 'produit')
      .map((item) => {
        const available = item.produit?.stock;
        const requested = Math.max(1, Number(item.quantity || 1));
        if (available === null || typeof available !== 'number') {
          return null;
        }
        if (requested <= available) {
          return null;
        }
        return {
          name: getItemName(item),
          requested,
          available,
        };
      })
      .filter(
        (
          item,
        ): item is {
          name: string;
          requested: number;
          available: number;
        } => Boolean(item),
      );

    if (insufficientStockItems.length > 0) {
      return NextResponse.json(
        {
          error: 'Quantite demandee superieure au stock disponible.',
          items: insufficientStockItems,
        },
        { status: 409 },
      );
    }

    const hasPhysicalProducts = cartItems.some(
      (item) => item.item_type === 'produit' && !item.produit?.is_digital,
    );

    if (!shipping.first_name || !shipping.last_name || !shipping.country) {
      return NextResponse.json(
        { error: 'Informations de livraison incompletes.' },
        { status: 400 },
      );
    }

    if (!shipping.email || !EMAIL_PATTERN.test(shipping.email)) {
      return NextResponse.json({ error: 'Adresse email invalide.' }, { status: 400 });
    }

    if (hasPhysicalProducts && (!shipping.address || !shipping.city || !shipping.postal_code)) {
      return NextResponse.json(
        { error: 'Adresse de livraison obligatoire pour les produits physiques.' },
        { status: 400 },
      );
    }

    const subtotal = cartItems.reduce(
      (sum, item) => sum + Number(item.unit_price || 0) * Math.max(1, Number(item.quantity || 1)),
      0,
    );
    const shippingCost = hasPhysicalProducts ? (subtotal >= 100 ? 0 : 9.9) : 0;
    const discountAmount = 0;
    const taxAmount = 0;
    const totalAmount = Math.max(0, subtotal + shippingCost + taxAmount - discountAmount);
    const provider = getPaymentProvider(paymentMethod);
    const nowIso = new Date().toISOString();

    const initialTrackingTimeline = appendTrackingEvent([], {
      status: 'paid',
      at: nowIso,
      label: 'Paiement confirme',
      note: 'Paiement simule (mode test)',
    });

    const { data: order, error: orderError } = await supabaseAdmin
      .from('commandes')
      .insert({
        user_id: user.id,
        status: 'paid',
        subtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        currency: 'USD',
        shipping_address: {
          ...shipping,
          shipping_cost: shippingCost,
          has_physical_products: hasPhysicalProducts,
        },
        payment_method: provider,
        estimated_delivery_at: null,
        processing_at: null,
        shipped_at: null,
        delivered_at: null,
        cancelled_at: null,
        tracking_timeline: initialTrackingTimeline,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select(
        `
          id,
          user_id,
          status,
          total_amount,
          currency,
          shipping_address,
          estimated_delivery_at,
          processing_at,
          shipped_at,
          delivered_at,
          cancelled_at,
          tracking_timeline,
          created_at
        `,
      )
      .single();

    if (orderError) {
      throw orderError;
    }

    const orderItemsPayload = cartItems.map((item) => {
      const workflow = buildInitialItemWorkflow(item, nowIso);
      return {
        commande_id: order.id,
        item_type: item.item_type,
        produit_id: item.item_type === 'produit' ? item.produit_id : null,
        formation_id: item.item_type === 'formation' ? item.formation_id : null,
        video_id: item.item_type === 'video' ? item.video_id : null,
        quantity: Math.max(1, Number(item.quantity || 1)),
        unit_price: Number(item.unit_price || 0),
        total_price: Number(item.unit_price || 0) * Math.max(1, Number(item.quantity || 1)),
        item_status: workflow.item_status,
        authorized_at: workflow.authorized_at,
        processing_at: workflow.processing_at,
        shipped_at: workflow.shipped_at,
        delivered_at: workflow.delivered_at,
        cancelled_at: workflow.cancelled_at,
        tracking_timeline: workflow.tracking_timeline,
        created_at: nowIso,
        updated_at: nowIso,
      };
    });

    const { error: orderItemsError } = await supabaseAdmin
      .from('commande_items')
      .insert(orderItemsPayload);

    if (orderItemsError) {
      await supabaseAdmin.from('commandes').delete().eq('id', order.id);
      throw orderItemsError;
    }

    const simulatedReference = `SIM-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('paiements')
      .insert({
        user_id: user.id,
        commande_id: order.id,
        amount: totalAmount,
        provider,
        status: 'success',
        metadata: {
          simulated: true,
          simulated_reference: simulatedReference,
          simulated_at: nowIso,
        },
      })
      .select('id')
      .single();

    if (paymentError) {
      console.error('Payment insert warning:', paymentError);
    } else if (payment?.id) {
      const { error: updatePaymentRefError } = await supabaseAdmin
        .from('commandes')
        .update({ payment_id: payment.id, updated_at: nowIso })
        .eq('id', order.id);

      if (updatePaymentRefError) {
        console.error('Order payment_id update warning:', updatePaymentRefError);
      }
    }

    if (hasDbCartItems) {
      const { error: clearCartError } = await supabaseAdmin
        .from('cart_items')
        .delete()
        .eq('cart_id', userCartId);

      if (clearCartError) {
        console.error('Cart clear primary attempt failed:', clearCartError);

        const cartItemIds = cartItems.map((item) => item.id).filter((id) => !id.startsWith('client:'));
        if (cartItemIds.length > 0) {
          const { error: fallbackClearError } = await supabaseAdmin
            .from('cart_items')
            .delete()
            .in('id', cartItemIds);

          if (fallbackClearError) {
            console.error('Cart clear fallback attempt failed:', fallbackClearError);
            throw new Error('Panier non vide apres paiement.');
          }
        } else {
          throw new Error('Panier non vide apres paiement.');
        }
      }
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    try {
      await sendOrderCreatedEmail({
        to: shipping.email || user.email || '',
        customerName:
          `${shipping.first_name} ${shipping.last_name}`.trim() ||
          profile?.full_name ||
          'Client',
        orderId: order.id,
        totalAmount,
        currency: 'USD',
        items: cartItems.map((item) => ({
          itemName: getItemName(item),
          quantity: Math.max(1, Number(item.quantity || 1)),
          totalPrice: Number(item.unit_price || 0) * Math.max(1, Number(item.quantity || 1)),
        })),
      });
    } catch (emailError) {
      console.error('Order created email error:', emailError);
    }

    const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'create',
      table_name: 'commandes',
      record_id: order.id,
      new_data: {
        simulated_payment: true,
        payment_provider: provider,
        item_count: orderItemsPayload.length,
      },
    });

    if (auditError) {
      console.error('Checkout audit log warning:', auditError);
    }

    return NextResponse.json({
      orderId: order.id,
      status: 'paid',
      totalAmount,
      currency: 'USD',
      estimatedDeliveryAt: order.estimated_delivery_at,
      message:
        "Paiement simule valide. Votre commande est en traitement. La livraison peut durer jusqu'a 24h maximum.",
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Impossible de finaliser le paiement pour le moment.' },
      { status: 500 },
    );
  }
}
