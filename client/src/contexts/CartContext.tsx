import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Gift {
  id?: string;
  nome: string;
  descricao: string;
  preco: number;
  estoque: number;
  /** Available to sell: estoque minus approved-purchase quantities (calculated by API) */
  disponivel?: number;
  imagem: string;
  /** If true, this gift supports buying multiple units (quotas) */
  quota?: boolean;
}

export interface CartItem {
  gift: Gift;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (gift: Gift) => void;
  removeFromCart: (giftId?: string) => void;
  increaseQuantity: (giftId?: string) => void;
  decreaseQuantity: (giftId?: string) => void;
  clearCart: () => void;
  isInCart: (giftId?: string) => boolean;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  const isQuotaGift = (gift: Gift): boolean =>
    Boolean(gift.quota || gift.nome?.includes('(Cota)'));

  const addToCart = (gift: Gift) => {
    const available = gift.disponivel ?? gift.estoque;
    if (available <= 0) {
      return;
    }

    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.gift.id === gift.id);

      // Non-quota gifts: keep max 1 unit in the cart
      if (existingIndex !== -1 && !isQuotaGift(gift)) {
        return prevCart;
      }

      // Quota gifts: allow multiple units, up to available
      if (existingIndex !== -1) {
        const existingItem = prevCart[existingIndex];
        const newQuantity = Math.min(existingItem.quantity + 1, available);
        if (newQuantity === existingItem.quantity) {
          return prevCart;
        }
        const newCart = [...prevCart];
        newCart[existingIndex] = { ...existingItem, quantity: newQuantity };
        return newCart;
      }

      // First unit in cart
      return [...prevCart, { gift, quantity: 1 }];
    });
  };

  const removeFromCart = (giftId?: string) => {
    setCart(prevCart => prevCart.filter(item => item.gift.id !== giftId));
  };

  const increaseQuantity = (giftId?: string) => {
    if (!giftId) return;
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.gift.id !== giftId) return item;
        const available = item.gift.disponivel ?? item.gift.estoque;
        const nextQuantity = Math.min(item.quantity + 1, available);
        return nextQuantity === item.quantity
          ? item
          : { ...item, quantity: nextQuantity };
      }),
    );
  };

  const decreaseQuantity = (giftId?: string) => {
    if (!giftId) return;
    setCart(prevCart =>
      prevCart
        .map(item => {
          if (item.gift.id !== giftId) return item;
          const nextQuantity = item.quantity - 1;
          if (nextQuantity <= 0) {
            return null;
          }
          return { ...item, quantity: nextQuantity };
        })
        .filter((item): item is CartItem => item !== null),
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const isInCart = (giftId?: string): boolean => {
    return cart.some(item => item.gift.id === giftId);
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.gift.preco * item.quantity), 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        increaseQuantity,
        decreaseQuantity,
        clearCart,
        isInCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
