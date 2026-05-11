import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type CartItem = {
  id: string;
  productId: string;
  name: string;
  category: string;
  size?: string;
  price: number;
  quantity: number;
  extras?: { name: string; quantity: number; price: number }[];
  removedIngredients?: string[];
  note?: string;
  imageUrl?: string;
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  subtotal: number;
  deliveryFee: number;
  setDeliveryFee: (fee: number) => void;
  total: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem("ochel-cart");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(500);

  useEffect(() => {
    localStorage.setItem("ochel-cart", JSON.stringify(items));
  }, [items]);

  const addItem = (item: Omit<CartItem, "id">) => {
    const existingIndex = items.findIndex((i) => {
      if (i.productId !== item.productId) return false;
      if (i.size !== item.size) return false;
      if (i.note !== item.note) return false;

      const itemExtras = item.extras || [];
      const iExtras = i.extras || [];
      if (itemExtras.length !== iExtras.length) return false;

      const iRemoved = i.removedIngredients || [];
      const itemRemoved = item.removedIngredients || [];
      if (iRemoved.length !== itemRemoved.length) return false;
      if (!iRemoved.every((r) => itemRemoved.includes(r))) return false;

      return itemExtras.every((ie) => {
        const found = iExtras.find((ixe) => ixe.name === ie.name);
        return found && found.quantity === ie.quantity;
      });
    });

    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex].quantity += item.quantity;
      setItems(newItems);
    } else {
      setItems([...items, { ...item, id: Math.random().toString(36).substr(2, 9) }]);
    }
    // Do NOT auto-open cart — user browses, then opens manually
  };

  const removeItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems(items.map((i) => (i.id === id ? { ...i, quantity } : i)));
  };

  const clearCart = () => {
    setItems([]);
  };

  const subtotal = items.reduce((acc, item) => {
    let itemTotal = item.price;
    if (item.extras) {
      item.extras.forEach((extra) => {
        itemTotal += extra.price * extra.quantity;
      });
    }
    return acc + itemTotal * item.quantity;
  }, 0);

  const total = subtotal + deliveryFee;

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        subtotal,
        deliveryFee,
        setDeliveryFee,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
