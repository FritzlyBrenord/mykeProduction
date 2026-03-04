'use client';

import { createClient } from '@/lib/supabase/client';
import { CartItem, Formation, Produit, Video } from '@/lib/types';
import { Session } from '@supabase/supabase-js';
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
  item_name?: string;
  item_image?: string | null;
  produit_type?: Produit['type'] | null;
  is_digital?: boolean | null;
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
  item_name?: string;
  item_image?: string | null;
  produit_type?: Produit['type'] | null;
  is_digital?: boolean | null;
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
type BrowserSupabaseClient = ReturnType<typeof createClient>;

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

function sanitizeGuestText(value: unknown, max = 160) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function sanitizeGuestImage(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return null;
}

function sanitizeGuestProductType(value: unknown): Produit['type'] | null {
  if (value === 'chimique' || value === 'document' || value === 'autre') return value;
  return null;
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
          item_name: sanitizeGuestText(row.item_name),
          item_image: sanitizeGuestImage(row.item_image),
          produit_type: sanitizeGuestProductType(row.produit_type),
          is_digital: typeof row.is_digital === 'boolean' ? row.is_digital : null,
        } satisfies GuestCartEntry;
      })
      .filter(Boolean) as GuestCartEntry[];

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
        item_name: existing.item_name || entry.item_name,
        item_image: existing.item_image || entry.item_image || null,
        produit_type: existing.produit_type || entry.produit_type || null,
        is_digital: typeof existing.is_digital === 'boolean' ? existing.is_digital : entry.is_digital ?? null,
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

function buildGuestProductSnapshot(entry: GuestCartEntry): Produit | undefined {
  if (entry.item_type !== 'produit') return undefined;

  return {
    id: entry.item_id,
    name: entry.item_name || 'Produit',
    slug: '',
    description: null,
    content: null,
    price: Number(entry.unit_price) || 0,
    images: entry.item_image ? [entry.item_image] : [],
    type: entry.produit_type ?? 'autre',
    stock: null,
    is_digital: typeof entry.is_digital === 'boolean' ? entry.is_digital : false,
    file_url: null,
    cas_number: null,
    msds_url: null,
    purity: null,
    unit: null,
    min_order: 1,
    ghs_pictograms: [],
    hazard_statements: [],
    precautionary_statements: [],
    signal_word: null,
    age_restricted: false,
    restricted_sale: false,
    adr_class: null,
    status: 'published',
    category_id: null,
    featured: false,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  } as Produit;
}

function buildGuestFormationSnapshot(entry: GuestCartEntry): Formation | undefined {
  if (entry.item_type !== 'formation') return undefined;

  return {
    id: entry.item_id,
    title: entry.item_name || 'Formation',
    slug: '',
    description: null,
    content: null,
    thumbnail_url: entry.item_image || null,
    price: Number(entry.unit_price) || 0,
    is_free: (Number(entry.unit_price) || 0) <= 0,
    format: 'video',
    status: 'published',
    category_id: null,
    author_id: null,
    duration_hours: null,
    level: null,
    language: 'fr',
    certificate: false,
    enrolled_count: 0,
    rating_avg: 0,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  } as Formation;
}

