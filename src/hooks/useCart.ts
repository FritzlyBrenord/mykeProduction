"use client";

import { create } from "zustand";

export interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  itemCount: number;
  total: number;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  clear: () => void;
}

function computeTotals(items: CartItem[]) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { itemCount, total };
}

export const useCart = create<CartState>((set) => ({
  items: [],
  itemCount: 0,
  total: 0,
  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((current) => current.id === item.id);
      const items = existing
        ? state.items.map((current) =>
            current.id === item.id ? { ...current, quantity: current.quantity + 1 } : current,
          )
        : [...state.items, { ...item, quantity: 1 }];

      return {
        items,
        ...computeTotals(items),
      };
    }),
  removeItem: (id) =>
    set((state) => {
      const items = state.items.filter((item) => item.id !== id);
      return {
        items,
        ...computeTotals(items),
      };
    }),
  clear: () =>
    set({
      items: [],
      itemCount: 0,
      total: 0,
    }),
}));
