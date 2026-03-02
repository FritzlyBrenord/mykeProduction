'use client';

import { createClient } from '@/lib/supabase/client';
import { CartItem, Formation, Produit, Video } from '@/lib/types';
import { SupabaseClient } from '@supabase/supabase-js';
import React from 'react';
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

type CartItemType = 'produit' | 'formation' | 'video';

interface AddCartItemInput {
  item_type: CartItemType;
  item_id: string;
  unit_price: number;
  quantity?: number;
}

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  itemCount: number;
  totalPrice: number;
  addItem: (item: AddCartItemInput) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

interface GuestCartEntry {
  item_type: CartItemType;
  item_id: string;
  unit_price: number;
  quantity: number;
  added_at: string;
}

interface DbCartItemRow {
  id: string;
  cart_id: string;
  produit_id: string | null;
  formation_id: string | null;
  video_id: string | null;
  item_type: CartItemType;
  quantity: number;
  unit_price: number;
  added_at: string;
  produit?: Produit | null;
  formation?: Formation | null;
  video?: Video | null;
}

const LOCAL_CART_KEY = 'myke:guest-cart:v1';
const LOCAL_ITEM_PREFIX = 'local:';

const CartContext = createContext<CartContextType | undefined>(undefined);

function isBrowser() {
  return typeof window !== 'undefined';
}

function normalizeQuantity(value: number | undefined) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.floor(value || 1));
}

function localItemKey(entry: Pick<GuestCartEntry, 'item_type' | 'item_id'>) {
  return `${entry.item_type}:${entry.item_id}`;
}

function toLocalItemId(entry: Pick<GuestCartEntry, 'item_type' | 'item_id'>) {
  return `${LOCAL_ITEM_PREFIX}${localItemKey(entry)}`;
}

function parseLocalItemId(itemId: string) {
  if (!itemId.startsWith(LOCAL_ITEM_PREFIX)) return null;
  const payload = itemId.slice(LOCAL_ITEM_PREFIX.length);
  const [item_type, item_id] = payload.split(':');
  if (!item_type || !item_id) return null;
  if (item_type !== 'produit' && item_type !== 'formation' && item_type !== 'video') return null;
  return { item_type, item_id } as const;
}

function readGuestCart(): GuestCartEntry[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(LOCAL_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const sanitized = parsed
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const row = entry as Partial<GuestCartEntry>;
        if (
          row.item_type !== 'produit' &&
          row.item_type !== 'formation' &&
          row.item_type !== 'video'
        ) {
          return null;
        }
        if (typeof row.item_id !== 'string' || row.item_id.length === 0) return null;
        const unitPrice = Number(row.unit_price ?? 0);
        if (!Number.isFinite(unitPrice) || unitPrice < 0) return null;
        return {
          item_type: row.item_type,
          item_id: row.item_id,
          unit_price: unitPrice,
          quantity: normalizeQuantity(row.quantity),
          added_at: typeof row.added_at === 'string' ? row.added_at : new Date().toISOString(),
        } satisfies GuestCartEntry;
      })
      .filter((entry): entry is GuestCartEntry => Boolean(entry));

    const merged = new Map<string, GuestCartEntry>();
    sanitized.forEach((entry) => {
      const key = localItemKey(entry);
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, entry);
        return;
      }
      merged.set(key, {
        ...existing,
        quantity: normalizeQuantity(existing.quantity + entry.quantity),
      });
    });

    return Array.from(merged.values());
  } catch {
    return [];
  }
}

function writeGuestCart(items: GuestCartEntry[]) {
  if (!isBrowser()) return;
  try {
    if (items.length === 0) {
      window.localStorage.removeItem(LOCAL_CART_KEY);
      return;
    }
    window.localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
  } catch {
    // ignore local storage failures
  }
}

function clearGuestCartStorage() {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(LOCAL_CART_KEY);
  } catch {
    // ignore
  }
}

