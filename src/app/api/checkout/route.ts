import { sendOrderCreatedEmail } from '@/lib/email/orders';
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

  return { paymentMethod, shipping };
}

function getItemName(item: CheckoutCartItemRow) {
  if (item.item_type === 'produit') return item.produit?.name ?? 'Produit';
  if (item.item_type === 'formation') return item.formation?.title ?? 'Formation';
  return item.video?.title ?? 'Video';
}

function getPaymentProvider(method: PaymentInputMethod): PaymentProvider {
  return method === 'paypal' ? 'paypal' : 'stripe';
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

    const { paymentMethod, shipping } = parseBody(body);

    const { data: userCart, error: cartError } = await supabaseAdmin
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (cartError) {
      throw cartError;
    }

    if (!userCart?.id) {
      return NextResponse.json({ error: 'Votre panier est vide.' }, { status: 400 });
    }

    const { data: cartItemsRaw, error: cartItemsError } = await supabaseAdmin
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
          produit:produits(id,name,slug,is_digital,status),
          formation:formations(id,title,slug,status,is_free),
          video:videos(id,title,slug,status)
        `,
      )
      .eq('cart_id', userCart.id)
      .order('added_at', { ascending: true });

    if (cartItemsError) {
      throw cartItemsError;
    }

    const cartItems = (cartItemsRaw ?? []) as CheckoutCartItemRow[];
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
      created_at: nowIso,
    }));

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

    const { error: clearCartError } = await supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('cart_id', userCart.id);

    if (clearCartError) {
      console.error('Cart clear primary attempt failed:', clearCartError);

      const cartItemIds = cartItems.map((item) => item.id).filter(Boolean);
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
