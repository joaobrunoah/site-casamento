import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../utils/api';
import { useCart, Gift } from '../contexts/CartContext';
import './Gifts.css';

const Gifts: React.FC = () => {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { cart, addToCart, removeFromCart, isInCart, totalItems, totalPrice } = useCart();
  const navigate = useNavigate();

  // Fetch gifts from API
  useEffect(() => {
    const fetchGifts = async () => {
      setLoading(true);
      try {
        const url = getApiUrl('listGifts');
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch gifts');
        }
        const data = await response.json();
        setGifts(data);
      } catch (error) {
        console.error('Error fetching gifts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGifts();
  }, []);

  // Handle continue shopping button
  const handleContinueShopping = () => {
    navigate('/checkout');
  };

  if (loading) {
    return (
      <div className="gifts-page">
        <div className="gifts-loading">Carregando presentes...</div>
      </div>
    );
  }

  return (
    <div className="gifts-page">
      <div className="gifts-container">
        <div className="gifts-grid">
          {gifts.map((gift) => (
            <div key={gift.id} className="gift-card">
              {gift.imagem && (
                <div className="gift-image-container">
                  <img src={gift.imagem} alt={gift.nome} className="gift-image" />
                </div>
              )}
              <div className="gift-content">
                <h3 className="gift-name">{gift.nome}</h3>
                {gift.descricao && (
                  <p className="gift-description">{gift.descricao}</p>
                )}
                <div className="gift-footer">
                  <span className="gift-price">R$ {gift.preco.toFixed(2)}</span>
                  {isInCart(gift.id) ? (
                    <button
                      className="remove-from-cart-button"
                      onClick={() => removeFromCart(gift.id)}
                    >
                      Remover do Carrinho
                    </button>
                  ) : (
                    <button
                      className="add-to-cart-button"
                      onClick={() => addToCart(gift)}
                      disabled={gift.estoque <= 0}
                    >
                      Adicionar ao Carrinho
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Footer - appears when items are added */}
      {totalItems > 0 && (
        <div className="cart-footer">
          <div className="cart-footer-content">
            <div className="cart-icon-container">
              <svg
                className="cart-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              <span className="cart-item-count">{totalItems}</span>
            </div>
            <div className="cart-info">
              <span className="cart-total-label">Total:</span>
              <span className="cart-total-price">R$ {totalPrice.toFixed(2)}</span>
            </div>
            <button className="continue-shopping-button" onClick={handleContinueShopping}>
              Continuar Compra
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gifts;
