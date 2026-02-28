'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import React from 'react';
import { createClient } from '@/lib/supabase/client';
import { CartItem } from '@/lib/types';
import { SupabaseClient } from '@supabase/supabase-js';

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  itemCount: number;
  totalPrice: number;
  addItem: (item: { item_type: 'produit' | 'formation' | 'video'; item_id: string; unit_price: number; quantity?: number }) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    // Vérifier si les variables d'environnement existent
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase environment variables not found, skipping initialization');
      setLoading(false);
      return;
    }
    
    try {
      const client = createClient();
      setSupabase(client);
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
      setLoading(false);
    }
  }, []);

  const fetchCart = useCallback(async () => {
    if (!supabase) return;
    
    try {
      // Get or create session ID
      const sessionId = localStorage.getItem('cart_session_id');
      
      if (!sessionId) {
        const newSessionId = crypto.randomUUID();
        localStorage.setItem('cart_session_id', newSessionId);
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      let query = supabase
        .from('cart_items')
        .select(`
          *,
          produit:produits(*),
          formation:formations(*),
          video:videos(*)
        `);

      if (session?.user) {
        // Get user's cart
        const { data: cart } = await supabase
          .from('carts')
          .select('id')
          .eq('user_id', session.user.id)
          .single();
        
        if (cart) {
          query = query.eq('cart_id', cart.id);
        }
      } else {
        // Get session cart
        const { data: cart } = await supabase
          .from('carts')
          .select('id')
          .eq('session_id', sessionId)
          .single();
        
        if (cart) {
          query = query.eq('cart_id', cart.id);
        }
      }

      const { data } = await query;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addItem = async (item: { item_type: 'produit' | 'formation' | 'video'; item_id: string; unit_price: number; quantity?: number }) => {
    if (!supabase) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let sessionId = localStorage.getItem('cart_session_id');
      
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem('cart_session_id', sessionId);
      }

      // Get or create cart
      let cartId: string;
      const { data: existingCart } = await supabase
        .from('carts')
        .select('id')
        .eq(session?.user ? 'user_id' : 'session_id', session?.user ? session.user.id : sessionId)
        .single();

      if (existingCart) {
        cartId = existingCart.id;
      } else {
        const { data: newCart } = await supabase
          .from('carts')
          .insert({
            user_id: session?.user?.id || null,
            session_id: session?.user ? null : sessionId,
          })
          .select('id')
          .single();
        cartId = newCart!.id;
      }

      // Check if item already exists
      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', cartId)
        .eq('item_type', item.item_type)
        .eq(`${item.item_type}_id`, item.item_id)
        .single();

      if (existingItem) {
        await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + (item.quantity || 1) })
          .eq('id', existingItem.id);
      } else {
        await supabase.from('cart_items').insert({
          cart_id: cartId,
          item_type: item.item_type,
          [`${item.item_type}_id`]: item.item_id,
          unit_price: item.unit_price,
          quantity: item.quantity || 1,
        });
      }

      await fetchCart();
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!supabase) return;
    
    try {
      await supabase.from('cart_items').delete().eq('id', itemId);
      await fetchCart();
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (!supabase) return;
    
    try {
      if (quantity <= 0) {
        await removeItem(itemId);
      } else {
        await supabase.from('cart_items').update({ quantity }).eq('id', itemId);
        await fetchCart();
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const clearCart = async () => {
    if (!supabase) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const sessionId = localStorage.getItem('cart_session_id');
      
      const { data: cart } = await supabase
        .from('carts')
        .select('id')
        .eq(session?.user ? 'user_id' : 'session_id', session?.user ? session.user.id : sessionId)
        .single();

      if (cart) {
        await supabase.from('cart_items').delete().eq('cart_id', cart.id);
        await fetchCart();
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

  const value = {
    items,
    loading,
    itemCount,
    totalPrice,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    refreshCart: fetchCart,
  };

  return React.createElement(
    CartContext.Provider,
    { value },
    children
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
