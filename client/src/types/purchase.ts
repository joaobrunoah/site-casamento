export interface PurchaseDetails {
  id: string;
  fromName: string;
  email: string;
  message: string;
  gifts: Array<{
    id?: string;
    nome: string;
    descricao?: string;
    preco: number;
    quantidade: number;
  }>;
  totalPrice: number;
  paymentId: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: unknown;
}
