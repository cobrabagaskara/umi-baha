import { create } from 'zustand';

export type CartItem = {
  product_id: string;
  nama_produk: string;
  harga: number;
  qty: number;
};

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'qty'>, qty?: number) => void;
  removeItem: (product_id: string) => void;
  setQty: (product_id: string, qty: number) => void;
  increment: (product_id: string) => void;
  decrement: (product_id: string) => void;
  clear: () => void;
  total: () => number;
  totalQty: () => number;
};

export const useCart = create<CartState>((set, get) => ({
  items: [],

  addItem: (item, qty = 1) => {
    const existing = get().items.find((i) => i.product_id === item.product_id);
    if (existing) {
      set({
        items: get().items.map((i) =>
          i.product_id === item.product_id ? { ...i, qty: i.qty + qty } : i
        ),
      });
    } else {
      set({ items: [...get().items, { ...item, qty }] });
    }
  },

  removeItem: (product_id) => {
    set({ items: get().items.filter((i) => i.product_id !== product_id) });
  },

  setQty: (product_id, qty) => {
    if (qty <= 0) {
      get().removeItem(product_id);
      return;
    }
    set({
      items: get().items.map((i) =>
        i.product_id === product_id ? { ...i, qty } : i
      ),
    });
  },

  increment: (product_id) => {
    const item = get().items.find((i) => i.product_id === product_id);
    if (item) get().setQty(product_id, item.qty + 1);
  },

  decrement: (product_id) => {
    const item = get().items.find((i) => i.product_id === product_id);
    if (item) get().setQty(product_id, item.qty - 1);
  },

  clear: () => set({ items: [] }),

  total: () => get().items.reduce((sum, i) => sum + i.harga * i.qty, 0),
  totalQty: () => get().items.reduce((sum, i) => sum + i.qty, 0),
}));