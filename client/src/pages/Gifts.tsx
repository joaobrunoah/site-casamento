import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../utils/api';
import { useCart, Gift } from '../contexts/CartContext';
import { LAST_PURCHASE_ID_KEY } from './Payment';
import type { PurchaseDetails } from '../types/purchase';
import './Gifts.css';

const Gifts: React.FC = () => {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastPurchase, setLastPurchase] = useState<PurchaseDetails | null>(null);
  const [lastPurchaseLoading, setLastPurchaseLoading] = useState(true);
  const [lastPurchaseDismissed, setLastPurchaseDismissed] = useState(false);
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

  // Fetch last purchase by id from localStorage (so refresh still shows status)
  useEffect(() => {
    const purchaseId = localStorage.getItem(LAST_PURCHASE_ID_KEY);
    if (!purchaseId) {
      setLastPurchaseLoading(false);
      return;
    }
    let cancelled = false;
    fetch(getApiUrl(`payment/purchase/${purchaseId}`))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setLastPurchase(data as PurchaseDetails);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLastPurchaseLoading(false);
      });
    return () => { cancelled = true; };
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

  const showSuccess = lastPurchase?.status === 'approved';
  const showPending = lastPurchase?.status === 'pending';
  const showError = lastPurchase?.status === 'rejected';
  const showLastPurchaseBanner = !lastPurchaseLoading && lastPurchase && !lastPurchaseDismissed;

  return (
    <div className="gifts-page">
      {showLastPurchaseBanner && (
        <div
          className={`gifts-last-purchase ${
            showSuccess ? 'gifts-last-purchase-success' : showPending ? 'gifts-last-purchase-pending' : 'gifts-last-purchase-error'
          }`}
        >
          <div className="gifts-last-purchase-inner">
            <h2 className="gifts-last-purchase-title">
              {showSuccess && '✓ Pagamento aprovado'}
              {showPending && '⏳ Pagamento em análise'}
              {showError && '✕ Pagamento recusado ou cancelado'}
            </h2>
            <p className="gifts-last-purchase-message">
              {showSuccess && 'Sua compra foi confirmada. Obrigado pelo presente!'}
              {showPending && 'Assim que o pagamento for aprovado, sua compra será confirmada.'}
              {showError && 'Você pode tentar novamente escolhendo os presentes abaixo e indo ao pagamento.'}
            </p>
            <div className="gifts-last-purchase-details">
              <p><strong>De:</strong> {lastPurchase.fromName}</p>
              <p><strong>E-mail:</strong> {lastPurchase.email}</p>
              {lastPurchase.gifts?.length > 0 && (
                <ul>
                  {lastPurchase.gifts.map((g, i) => (
                    <li key={i}>{g.nome} × {g.quantidade} — R$ {(g.preco * g.quantidade).toFixed(2)}</li>
                  ))}
                </ul>
              )}
              <p className="gifts-last-purchase-total"><strong>Total:</strong> R$ {lastPurchase.totalPrice.toFixed(2)}</p>
              {lastPurchase.message && (
                <div className="gifts-last-purchase-user-message">
                  <strong>Mensagem:</strong>
                  <p>{lastPurchase.message}</p>
                </div>
              )}
            </div>
            <div className="gifts-last-purchase-actions">
              {showSuccess && (
                <button type="button" className="gifts-last-purchase-btn" onClick={() => navigate('/checkout/success?purchase_id=' + lastPurchase.id)}>
                  Ver resumo da compra
                </button>
              )}
              <button type="button" className="gifts-last-purchase-btn gifts-last-purchase-btn-secondary" onClick={() => setLastPurchaseDismissed(true)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

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
                  {gift.estoque <= 0 ? (
                    <span className="gift-sold-out" aria-live="polite">
                      Esgotado
                    </span>
                  ) : isInCart(gift.id) ? (
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
