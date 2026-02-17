import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './PaymentSuccess.css';

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { paymentId, message } = location.state || {};

  return (
    <div className="payment-success-page">
      <div className="payment-success-container">
        <div className="payment-success-icon">✓</div>
        <h1 className="payment-success-title">Pagamento Realizado com Sucesso!</h1>
        <p className="payment-success-message">
          Obrigado pelo seu presente! Seu pagamento foi processado com sucesso.
        </p>
        {paymentId && (
          <p className="payment-success-id">
            ID do pagamento: {paymentId}
          </p>
        )}
        {message && (
          <div className="payment-success-user-message">
            <p className="payment-success-user-message-label">Sua mensagem:</p>
            <p className="payment-success-user-message-text">{message}</p>
          </div>
        )}
        <button
          className="payment-success-button"
          onClick={() => navigate('/gifts')}
        >
          Voltar para Lista de Presentes
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;
