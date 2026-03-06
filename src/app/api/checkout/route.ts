import { getStripeServerClient, toStripeAmount } from '@/lib/stripe/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  calculateShippingQuote,
  detectCountryCode,
  normalizeCountryCode,
  sortShippingRules,
  type ShippingRule,
} from '@/lib/shipping';
import { NextRequest, NextResponse } from 'next/server';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CartItemType = 'produit' | 'formation' | 'video';
type PaymentInputMethod = 'card' | 'paypal';

interface CheckoutCartItemRow {
  id: string;
  item_type: CartItemType;
  quantity: number;
  unit_price: number;
  produit_id: string | null;
  formation_id: string | null;
  video_id: string | null;
  // Supabase relation payload may be a single object or an array depending on query typing.
  produit?: {
    id: string;
    name: string;
    slug: string;
    is_digital: boolean;
    status: string;
    stock: number | null;
  } | {
    id: string;
    name: string;
    slug: string;
    is_digital: boolean;
    status: string;
    stock: number | null;
  }[] | null;
  formation?: {
    id: string;
    title: string;
    slug: string;
    status: string;
    is_free: boolean;
  } | {
    id: string;
    title: string;
    slug: string;
    status: string;
    is_free: boolean;
  }[] | null;
  video?: {
    id: string;
    title: string;
    slug: string;
    status: string;
  } | {
    id: string;
    title: string;
    slug: string;
    status: string;
  }[] | null;
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
    country: normalizeCountryCode(shippingRaw.country),
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

function getSingleRelation<T>(relation: T | T[] | null | undefined): T | null {
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation ?? null;
}

function getItemName(item: CheckoutCartItemRow) {
  if (item.item_type === 'produit') return getSingleRelation(item.produit)?.name ?? 'Produit';
  if (item.item_type === 'formation') return getSingleRelation(item.formation)?.title ?? 'Formation';
  return getSingleRelation(item.video)?.title ?? 'Video';
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
    shipping.country =
      shipping.country || detectCountryCode(request.headers) || '';
    if (paymentMethod !== 'card') {
      return NextResponse.json(
        { error: 'Seul le paiement par carte est actuellement disponible.' },
        { status: 400 },
      );
    }

    const { data: userCarts, error: cartError } = await supabaseAdmin
      .from('carts')
      .select('id,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(10);

    if (cartError) {
      throw cartError;
    }

    let userCartId = (userCarts ?? [])[0]?.id ?? null;
    if (!userCartId) {
      const { data: createdCart, error: createCartError } = await (supabaseAdmin
        .from('carts') as any)
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
        return getSingleRelation(item.produit)?.status !== 'published';
      }
      if (item.item_type === 'formation') {
        return getSingleRelation(item.formation)?.status !== 'published';
      }
      return getSingleRelation(item.video)?.status !== 'published';
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
        const available = getSingleRelation(item.produit)?.stock;
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
      (item) => item.item_type === 'produit' && !getSingleRelation(item.produit)?.is_digital,
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

    // Dynamic Shipping Calculation
    let shippingCost = 0;
    let appliedShippingRule: { country_code: string; country_name: string } | null = null;
    if (hasPhysicalProducts) {
      const physicalSubtotal = cartItems
        .filter(item => item.item_type === 'produit' && !getSingleRelation(item.produit)?.is_digital)
        .reduce((sum, item) => sum + Number(item.unit_price || 0) * Math.max(1, Number(item.quantity || 1)), 0);

      const { data: rules } = await supabaseAdmin
        .from('shipping_settings')
        .select('country_code, country_name, base_fee, free_threshold, priority, is_active, created_at, updated_at');

      const quote = calculateShippingQuote({
        rules: sortShippingRules((rules ?? []) as ShippingRule[]),
        countryCode: shipping.country,
        physicalSubtotal,
        hasPhysicalProducts,
      });

      if (!quote.rule) {
        return NextResponse.json(
          { error: 'Aucune regle de livraison active ne correspond a ce pays. Activez la regle par defaut.' },
          { status: 400 },
        );
      }

      shippingCost = quote.shippingCost;
      appliedShippingRule = quote.rule
        ? {
            country_code: quote.rule.country_code,
            country_name: quote.rule.country_name,
          }
        : null;
    }

    const discountAmount = 0;
    const taxAmount = 0;
    const totalAmount = Math.max(0, subtotal + shippingCost + taxAmount - discountAmount);
    const nowIso = new Date().toISOString();
    const stripeAmount = toStripeAmount(totalAmount);
    if (stripeAmount <= 0) {
      return NextResponse.json(
        { error: 'Montant invalide pour le paiement.' },
        { status: 400 },
      );
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('commandes')
      .insert({
        user_id: user.id,
        status: 'pending',
        subtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        currency: 'USD',
        shipping_address: {
          ...shipping,
          shipping_cost: shippingCost,
          has_physical_products: hasPhysicalProducts,
          applied_shipping_rule: appliedShippingRule,
        },
        payment_method: 'stripe',
        estimated_delivery_at: null,
        processing_at: null,
        shipped_at: null,
        delivered_at: null,
        cancelled_at: null,
        tracking_timeline: [],
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

    const orderItemsPayload = cartItems.map((item) => ({
      commande_id: order.id,
      item_type: item.item_type,
      produit_id: item.item_type === 'produit' ? item.produit_id : null,
      formation_id: item.item_type === 'formation' ? item.formation_id : null,
      video_id: item.item_type === 'video' ? item.video_id : null,
      quantity: Math.max(1, Number(item.quantity || 1)),
      unit_price: Number(item.unit_price || 0),
      total_price: Number(item.unit_price || 0) * Math.max(1, Number(item.quantity || 1)),
      item_status: 'paid',
      authorized_at: null,
      processing_at: null,
      shipped_at: null,
      delivered_at: null,
      cancelled_at: null,
      tracking_timeline: [],
      created_at: nowIso,
      updated_at: nowIso,
    }));

    const { error: orderItemsError } = await (supabaseAdmin
      .from('commande_items') as any)
      .insert(orderItemsPayload);

    if (orderItemsError) {
      await supabaseAdmin.from('commandes').delete().eq('id', order.id);
      throw orderItemsError;
    }

    const { data: payment, error: paymentError } = await (supabaseAdmin
      .from('paiements') as any)
      .insert({
        user_id: user.id,
        commande_id: order.id,
        amount: totalAmount,
        provider: 'stripe',
        status: 'pending',
        metadata: {
          checkout_source: 'web',
          created_at: nowIso,
        },
      })
      .select('id')
      .single();

    if (paymentError) {
      await supabaseAdmin.from('commandes').delete().eq('id', order.id);
      throw paymentError;
    }

    const stripe = getStripeServerClient();
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create(
        {
          amount: stripeAmount,
          currency: 'usd',
          payment_method_types: ['card'],
          receipt_email: shipping.email || user.email || undefined,
          description: `Commande Myke Industrie ${String(order.id).slice(0, 8)}`,
          metadata: {
            order_id: order.id,
            user_id: user.id,
            payment_row_id: payment.id,
            has_physical_products: hasPhysicalProducts ? '1' : '0',
          },
        },
        {
          idempotencyKey: `checkout-order-${order.id}`,
        },
      );
    } catch (stripeError) {
      const stripeMessage = stripeError instanceof Error ? stripeError.message : 'Stripe error';
      const { error: pendingPaymentUpdateError } = await (supabaseAdmin
        .from('paiements') as any)
        .update({
          status: 'failed',
          metadata: {
            checkout_source: 'web',
            created_at: nowIso,
            stripe_init_error: stripeMessage,
            stripe_last_synced_at: new Date().toISOString(),
          },
        })
        .eq('id', payment.id);

      if (pendingPaymentUpdateError) {
        console.error('Stripe init failure metadata update warning:', pendingPaymentUpdateError);
      }

      return NextResponse.json(
        { error: 'Impossible de preparer le paiement pour le moment.' },
        { status: 502 },
      );
    }

    const { error: paymentMetadataUpdateError } = await (supabaseAdmin
      .from('paiements') as any)
      .update({
        metadata: {
          checkout_source: 'web',
          created_at: nowIso,
          stripe_payment_intent_id: paymentIntent.id,
          stripe_payment_intent_status: paymentIntent.status,
        },
      })
      .eq('id', payment.id);

    if (paymentMetadataUpdateError) {
      console.error('Payment metadata update warning:', paymentMetadataUpdateError);
    }

    const { error: orderPaymentRefError } = await supabaseAdmin
      .from('commandes')
      .update({ payment_id: payment.id, updated_at: nowIso })
      .eq('id', order.id);

    if (orderPaymentRefError) {
      console.error('Order payment_id update warning:', orderPaymentRefError);
    }

    const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'create',
      table_name: 'commandes',
      record_id: order.id,
      new_data: {
        checkout_mode: 'stripe',
        payment_provider: 'stripe',
        item_count: orderItemsPayload.length,
        payment_intent_id: paymentIntent.id,
      },
    });

    if (auditError) {
      console.error('Checkout audit log warning:', auditError);
    }

    return NextResponse.json({
      orderId: order.id,
      status: 'requires_payment',
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      totalAmount,
      currency: 'USD',
      estimatedDeliveryAt: null,
      message: 'Paiement initialise. Confirmez le paiement pour finaliser la commande.',
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Impossible de finaliser le paiement pour le moment.' },
      { status: 500 },
    );
  }
}
