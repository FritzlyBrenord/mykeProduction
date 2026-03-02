import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

interface EnrollmentRow {
  id: string;
  formation_id: string;
  enrolled_at: string;
  completed_at: string | null;
  progress: number | null;
  formation: {
    id: string;
    title: string;
    slug: string;
    thumbnail_url: string | null;
    duration_hours: number | null;
    language: string | null;
    level: string | null;
    is_free: boolean;
    price: number;
    created_at: string;
  } | null;
}

interface OrderRow {
  id: string;
  status: string;
  created_at: string;
  items: Array<{
    id: string;
    item_type: 'produit' | 'formation' | 'video';
    formation_id: string | null;
    total_price: number;
    formation: {
      id: string;
      title: string;
      slug: string;
      thumbnail_url: string | null;
      duration_hours: number | null;
      language: string | null;
      level: string | null;
      is_free: boolean;
      price: number;
      created_at: string;
    } | null;
  }>;
}

export async function GET() {
  try {
    console.log("API Compte Formations - Début requête");
    const supabase = await createClient();
    console.log("API Compte Formations - Client Supabase créé:", !!supabase);
    
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.log("API Compte Formations - Auth check:", { 
      user: !!user, 
      userId: user?.id,
      error: userError?.message 
    });

    if (userError || !user) {
      console.log("API Compte Formations - Non authentifié");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: enrollmentsRaw, error: enrollmentsError } = await supabaseAdmin
      .from('enrollments')
      .select(
        `
          id,
          formation_id,
          enrolled_at,
          completed_at,
          progress,
          formation:formations(
            id,
            title,
            slug,
            thumbnail_url,
            duration_hours,
            language,
            level,
            is_free,
            price,
            created_at
          )
        `,
      )
      .eq('user_id', user.id)
      .order('enrolled_at', { ascending: false });

    if (enrollmentsError) {
      throw enrollmentsError;
    }

    const enrollments = (enrollmentsRaw ?? []) as EnrollmentRow[];
    const authorizedFormationIds = new Set(
      enrollments.map((enrollment) => enrollment.formation_id),
    );

    const { data: ordersRaw, error: ordersError } = await supabaseAdmin
      .from('commandes')
      .select(
        `
          id,
          status,
          created_at,
          items:commande_items(
            id,
            item_type,
            formation_id,
            total_price,
            formation:formations(
              id,
              title,
              slug,
              thumbnail_url,
              duration_hours,
              language,
              level,
              is_free,
              price,
              created_at
            )
          )
        `,
      )
      .eq('user_id', user.id)
      .in('status', ['pending', 'paid', 'processing', 'shipped', 'delivered'])
      .order('created_at', { ascending: false });

    if (ordersError) {
      throw ordersError;
    }

    const pendingFormationById = new Map<
      string,
      {
        order_id: string;
        order_status: string;
        ordered_at: string;
        item_total_price: number;
        formation: NonNullable<OrderRow['items'][number]['formation']>;
      }
    >();

    const orders = (ordersRaw ?? []) as OrderRow[];
    for (const order of orders) {
      for (const item of order.items ?? []) {
        if (item.item_type !== 'formation' || !item.formation_id || !item.formation) {
          continue;
        }

        if (authorizedFormationIds.has(item.formation_id)) {
          continue;
        }

        if (pendingFormationById.has(item.formation_id)) {
          continue;
        }

        pendingFormationById.set(item.formation_id, {
          order_id: order.id,
          order_status: order.status,
          ordered_at: order.created_at,
          item_total_price: Number(item.total_price ?? 0),
          formation: item.formation,
        });
      }
    }

    return NextResponse.json({
      enrollments,
      pending_formations: Array.from(pendingFormationById.values()),
    });
  } catch (error) {
    console.error('Account formations fetch error:', error);
    return NextResponse.json(
      { error: 'Impossible de recuperer vos formations.' },
      { status: 500 },
    );
  }
}