function mapGuestToCartItems(
  entries: GuestCartEntry[],
  products: Map<string, Produit>,
  formations: Map<string, Formation>,
  videos: Map<string, Video>,
): CartItem[] {
  return entries.map((entry) => {
    const localId = toLocalItemId(entry);
    const product =
      entry.item_type === 'produit'
        ? products.get(entry.item_id) || buildGuestProductSnapshot(entry)
        : undefined;
    const formation =
      entry.item_type === 'formation'
        ? formations.get(entry.item_id) || buildGuestFormationSnapshot(entry)
        : undefined;
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

function mapGuestEntriesToLocalOnly(entries: GuestCartEntry[]): CartItem[] {
  return entries.map((entry) => ({
    id: toLocalItemId(entry),
    cart_id: 'local',
    produit_id: entry.item_type === 'produit' ? entry.item_id : null,
    formation_id: entry.item_type === 'formation' ? entry.item_id : null,
    video_id: entry.item_type === 'video' ? entry.item_id : null,
    item_type: entry.item_type,
    quantity: normalizeQuantity(entry.quantity),
    unit_price: Number(entry.unit_price) || 0,
    added_at: entry.added_at,
    produit: buildGuestProductSnapshot(entry),
    formation: buildGuestFormationSnapshot(entry),
    video: undefined,
  }));
}

async function ensureUserCartId(supabase: BrowserSupabaseClient, userId: string): Promise<string | null> {
  const { data: existingCartRaw, error: existingError } = await (supabase
    .from('carts') as any)
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  const existingCart = (existingCartRaw ?? null) as { id?: string } | null;

  if (existingError) {
    console.error('Error loading user cart:', existingError);
    return null;
  }

  if (existingCart?.id) return existingCart.id;

  const { data: insertedRaw, error: insertError } = await (supabase
    .from('carts') as any)
    .insert({ user_id: userId, session_id: null })
    .select('id')
    .single();
  const inserted = (insertedRaw ?? null) as { id?: string } | null;

  if (insertError) {
    console.error('Error creating user cart:', insertError);
    return null;
  }

  return inserted?.id ?? null;
}

async function getSessionSafe(
  client: BrowserSupabaseClient,
  timeoutMs: number = 1800,
): Promise<Session | null> {
  try {
    const result = await Promise.race([
      client.auth.getSession(),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);

    if (!result) return null;

    const sessionResult = result as Awaited<
      ReturnType<BrowserSupabaseClient['auth']['getSession']>
    >;
    if (sessionResult.error) {
      const message = String(sessionResult.error.message || '').toLowerCase();
      if (!message.includes('auth session missing')) {
        console.error('Cart getSession error:', sessionResult.error);
      }
      return null;
    }

    return sessionResult.data?.session ?? null;
  } catch {
    return null;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState<BrowserSupabaseClient | null>(null);

  const fetchGuestCart = useCallback(
    async (client: BrowserSupabaseClient) => {
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
        const { data: productsRaw } = await (client
          .from('produits') as any)
          .select('*')
          .in('id', productIds)
          .eq('status', 'published');
        const products = (productsRaw ?? []) as Produit[];
        products.forEach((row) => {
          if (row?.id) productsById.set(row.id, row);
        });

        const missingProductIds = productIds.filter((id) => !productsById.has(id));
        if (missingProductIds.length > 0) {
          try {
            const response = await fetch(
              `/api/produits?ids=${encodeURIComponent(missingProductIds.join(','))}&limit=200&page=1`,
              { cache: 'no-store' },
            );
            if (response.ok) {
              const payload = (await response.json()) as { data?: Produit[] };
              (payload.data ?? []).forEach((row) => {
                if (row?.id) {
                  productsById.set(row.id, row);
                }
              });
            }
          } catch (error) {
            console.error('Fallback product metadata fetch error:', error);
          }
        }
      }

      if (formationIds.length > 0) {
        const { data: formationsRaw } = await (client
          .from('formations') as any)
          .select('*')
          .in('id', formationIds)
          .eq('status', 'published');
        const formations = (formationsRaw ?? []) as Formation[];
        formations.forEach((row) => {
          if (row?.id) formationsById.set(row.id, row);
        });

        const missingFormationIds = formationIds.filter((id) => !formationsById.has(id));
        if (missingFormationIds.length > 0) {
          try {
            const response = await fetch(
              `/api/formations?ids=${encodeURIComponent(missingFormationIds.join(','))}&limit=200`,
              { cache: 'no-store' },
            );
            if (response.ok) {
              const payload = (await response.json()) as Formation[];
              (payload ?? []).forEach((row) => {
                if (row?.id) {
                  formationsById.set(row.id, row);
                }
              });
            }
          } catch (error) {
            console.error('Fallback formation metadata fetch error:', error);
          }
        }
      }

      if (videoIds.length > 0) {
        const { data: videosRaw } = await (client
          .from('videos') as any)
          .select('*')
          .in('id', videoIds)
          .eq('status', 'published');
        const videos = (videosRaw ?? []) as Video[];
        videos.forEach((row) => {
          if (row?.id) videosById.set(row.id, row);
        });
      }

      setItems(mapGuestToCartItems(entries, productsById, formationsById, videosById));
    },
    [],
  );

  const fetchUserCart = useCallback(async (client: BrowserSupabaseClient, userId: string) => {
    const cartId = await ensureUserCartId(client, userId);
    if (!cartId) {
      setItems([]);
      return;
    }

    const { data: cartRowsRaw, error } = await (client
      .from('cart_items') as any)
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

    setItems(mapDbRowsToCartItems((cartRowsRaw ?? []) as DbCartItemRow[]));
  }, []);

  const syncGuestCartToUser = useCallback(async (client: BrowserSupabaseClient, userId: string) => {
    const guestEntries = readGuestCart();
    if (guestEntries.length === 0) return;

    const cartId = await ensureUserCartId(client, userId);
    if (!cartId) return;

    const { data: existingItemsRaw, error: existingError } = await (client
      .from('cart_items') as any)
      .select('id,item_type,produit_id,formation_id,video_id,quantity')
      .eq('cart_id', cartId);
    const existingItems = (existingItemsRaw ?? []) as Array<{
      id: string;
      item_type: CartItemType;
      produit_id: string | null;
      formation_id: string | null;
      video_id: string | null;
      quantity: number | null;
    }>;

    if (existingError) {
      console.error('Error loading existing cart items before sync:', existingError);
      return;
    }

    const existingByKey = new Map<string, { id: string; quantity: number }>();
    existingItems.forEach((item) => {
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
        const { error } = await (client
          .from('cart_items') as any)
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

        const { error } = await (client.from('cart_items') as any).insert(payload);
        if (error) {
          console.error('Error inserting cart item during sync:', error);
        }
      }
    }

    clearGuestCartStorage();
  }, []);

  const refreshCart = useCallback(async () => {
    if (!supabase) {
      setItems(mapGuestEntriesToLocalOnly(readGuestCart()));
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const session = await getSessionSafe(supabase);

      if (session?.user) {
        await fetchUserCart(supabase, session.user.id);
      } else {
        setItems(mapGuestEntriesToLocalOnly(readGuestCart()));
        void fetchGuestCart(supabase);
      }
    } finally {
      setLoading(false);
    }
  }, [supabase, fetchUserCart, fetchGuestCart]);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Safety timeout - force loading to false after 3 seconds
    const safetyTimeout = setTimeout(() => {
      setLoading((current) => {
        if (current) {
          return false;
        }
        return current;
      });
    }, 3000);

    if (!supabaseUrl || !supabaseAnonKey) {
      setItems(mapGuestEntriesToLocalOnly(readGuestCart()));
      setLoading(false);
      clearTimeout(safetyTimeout);
      return;
    }

    try {
      const client = createClient(supabaseUrl, supabaseAnonKey);
      setSupabase(client);
    } catch (error) {
      console.error('Failed to initialize Supabase client for cart:', error);
      setItems(mapGuestEntriesToLocalOnly(readGuestCart()));
      setLoading(false);
      clearTimeout(safetyTimeout);
    }

    return () => clearTimeout(safetyTimeout);
  }, []);

  useEffect(() => {
    if (!supabase) return;

    let active = true;

    const init = async () => {
      setLoading(true);

      try {
        const session = await getSessionSafe(supabase);

        if (!active) return;

        if (session?.user) {
          await syncGuestCartToUser(supabase, session.user.id);
          if (!active) return;
          await fetchUserCart(supabase, session.user.id);
        } else {
          setItems(mapGuestEntriesToLocalOnly(readGuestCart()));
          void fetchGuestCart(supabase);
        }
      } catch (error) {
        console.error('Error during cart init:', error);
        // Fallback to local cart on any error
        if (active) {
          setItems(mapGuestEntriesToLocalOnly(readGuestCart()));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;

      try {
        if (session?.user) {
          await syncGuestCartToUser(supabase, session.user.id);
          if (!active) return;
          await fetchUserCart(supabase, session.user.id);
        } else {
          setItems(mapGuestEntriesToLocalOnly(readGuestCart()));
          void fetchGuestCart(supabase);
        }
      } catch (error) {
        console.error('Error during auth change:', error);
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
      const unitPrice = Number(input.unit_price) || 0;
      let quantity = normalizeQuantity(input.quantity);

      const upsertGuestItem = async (maxStock: number | null = null) => {
        const current = readGuestCart();
        const key = `${input.item_type}:${input.item_id}`;
        const next = [...current];
        const index = next.findIndex((entry) => localItemKey(entry) === key);

        if (index >= 0) {
          const nextQuantity = normalizeQuantity(next[index].quantity + quantity);
          if (maxStock !== null && nextQuantity > maxStock) {
            throw new Error('Quantite demandee superieure au stock.');
          }
          next[index] = {
            ...next[index],
            quantity: nextQuantity,
            unit_price: unitPrice,
            item_name: next[index].item_name || sanitizeGuestText(input.item_name),
            item_image: next[index].item_image || sanitizeGuestImage(input.item_image),
            produit_type: next[index].produit_type || sanitizeGuestProductType(input.produit_type),
            is_digital:
              typeof next[index].is_digital === 'boolean'
                ? next[index].is_digital
                : typeof input.is_digital === 'boolean'
                  ? input.is_digital
                  : null,
          };
        } else {
          if (maxStock !== null && quantity > maxStock) {
            throw new Error('Quantite demandee superieure au stock.');
          }
          next.push({
            item_type: input.item_type,
            item_id: input.item_id,
            unit_price: unitPrice,
            quantity,
            added_at: new Date().toISOString(),
            item_name: sanitizeGuestText(input.item_name),
            item_image: sanitizeGuestImage(input.item_image),
            produit_type: sanitizeGuestProductType(input.produit_type),
            is_digital: typeof input.is_digital === 'boolean' ? input.is_digital : null,
          });
        }

        writeGuestCart(next);
        setItems(mapGuestEntriesToLocalOnly(next));
        if (supabase) {
          void fetchGuestCart(supabase);
        }
      };

      if (!supabase) {
        await upsertGuestItem();
        return;
      }

      const session = await getSessionSafe(supabase, 1500);
      if (!session?.user) {
        await upsertGuestItem();
        return;
      }

      let maxStock: number | null = null;

      if (input.item_type === 'produit') {
        const { data: productRaw, error: productError } = await (supabase
          .from('produits') as any)
          .select('id,status,stock,min_order')
          .eq('id', input.item_id)
          .maybeSingle();
        const product = (productRaw ?? null) as {
          id: string;
          status: string;
          stock: number | null;
          min_order: number | null;
        } | null;

        if (productError) {
          console.error('Error validating product before cart add:', productError);
        } else if (!product || product.status !== 'published') {
          throw new Error('Ce produit nest plus disponible.');
        }

        if (product) {
          const minOrder = Math.max(1, Number(product.min_order ?? 1));
          quantity = Math.max(quantity, minOrder);

          if (typeof product.stock === 'number') {
            maxStock = Math.max(0, Math.floor(product.stock));
            if (maxStock <= 0) {
              throw new Error('Produit en rupture de stock.');
            }
            if (quantity > maxStock) {
              throw new Error('Quantite demandee superieure au stock.');
            }
          }
        }
      }

      const cartId = await ensureUserCartId(supabase, session.user.id);
      if (!cartId) {
        throw new Error('Impossible de preparer votre panier.');
      }

      const foreignField = `${input.item_type}_id` as 'produit_id' | 'formation_id' | 'video_id';
      const { data: existingRaw, error: existingError } = await (supabase
        .from('cart_items') as any)
        .select('id,quantity')
        .eq('cart_id', cartId)
        .eq('item_type', input.item_type)
        .eq(foreignField, input.item_id)
        .maybeSingle();
      const existing = (existingRaw ?? null) as { id: string; quantity: number | null } | null;

      if (existingError) {
        console.error('Error loading cart item before add:', existingError);
        throw new Error("Erreur pendant l'ajout au panier.");
      }

      if (existing?.id) {
        const nextQuantity = normalizeQuantity((existing.quantity ?? 1) + quantity);
        if (maxStock !== null && nextQuantity > maxStock) {
          throw new Error('Quantite demandee superieure au stock.');
        }
        const { error } = await (supabase
          .from('cart_items') as any)
          .update({ quantity: nextQuantity, unit_price: unitPrice })
          .eq('id', existing.id);
        if (error) {
          console.error('Error updating cart item:', error);
          throw new Error("Erreur pendant l'ajout au panier.");
        }
      } else {
        const payload: Record<string, unknown> = {
          cart_id: cartId,
          item_type: input.item_type,
          unit_price: unitPrice,
          quantity,
          [foreignField]: input.item_id,
        };
        const { error } = await (supabase.from('cart_items') as any).insert(payload);
        if (error) {
          console.error('Error inserting cart item:', error);
          throw new Error("Erreur pendant l'ajout au panier.");
        }
      }

      await fetchUserCart(supabase, session.user.id);
    },
    [supabase, fetchGuestCart, fetchUserCart],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      if (!supabase) {
        const parsed = parseLocalItemId(itemId);
        if (!parsed) return;
        const next = readGuestCart().filter(
          (entry) => localItemKey(entry) !== `${parsed.item_type}:${parsed.item_id}`,
        );
        writeGuestCart(next);
        setItems(mapGuestEntriesToLocalOnly(next));
        return;
      }

      const session = await getSessionSafe(supabase);

      if (!session?.user) {
        const parsed = parseLocalItemId(itemId);
        if (!parsed) return;
        const next = readGuestCart().filter(
          (entry) => localItemKey(entry) !== `${parsed.item_type}:${parsed.item_id}`,
        );
        writeGuestCart(next);
        setItems(mapGuestEntriesToLocalOnly(next));
        void fetchGuestCart(supabase);
        return;
      }

      const { error } = await (supabase.from('cart_items') as any).delete().eq('id', itemId);
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
      if (!supabase) {
        if (quantity <= 0) {
          const parsed = parseLocalItemId(itemId);
          if (!parsed) return;
          const filtered = readGuestCart().filter(
            (entry) => localItemKey(entry) !== `${parsed.item_type}:${parsed.item_id}`,
          );
          writeGuestCart(filtered);
          setItems(mapGuestEntriesToLocalOnly(filtered));
          return;
        }

        const parsed = parseLocalItemId(itemId);
        if (!parsed) return;
        const safeQuantity = normalizeQuantity(quantity);
        const next = readGuestCart().map((entry) => {
          if (localItemKey(entry) !== `${parsed.item_type}:${parsed.item_id}`) return entry;
          return { ...entry, quantity: safeQuantity };
        });
        writeGuestCart(next);
        setItems(mapGuestEntriesToLocalOnly(next));
        return;
      }

      if (quantity <= 0) {
        await removeItem(itemId);
        return;
      }

      const safeQuantity = normalizeQuantity(quantity);
      const session = await getSessionSafe(supabase);

      if (!session?.user) {
        const parsed = parseLocalItemId(itemId);
        if (!parsed) return;

        const next = readGuestCart().map((entry) => {
          if (localItemKey(entry) !== `${parsed.item_type}:${parsed.item_id}`) return entry;
          return { ...entry, quantity: safeQuantity };
        });
        writeGuestCart(next);
        setItems(mapGuestEntriesToLocalOnly(next));
        void fetchGuestCart(supabase);
        return;
      }

      const { error } = await (supabase
        .from('cart_items') as any)
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
    if (!supabase) {
      clearGuestCartStorage();
      setItems([]);
      return;
    }

    const session = await getSessionSafe(supabase);

    if (!session?.user) {
      clearGuestCartStorage();
      setItems([]);
      void fetchGuestCart(supabase);
      return;
    }

    const cartId = await ensureUserCartId(supabase, session.user.id);
    if (!cartId) return;

    const { error } = await (supabase.from('cart_items') as any).delete().eq('cart_id', cartId);
    if (error) {
      console.error('Error clearing user cart:', error);
      return;
    }

    await fetchUserCart(supabase, session.user.id);
  }, [supabase, fetchGuestCart, fetchUserCart]);

  const itemCount = items?.reduce((sum, item) => sum + normalizeQuantity(item.quantity), 0) ?? 0;
  const totalPrice = items?.reduce(
    (sum, item) => sum + Number(item.unit_price || 0) * normalizeQuantity(item.quantity),
    0,
  ) ?? 0;

  const value: CartContextType = {
    items: items ?? [],
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
