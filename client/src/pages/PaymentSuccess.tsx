import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { getApiUrl } from '../utils/api';
import { LAST_PURCHASE_ID_KEY } from './Payment';
import type { PurchaseDetails } from '../types/purchase';
import './PaymentSuccess.css';

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const [purchase, setPurchase] = useState<PurchaseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const purchaseIdFromUrl = searchParams.get('purchase_id');
  const purchaseId = purchaseIdFromUrl || localStorage.getItem(LAST_PURCHASE_ID_KEY);

  useEffect(() => {
    if (!purchaseId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch(getApiUrl(`payment/purchase/${purchaseId}`))
      .then((res) => {
        if (!res.ok) throw new Error('Compra não encontrada');
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setPurchase(data as PurchaseDetails);
      })
      .catch((e) => {
        if (!cancelled) setFetchError(e instanceof Error ? e.message : 'Erro ao carregar compra.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [purchaseId]);

  useEffect(() => {
    if (purchase) clearCart();
  }, [purchase, clearCart]);

  return (
    <div className="payment-success-page">
      <div className="payment-success-container">
        <div className="payment-success-icon">✓</div>
        <h1 className="payment-success-title">Pagamento Realizado com Sucesso!</h1>
        <p className="payment-success-message">
          Obrigado pelo seu presente! Seu pagamento foi processado com sucesso.
        </p>
        {loading && <p className="payment-success-saving">Carregando detalhes da compra...</p>}
        {fetchError && (
          <p className="payment-success-error">Aviso: {fetchError}</p>
        )}
        {!loading && purchase && (
          <div className="payment-success-details">
            <h3 className="payment-success-details-title">Resumo da compra</h3>
            <p className="payment-success-details-row"><strong>De:</strong> {purchase.fromName}</p>
            <p className="payment-success-details-row"><strong>E-mail:</strong> {purchase.email}</p>
            {purchase.gifts?.length > 0 && (
              <ul className="payment-success-details-items">
                {purchase.gifts.map((g, i) => (
                  <li key={i}>{g.nome} × {g.quantidade} — R$ {(g.preco * g.quantidade).toFixed(2)}</li>
                ))}
              </ul>
            )}
            <p className="payment-success-details-row payment-success-details-total">
              <strong>Total:</strong> R$ {purchase.totalPrice.toFixed(2)}
            </p>
            {purchase.paymentId && (
              <p className="payment-success-id">ID do pagamento: {purchase.paymentId}</p>
            )}
            {purchase.message && (
              <div className="payment-success-user-message">
                <p className="payment-success-user-message-label">Sua mensagem:</p>
                <p className="payment-success-user-message-text">{purchase.message}</p>
              </div>
            )}
          </div>
        )}
        <button
          className="payment-success-button"
          onClick={() => navigate('/gifts')}
          disabled={loading}
        >
          Voltar para Lista de Presentes
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;
