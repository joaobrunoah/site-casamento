import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useCart } from '../contexts/CartContext';
import { getApiUrl } from '../utils/api';
import './Payment.css';

// Initialize Stripe
const stripePublishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

type PaymentMethod = 'card' | 'pix' | 'boleto';

interface PaymentFormProps {
  clientSecret: string;
  totalPrice: number;
  fromName: string;
  message: string;
  selectedMethod: PaymentMethod;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ clientSecret, totalPrice, fromName, message, selectedMethod }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message || 'Ocorreu um erro ao processar o pagamento.');
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      clearCart();
      navigate('/checkout/success', {
        state: {
          paymentIntentId: paymentIntent.id,
          fromName,
          message,
        },
      });
    } else {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <div className="payment-element-container">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {errorMessage && (
        <div className="payment-error">
          <p>{errorMessage}</p>
        </div>
      )}

      <div className="payment-summary">
        <div className="payment-summary-row">
          <span className="payment-summary-label">Total:</span>
          <span className="payment-summary-price">R$ {totalPrice.toFixed(2)}</span>
        </div>
      </div>

      <button
        type="submit"
        className="payment-submit-button"
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? 'Processando...' : 'Finalizar Pagamento'}
      </button>
    </form>
  );
};

const Payment: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { cart, totalPrice } = useCart();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

  const fromName = location.state?.fromName || '';
  const message = location.state?.message || '';

  useEffect(() => {
    // Redirect if no cart items
    if (cart.length === 0) {
      navigate('/checkout');
      return;
    }
  }, [cart, navigate]);

  // Create payment intent when method is selected
  useEffect(() => {
    if (!selectedMethod) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setClientSecret(null);

    // Create payment intent with selected method
    const createPaymentIntent = async () => {
      try {
        const apiUrl = getApiUrl('payment/create-intent');
        console.log('Creating payment intent with URL:', apiUrl);
        console.log('Payment method:', selectedMethod);
        
        const requestBody = {
          amount: Math.round(totalPrice * 100), // Convert to cents
          currency: 'brl',
          cart: cart.map(item => ({
            giftId: item.gift.id,
            giftName: item.gift.nome,
            price: item.gift.preco,
            quantity: item.quantity,
          })),
          fromName,
          message,
          paymentMethodType: selectedMethod,
        };
        
        console.log('Request body:', requestBody);

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error response:', errorData);
          throw new Error(errorData.message || `Erro ao criar intenção de pagamento (${response.status})`);
        }

        const data = await response.json();
        console.log('Payment intent created:', data);
        setClientSecret(data.clientSecret);
      } catch (err) {
        console.error('Error creating payment intent:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setIsLoading(false);
      }
    };

    createPaymentIntent();
  }, [selectedMethod, cart, totalPrice, fromName, message]);

  if (!stripePublishableKey) {
    return (
      <div className="payment-page">
        <div className="payment-container">
          <div className="payment-error-container">
            <h2 className="payment-error-title">Configuração de Pagamento</h2>
            <p className="payment-error-message">
              A chave pública do Stripe não está configurada. Por favor, configure REACT_APP_STRIPE_PUBLISHABLE_KEY.
            </p>
            <button
              className="payment-back-button"
              onClick={() => navigate('/checkout')}
            >
              Voltar para o Checkout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show payment method selection if no method is selected yet
  if (!selectedMethod) {
    return (
      <div className="payment-page">
        <div className="payment-container">
          <h1 className="payment-title">Pagamento</h1>
          
          <div className="payment-info">
            <p className="payment-info-text">
              Selecione a forma de pagamento:
            </p>
          </div>

          <div className="payment-methods-selection">
            <button
              className="payment-method-button"
              onClick={() => {
                setError(null);
                setSelectedMethod('card');
              }}
            >
              <div className="payment-method-icon">💳</div>
              <div className="payment-method-label">Cartão de Crédito ou Débito</div>
            </button>
            <button
              className="payment-method-button"
              onClick={() => {
                setError(null);
                setSelectedMethod('pix');
              }}
            >
              <div className="payment-method-icon">📱</div>
              <div className="payment-method-label">Pix</div>
            </button>
            <button
              className="payment-method-button"
              onClick={() => {
                setError(null);
                setSelectedMethod('boleto');
              }}
            >
              <div className="payment-method-icon">🧾</div>
              <div className="payment-method-label">Boleto</div>
            </button>
          </div>

          <div className="payment-summary-preview">
            <div className="payment-summary-row">
              <span className="payment-summary-label">Total:</span>
              <span className="payment-summary-price">R$ {totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-page">
      <div className="payment-container">
        <h1 className="payment-title">Pagamento</h1>
        
        <div className="payment-method-header">
          <button
            className="payment-back-method-button"
            onClick={() => {
              setSelectedMethod(null);
              setError(null);
              setClientSecret(null);
              setIsLoading(false);
            }}
          >
            ← Voltar para seleção
          </button>
          <div className="payment-method-selected">
            {selectedMethod === 'card' && '💳 Cartão de Crédito ou Débito'}
            {selectedMethod === 'pix' && '📱 Pix'}
            {selectedMethod === 'boleto' && '🧾 Boleto'}
          </div>
        </div>

        {isLoading && (
          <div className="payment-loading">
            <p>Carregando informações de pagamento...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="payment-error-container">
            <h2 className="payment-error-title">Erro ao processar pagamento</h2>
            <p className="payment-error-message">{error}</p>
            <button
              className="payment-back-button"
              onClick={() => {
                setSelectedMethod(null);
                setError(null);
              }}
            >
              Voltar para seleção
            </button>
          </div>
        )}

        {!isLoading && !error && clientSecret && stripePromise && (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'stripe',
              variables: {
                colorPrimary: '#DCAE9D',
                colorBackground: '#ffffff',
                colorText: '#2c2c2c',
                colorDanger: '#c53030',
                fontFamily: 'Glacial Indifference, sans-serif',
                spacingUnit: '4px',
                borderRadius: '0px',
              },
            },
            locale: 'pt-BR',
          }}
        >
          <PaymentForm
            clientSecret={clientSecret}
            totalPrice={totalPrice}
            fromName={fromName}
            message={message}
            selectedMethod={selectedMethod}
          />
        </Elements>
        )}
      </div>
    </div>
  );
};

export default Payment;