function mapDbRowsToCartItems(rows: DbCartItemRow[]): CartItem[] {
  return rows.map((row) => ({
    id: row.id,
    cart_id: row.cart_id,
    produit_id: row.produit_id,
    formation_id: row.formation_id,
    video_id: row.video_id,
    item_type: row.item_type,
    quantity: normalizeQuantity(row.quantity),
    unit_price: Number(row.unit_price) || 0,
    added_at: row.added_at,
    produit: row.produit ?? undefined,
    formation: row.formation ?? undefined,
    video: row.video ?? undefined,
  }));
}

function mapGuestToCartItems(
  entries: GuestCartEntry[],
  products: Map<string, Produit>,
  formations: Map<string, Formation>,
  videos: Map<string, Video>,
): CartItem[] {
  return entries.map((entry) => {
    const localId = toLocalItemId(entry);
    const product = entry.item_type === 'produit' ? products.get(entry.item_id) : undefined;
    const formation = entry.item_type === 'formation' ? formations.get(entry.item_id) : undefined;
    const video = entry.item_type === 'video' ? videos.get(entry.item_id) : undefined;

    return {
      id: localId,
      cart_id: 'local',
      produit_id: entry.item_type === 'produit' ? entry.item_id : null,
      formation_id: entry.item_type === 'formation' ? entry.item_id : null,
      video_id: entry.item_type === 'video' ? entry.item_id : null,
      item_type: entry.item_type,
      quantity: normalizeQuantity(entry.quantity),
      unit_price: Number(entry.unit_price) || 0,
      added_at: entry.added_at,
      produit: product,
      formation,
      video,
    } satisfies CartItem;
  });
}

