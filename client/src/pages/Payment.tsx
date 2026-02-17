import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { getApiUrl } from "../utils/api";
import "./Payment.css";

const PENDING_PURCHASE_KEY = "wedding_pending_purchase";

const Payment: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const returnStatus = searchParams.get("status");
  const { cart, totalPrice } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { fromName, message } = (location.state as { fromName?: string; message?: string }) || {};

  useEffect(() => {
    if (cart.length === 0 && !returnStatus) {
      navigate("/checkout");
      return;
    }
    if (!returnStatus && !fromName?.trim()) {
      navigate("/checkout");
    }
  }, [cart.length, returnStatus, fromName, navigate]);

  const handlePayWithMercadoPago = async () => {
    if (cart.length === 0 || !fromName?.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const items = cart.map((item) => ({
        title: item.gift.nome,
        quantity: item.quantity,
        unit_price: item.gift.preco,
        description: item.gift.descricao || undefined,
      }));
      const response = await fetch(getApiUrl("payment/create-preference"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Falha ao criar pagamento. Tente novamente.");
      }
      const { init_point } = await response.json();
      if (init_point) {
        const purchaseData = {
          fromName: fromName?.trim() || "",
          message: message || "",
          gifts: cart.map((item) => ({
            id: item.gift.id,
            nome: item.gift.nome,
            descricao: item.gift.descricao,
            preco: item.gift.preco,
            quantidade: item.quantity,
          })),
          totalPrice,
        };
        localStorage.setItem(PENDING_PURCHASE_KEY, JSON.stringify(purchaseData));
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
            <button
              type="button"
              className="payment-submit-button"
              onClick={() => navigate("/gifts")}
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
