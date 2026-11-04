import { create } from 'zustand';

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  points?: number;
}

export interface CartProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  image?: string | null;
  categoryName?: string;
}

export interface CartItem {
  product: CartProduct;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  customer: Customer | null;
  discount: number;
  notes: string;

  addItem: (product: CartProduct, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setCustomer: (customer: Customer | null) => void;
  setDiscount: (discount: number) => void;
  setNotes: (notes: string) => void;
  clearCart: () => void;

  getTotalItems: () => number;
  getSubtotal: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  customer: null,
  discount: 0,
  notes: '',

  addItem: (product, quantity = 1) => {
    const { items } = get();
    const existingIndex = items.findIndex((item) => item.product.id === product.id);

    if (existingIndex > -1) {
      const updatedItems = [...items];
      const newQuantity = updatedItems[existingIndex].quantity + quantity;
      const finalQuantity = Math.min(newQuantity, product.stock);
      updatedItems[existingIndex] = {
        ...updatedItems[existingIndex],
        quantity: finalQuantity,
      };
      set({ items: updatedItems });
    } else {
      const initialQuantity = Math.min(quantity, product.stock);
      if (initialQuantity > 0) {
        set({ items: [...items, { product, quantity: initialQuantity }] });
      }
    }
  },

  removeItem: (productId) => {
    set({ items: get().items.filter((item) => item.product.id !== productId) });
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      set({ items: get().items.filter((item) => item.product.id !== productId) });
      return;
    }
    const items = get().items.map((item) => {
      if (item.product.id === productId) {
        const validQuantity = Math.min(quantity, item.product.stock);
        return { ...item, quantity: validQuantity };
      }
      return item;
    });
    set({ items });
  },

  setCustomer: (customer) => {
    set({ customer });
  },

  setDiscount: (discount) => {
    set({ discount: Math.max(0, discount) });
  },

  setNotes: (notes) => {
    set({ notes });
  },

  clearCart: () => {
    set({ items: [], customer: null, discount: 0, notes: '' });
  },

  getTotalItems: () => {
    return get().items.reduce((acc, item) => acc + item.quantity, 0);
  },

  getSubtotal: () => {
    return get().items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  },

  getTotal: () => {
    const subtotal = get().getSubtotal();
    const discount = get().discount;
    return Math.max(0, subtotal - discount);
  },
}));
