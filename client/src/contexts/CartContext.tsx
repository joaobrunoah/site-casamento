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
}

export interface CartItem {
  gift: Gift;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (gift: Gift) => void;
  removeFromCart: (giftId?: string) => void;
  clearCart: () => void;
  isInCart: (giftId?: string) => boolean;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (gift: Gift) => {
    const available = gift.disponivel ?? gift.estoque;
    if (available <= 0) {
      return;
    }

    setCart(prevCart => {
      // Don't allow adding the same item twice
      if (prevCart.some(item => item.gift.id === gift.id)) {
        return prevCart;
      }
      return [...prevCart, { gift, quantity: 1 }];
    });
  };

  const removeFromCart = (giftId?: string) => {
    setCart(prevCart => prevCart.filter(item => item.gift.id !== giftId));
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
