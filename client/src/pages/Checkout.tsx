import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import './Checkout.css';

const Checkout: React.FC = () => {
  const { cart, removeFromCart, totalPrice } = useCart();
  const [fromName, setFromName] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const navigate = useNavigate();

  if (cart.length === 0) {
    return (
      <div className="checkout-page">
        <div className="checkout-empty">
          <h2>Seu carrinho está vazio</h2>
          <button className="back-to-gifts-button" onClick={() => navigate('/gifts')}>
            Voltar para Lista de Presentes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <h1 className="checkout-title">Finalizar Compra</h1>

        {/* Cart Items List */}
        <div className="checkout-items">
          <h2 className="checkout-section-title">Itens Selecionados</h2>
          <div className="cart-items-list">
            {cart.map((item) => (
              <div key={item.gift.id} className="cart-item">
                {item.gift.imagem && (
                  <div className="cart-item-image">
                    <img src={item.gift.imagem} alt={item.gift.nome} />
                  </div>
                )}
                <div className="cart-item-details">
                  <h3 className="cart-item-name">{item.gift.nome}</h3>
                  {item.gift.descricao && (
                    <p className="cart-item-description">{item.gift.descricao}</p>
                  )}
                  <p className="cart-item-price">R$ {item.gift.preco.toFixed(2)}</p>
                </div>
                <button
                  className="cart-item-remove"
                  onClick={() => removeFromCart(item.gift.id)}
                  aria-label="Remover item"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="checkout-total">
          <span className="checkout-total-label">Total:</span>
          <span className="checkout-total-price">R$ {totalPrice.toFixed(2)}</span>
        </div>

        {/* From Name Field */}
        <div className="checkout-from">
          <label htmlFor="fromName" className="checkout-from-label">
            De <span className="checkout-required">*</span>
          </label>
          <input
            id="fromName"
            type="text"
            className="checkout-from-input"
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            placeholder="Seu nome"
            required
          />
        </div>

        {/* Message Textarea */}
        <div className="checkout-message">
          <label htmlFor="message" className="checkout-message-label">
            Deixe aqui uma mensagem para os noivos <span className="checkout-optional">(Opcional)</span>
          </label>
          <textarea
            id="message"
            className="checkout-message-textarea"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escreva sua mensagem aqui..."
            rows={5}
          />
        </div>

        {/* Payment Button */}
        <div className="checkout-actions">
          <button
            className="proceed-payment-button"
            onClick={() => {
              const trimmedName = fromName.trim();
              if (!trimmedName) return;
              navigate('/payment', {
                state: {
                  fromName: trimmedName,
                  message,
                  cart,
                  totalPrice,
                },
              });
            }}
            disabled={!fromName.trim()}
          >
            Ir para o pagamento
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
