import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { getApiUrl } from '../utils/api';
import './PaymentSuccess.css';

const PENDING_PURCHASE_KEY = 'wedding_pending_purchase';

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id');
  const status = searchParams.get('status') || searchParams.get('collection_status');

  useEffect(() => {
    const pendingJson = localStorage.getItem(PENDING_PURCHASE_KEY);
    if (!pendingJson || status !== 'approved') {
      setSaving(false);
      return;
    }

    let parsed: { fromName?: string; message?: string; gifts?: unknown[]; totalPrice?: number };
    try {
      parsed = JSON.parse(pendingJson);
    } catch {
      setSaving(false);
      return;
    }

    const savePurchase = async () => {
      try {
        const response = await fetch(getApiUrl('payment/save-purchase'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromName: parsed.fromName || '',
            message: parsed.message || '',
            gifts: parsed.gifts || [],
            totalPrice: parsed.totalPrice || 0,
            paymentId: paymentId || undefined,
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.message || 'Falha ao salvar compra.');
        }

        if (parsed.message) {
          setMessage(parsed.message);
        }
        localStorage.removeItem(PENDING_PURCHASE_KEY);
        clearCart();
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'Erro ao salvar compra.');
      } finally {
        setSaving(false);
      }
    };

    savePurchase();
  }, [status, paymentId, clearCart]);

  return (
    <div className="payment-success-page">
      <div className="payment-success-container">
        <div className="payment-success-icon">✓</div>
        <h1 className="payment-success-title">Pagamento Realizado com Sucesso!</h1>
        <p className="payment-success-message">
          Obrigado pelo seu presente! Seu pagamento foi processado com sucesso.
        </p>
        {saving && (
          <p className="payment-success-saving">Salvando sua compra...</p>
        )}
        {saveError && (
          <p className="payment-success-error">Aviso: {saveError}</p>
        )}
        {!saving && paymentId && (
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
          disabled={saving}
        >
          Voltar para Lista de Presentes
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;
