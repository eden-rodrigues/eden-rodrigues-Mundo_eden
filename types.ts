
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  age?: number;
  birthDate?: string;
  gender?: 'Masculino' | 'Feminino' | 'Outro' | 'Prefiro não dizer';
  bio?: string;
  createdAt: string;
  profileCompleted?: boolean;
}

export interface Feedback {
  id?: string;
  userId: string;
  userName: string;
  type: 'bug' | 'sugestao' | 'elogio' | 'outro';
  message: string;
  createdAt: string;
  status: 'pendente' | 'lido' | 'resolvido';
}

export interface TransactionItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  isNecessary?: boolean;
}

export type TransactionType = 'entrada' | 'saida';

export interface Transaction {
  id?: string;
  userId: string;
  account: string;
  amount: number;
  category: string;
  date: string;
  description: string;
  isPaid: boolean;
  isRecurring: boolean;
  items?: TransactionItem[];
  observations: string;
  paymentType: string;
  receiptUrl?: string;
  time: string;
  type: TransactionType;
}

export interface Balance {
  totalIn: number;
  totalOut: number;
  net: number;
}
