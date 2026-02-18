import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { getApiUrl } from "../utils/api";
import { isValidEmail } from "../utils/validation";
import type { PurchaseDetails } from "../types/purchase";
import "./Payment.css";

export const LAST_PURCHASE_ID_KEY = "wedding_last_purchase_id";

const Payment: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const returnStatus = searchParams.get("status");
  const purchaseIdFromUrl = searchParams.get("purchase_id");
  const { cart, totalPrice, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchase, setPurchase] = useState<PurchaseDetails | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(true);
  const { fromName, email, message } = (location.state as {
    fromName?: string;
    email?: string;
    message?: string;
  }) || {};

  useEffect(() => {
    if (cart.length === 0 && !returnStatus) {
      navigate("/checkout");
      return;
    }
    if (!returnStatus && (!fromName?.trim() || !email?.trim() || !isValidEmail(email?.trim() ?? ''))) {
      navigate("/checkout");
    }
  }, [cart.length, returnStatus, fromName, email, navigate]);

  const purchaseId = purchaseIdFromUrl || (returnStatus ? localStorage.getItem(LAST_PURCHASE_ID_KEY) : null);
  useEffect(() => {
    if (!returnStatus || !purchaseId) {
      setPurchaseLoading(false);
      return;
    }
    let cancelled = false;
    fetch(getApiUrl(`payment/purchase/${purchaseId}`))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setPurchase(data as PurchaseDetails);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPurchaseLoading(false);
      });
    return () => { cancelled = true; };
  }, [returnStatus, purchaseId]);

  const handlePayWithMercadoPago = async () => {
    if (cart.length === 0 || !fromName?.trim() || !email?.trim() || !isValidEmail(email.trim())) return;
    setError(null);
    setLoading(true);
    try {
      const giftsPayload = cart.map((item) => ({
        id: item.gift.id,
        nome: item.gift.nome,
        descricao: item.gift.descricao,
        preco: item.gift.preco,
        quantidade: item.quantity,
      }));
      const saveRes = await fetch(getApiUrl("payment/save-purchase"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromName: fromName.trim(),
          email: email.trim(),
          message: message || "",
          gifts: giftsPayload,
          totalPrice,
        }),
      });
      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({}));
        throw new Error(err.message || "Falha ao salvar compra. Tente novamente.");
      }
      const { id: purchaseId } = await saveRes.json();
      if (!purchaseId) throw new Error("Resposta inválida ao salvar compra.");

      const items = cart.map((item) => ({
        title: item.gift.nome,
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.gift.preco),
        description: item.gift.descricao || undefined,
      }));
      const response = await fetch(getApiUrl("payment/create-preference"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          payer_email: email?.trim() || undefined,
          external_reference: purchaseId,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Falha ao criar pagamento. Tente novamente.");
      }
      const { init_point } = await response.json();
      if (init_point) {
        localStorage.setItem(LAST_PURCHASE_ID_KEY, purchaseId);
        window.location.href = init_point;
        return;
      }
      throw new Error("Resposta inválida do servidor.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao iniciar pagamento.");
      setLoading(false);
    }
  };

  if (returnStatus) {
    const isFailure = returnStatus === "failure";
    const isPending = returnStatus === "pending";
    return (
      <div className="payment-page">
        <div className="payment-container">
          <div className="payment-form">
            <div className={`payment-return-message ${isFailure ? "payment-return-failure" : "payment-return-pending"}`}>
              <p>
                {isFailure && "O pagamento foi recusado ou cancelado. Você pode tentar novamente na tela de pagamento."}
                {isPending && "Seu pagamento está em análise. Você será notificado quando for aprovado."}
              </p>
            </div>
            {purchaseLoading && <p className="payment-details-loading">Carregando detalhes da compra...</p>}
            {!purchaseLoading && purchase && (
              <div className="payment-purchase-details">
                <h3 className="payment-details-title">Resumo da compra</h3>
                <p className="payment-details-row"><strong>De:</strong> {purchase.fromName}</p>
                <p className="payment-details-row"><strong>E-mail:</strong> {purchase.email}</p>
                {purchase.gifts?.length > 0 && (
                  <ul className="payment-details-items">
                    {purchase.gifts.map((g, i) => (
                      <li key={i}>{g.nome} × {g.quantidade} — R$ {(g.preco * g.quantidade).toFixed(2)}</li>
                    ))}
                  </ul>
                )}
                <p className="payment-details-row payment-details-total"><strong>Total:</strong> R$ {purchase.totalPrice.toFixed(2)}</p>
                {purchase.message && (
                  <div className="payment-details-message">
                    <strong>Mensagem:</strong>
                    <p>{purchase.message}</p>
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              className="payment-submit-button"
              onClick={() => { clearCart(); navigate("/gifts"); }}
            >
              Voltar para lista de presentes
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return null;
  }

  return (
    <div className="payment-page">
      <div className="payment-container">
        <h2 className="payment-section-heading">
          Pagamento com Mercado Pago
        </h2>

        <div className="payment-form">
          <p className="payment-mp-description">
            Você será redirecionado ao checkout seguro do Mercado Pago para escolher a forma de pagamento (cartão, Pix, boleto, etc.).
          </p>

          {error && (
            <div className="payment-error">
              <p>{error}</p>
            </div>
          )}

          <div className="payment-summary">
            <div className="payment-summary-row">
              <span className="payment-summary-label">Total:</span>
              <span className="payment-summary-price">
                R$ {totalPrice.toFixed(2)}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="payment-submit-button payment-mp-button"
            onClick={handlePayWithMercadoPago}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? "Redirecionando..." : "Pagar com Mercado Pago"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Payment;