async function ensureUserCartId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data: existingCart, error: existingError } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingError) {
    console.error('Error loading user cart:', existingError);
    return null;
  }

  if (existingCart?.id) return existingCart.id;

  const { data: inserted, error: insertError } = await supabase
    .from('carts')
    .insert({ user_id: userId, session_id: null })
    .select('id')
    .single();

  if (insertError) {
    console.error('Error creating user cart:', insertError);
    return null;
  }

  return inserted.id;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

  const fetchGuestCart = useCallback(
    async (client: SupabaseClient) => {
      const entries = readGuestCart();
      if (entries.length === 0) {
        setItems([]);
        return;
      }

      const productIds = Array.from(
        new Set(entries.filter((entry) => entry.item_type === 'produit').map((entry) => entry.item_id)),
      );
      const formationIds = Array.from(
        new Set(entries.filter((entry) => entry.item_type === 'formation').map((entry) => entry.item_id)),
      );
      const videoIds = Array.from(
        new Set(entries.filter((entry) => entry.item_type === 'video').map((entry) => entry.item_id)),
      );

      const productsById = new Map<string, Produit>();
      const formationsById = new Map<string, Formation>();
      const videosById = new Map<string, Video>();

      if (productIds.length > 0) {
        const { data } = await client
          .from('produits')
          .select('*')
          .in('id', productIds)
          .eq('status', 'published');
        (data ?? []).forEach((row) => productsById.set(row.id, row as Produit));
      }

      if (formationIds.length > 0) {
        const { data } = await client
          .from('formations')
          .select('*')
          .in('id', formationIds)
          .eq('status', 'published');
        (data ?? []).forEach((row) => formationsById.set(row.id, row as Formation));
      }

      if (videoIds.length > 0) {
        const { data } = await client
          .from('videos')
          .select('*')
          .in('id', videoIds)
          .eq('status', 'published');
        (data ?? []).forEach((row) => videosById.set(row.id, row as Video));
      }

      setItems(mapGuestToCartItems(entries, productsById, formationsById, videosById));
    },
    [],
  );

  const fetchUserCart = useCallback(async (client: SupabaseClient, userId: string) => {
    const cartId = await ensureUserCartId(client, userId);
    if (!cartId) {
      setItems([]);
      return;
    }

    const { data, error } = await client
      .from('cart_items')
      .select(
        `
          *,
          produit:produits(*),
          formation:formations(*),
          video:videos(*)
        `,
      )
      .eq('cart_id', cartId)
      .order('added_at', { ascending: false });

    if (error) {
      console.error('Error fetching user cart items:', error);
      setItems([]);
      return;
    }

    setItems(mapDbRowsToCartItems((data ?? []) as DbCartItemRow[]));
  }, []);

  const syncGuestCartToUser = useCallback(async (client: SupabaseClient, userId: string) => {
    const guestEntries = readGuestCart();
    if (guestEntries.length === 0) return;

    const cartId = await ensureUserCartId(client, userId);
    if (!cartId) return;

    const { data: existingItems, error: existingError } = await client
      .from('cart_items')
      .select('id,item_type,produit_id,formation_id,video_id,quantity')
      .eq('cart_id', cartId);

    if (existingError) {
      console.error('Error loading existing cart items before sync:', existingError);
      return;
    }

    const existingByKey = new Map<string, { id: string; quantity: number }>();
    (existingItems ?? []).forEach((item) => {
      const itemId =
        item.item_type === 'produit'
          ? item.produit_id
          : item.item_type === 'formation'
            ? item.formation_id
            : item.video_id;
      if (!itemId) return;
      existingByKey.set(`${item.item_type}:${itemId}`, {
        id: item.id,
        quantity: normalizeQuantity(item.quantity ?? 1),
      });
    });

    for (const entry of guestEntries) {
      const key = localItemKey(entry);
      const existing = existingByKey.get(key);
      const foreignField = `${entry.item_type}_id` as 'produit_id' | 'formation_id' | 'video_id';

      if (existing) {
        const nextQuantity = normalizeQuantity(existing.quantity + entry.quantity);
        const { error } = await client
          .from('cart_items')
          .update({ quantity: nextQuantity })
          .eq('id', existing.id);
        if (error) {
          console.error('Error updating existing cart item during sync:', error);
        }
      } else {
        const payload: Record<string, unknown> = {
          cart_id: cartId,
          item_type: entry.item_type,
          unit_price: Number(entry.unit_price) || 0,
          quantity: normalizeQuantity(entry.quantity),
          [foreignField]: entry.item_id,
        };

        const { error } = await client.from('cart_items').insert(payload);
        if (error) {
          console.error('Error inserting cart item during sync:', error);
        }
      }
    }

    clearGuestCartStorage();
  }, []);

  const refreshCart = useCallback(async () => {
    if (!supabase) return;

    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        await fetchUserCart(supabase, session.user.id);
      } else {
        await fetchGuestCart(supabase);
      }
    } finally {
      setLoading(false);
    }
  }, [supabase, fetchUserCart, fetchGuestCart]);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase environment variables not found, cart will stay local only');
      setLoading(false);
      return;
    }

    try {
      const client = createClient();
      setSupabase(client);
    } catch (error) {
      console.error('Failed to initialize Supabase client for cart:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;

    let active = true;

    const init = async () => {
      setLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!active) return;

        if (session?.user) {
          await syncGuestCartToUser(supabase, session.user.id);
          if (!active) return;
          await fetchUserCart(supabase, session.user.id);
        } else {
          await fetchGuestCart(supabase);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;

      if (session?.user) {
        await syncGuestCartToUser(supabase, session.user.id);
        if (!active) return;
        await fetchUserCart(supabase, session.user.id);
      } else {
        await fetchGuestCart(supabase);
      }
      if (active) {
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchGuestCart, fetchUserCart, syncGuestCartToUser]);

  const addItem = useCallback(
    async (input: AddCartItemInput) => {
      if (!supabase) return;

      const quantity = normalizeQuantity(input.quantity);
      const unitPrice = Number(input.unit_price) || 0;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        const current = readGuestCart();
        const key = `${input.item_type}:${input.item_id}`;
        const next = [...current];
        const index = next.findIndex((entry) => localItemKey(entry) === key);

        if (index >= 0) {
          next[index] = {
            ...next[index],
            quantity: normalizeQuantity(next[index].quantity + quantity),
            unit_price: unitPrice,
          };
        } else {
          next.push({
            item_type: input.item_type,
            item_id: input.item_id,
            unit_price: unitPrice,
            quantity,
            added_at: new Date().toISOString(),
          });
        }

        writeGuestCart(next);
        await fetchGuestCart(supabase);
        return;
      }

      const cartId = await ensureUserCartId(supabase, session.user.id);
      if (!cartId) return;

      const foreignField = `${input.item_type}_id` as 'produit_id' | 'formation_id' | 'video_id';
      const { data: existing, error: existingError } = await supabase
        .from('cart_items')
        .select('id,quantity')
        .eq('cart_id', cartId)
        .eq('item_type', input.item_type)
        .eq(foreignField, input.item_id)
        .maybeSingle();

      if (existingError) {
        console.error('Error loading cart item before add:', existingError);
        return;
      }

      if (existing?.id) {
        const nextQuantity = normalizeQuantity((existing.quantity ?? 1) + quantity);
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: nextQuantity, unit_price: unitPrice })
          .eq('id', existing.id);
        if (error) {
          console.error('Error updating cart item:', error);
          return;
        }
      } else {
        const payload: Record<string, unknown> = {
          cart_id: cartId,
          item_type: input.item_type,
          unit_price: unitPrice,
          quantity,
          [foreignField]: input.item_id,
        };
        const { error } = await supabase.from('cart_items').insert(payload);
        if (error) {
          console.error('Error inserting cart item:', error);
          return;
        }
      }

      await fetchUserCart(supabase, session.user.id);
    },
    [supabase, fetchGuestCart, fetchUserCart],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      if (!supabase) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        const parsed = parseLocalItemId(itemId);
        if (!parsed) return;
        const next = readGuestCart().filter(
          (entry) => localItemKey(entry) !== `${parsed.item_type}:${parsed.item_id}`,
        );
        writeGuestCart(next);
        await fetchGuestCart(supabase);
        return;
      }

      const { error } = await supabase.from('cart_items').delete().eq('id', itemId);
      if (error) {
        console.error('Error removing cart item:', error);
        return;
      }
      await fetchUserCart(supabase, session.user.id);
    },
    [supabase, fetchGuestCart, fetchUserCart],
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      if (!supabase) return;

      if (quantity <= 0) {
        await removeItem(itemId);
        return;
      }

      const safeQuantity = normalizeQuantity(quantity);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        const parsed = parseLocalItemId(itemId);
        if (!parsed) return;

        const next = readGuestCart().map((entry) => {
          if (localItemKey(entry) !== `${parsed.item_type}:${parsed.item_id}`) return entry;
          return { ...entry, quantity: safeQuantity };
        });
        writeGuestCart(next);
        await fetchGuestCart(supabase);
        return;
      }

      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: safeQuantity })
        .eq('id', itemId);

      if (error) {
        console.error('Error updating cart quantity:', error);
        return;
      }

      await fetchUserCart(supabase, session.user.id);
    },
    [supabase, removeItem, fetchGuestCart, fetchUserCart],
  );

  const clearCart = useCallback(async () => {
    if (!supabase) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      clearGuestCartStorage();
      await fetchGuestCart(supabase);
      return;
    }

    const cartId = await ensureUserCartId(supabase, session.user.id);
    if (!cartId) return;

    const { error } = await supabase.from('cart_items').delete().eq('cart_id', cartId);
    if (error) {
      console.error('Error clearing user cart:', error);
      return;
    }

    await fetchUserCart(supabase, session.user.id);
  }, [supabase, fetchGuestCart, fetchUserCart]);

  const itemCount = items.reduce((sum, item) => sum + normalizeQuantity(item.quantity), 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + Number(item.unit_price || 0) * normalizeQuantity(item.quantity),
    0,
  );

  const value: CartContextType = {
    items,
    loading,
    itemCount,
    totalPrice,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    refreshCart,
  };

  return React.createElement(CartContext.Provider, { value }, children);
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
