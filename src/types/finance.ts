export type PixKeyType = 'CNPJ' | 'CPF' | 'Celular' | 'E-mail' | 'Pix Copia e Cola' | 'Aleatória';
export type RecurrenceType = 'Mensal Fixa' | 'Parcelada' | 'Única / Pontual';
export type BillStatus = 'pending' | 'paid' | 'overdue';

export interface SplitMember {
  name: string;
  percentage: number;
  amount: number;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  category: string;
  favored: string;
  barcode: string;
  pixKey: string;
  pixType: PixKeyType;
  recurrence: RecurrenceType;
  splitHousehold: boolean;
  splitDetails: SplitMember[];
  notes: string;
  status: BillStatus;
  paidAt?: string;
  paidBy?: string;
  receiptUrl?: string; // base64 or object URL
  receiptName?: string;
  receiptType?: string;
  receiptSize?: string;
  version: number;
  updatedAt: string;
  updatedByDevice: string;
  isSynced: boolean;
  isProjected?: boolean;
  installmentNumber?: number;
  totalInstallments?: number;
  parentInstallmentId?: string;
  parentRecurringId?: string;
  endMonth?: string;
  isCarriedOver?: boolean;
  originalDueDate?: string;
  paymentMonth?: string; // YYYY-MM: mês em que o usuário quer pagar / visualizar (caso pague antes ou depois)
  fixedValueType?: 'fixed_value' | 'variable_value';
  isEdited?: boolean;
  lastEditedAt?: string;
}

// Retorna o mês efetivo onde a conta deve aparecer (paymentMonth se definido, senão mês do dueDate)
export const getBillEffectiveMonth = (bill: { dueDate?: string; paymentMonth?: string }): string => {
  if (bill.paymentMonth && bill.paymentMonth.trim().length === 7) {
    return bill.paymentMonth.trim();
  }
  return (bill.dueDate || '').substring(0, 7);
};

// Verifica se a conta foi reagendada para pagar em outro mês (diferente do mês de vencimento)
export const isBillRescheduled = (bill: { dueDate?: string; paymentMonth?: string }): boolean => {
  const dueMonth = (bill.dueDate || '').substring(0, 7);
  const effectiveMonth = getBillEffectiveMonth(bill);
  return Boolean(bill.paymentMonth && effectiveMonth !== dueMonth);
};

export const getMonthNamePtBr = (monthId: string): string => {
  if (!monthId || !monthId.includes('-')) return monthId || '';
  const [y, m] = monthId.split('-').map(Number);
  if (!y || !m || isNaN(y) || isNaN(m)) return monthId;
  const dateObj = new Date(y, m - 1, 15);
  const name = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return name.charAt(0).toUpperCase() + name.slice(1);
};

export const getMonthShortPtBr = (monthId: string): string => {
  if (!monthId || !monthId.includes('-')) return monthId || '';
  const [y, m] = monthId.split('-').map(Number);
  if (!y || !m || isNaN(y) || isNaN(m)) return monthId;
  const dateObj = new Date(y, m - 1, 15);
  const monthShort = dateObj.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  return `${monthShort.charAt(0).toUpperCase() + monthShort.slice(1)}/${String(y).slice(-2)}`;
};

export interface Revenue {
  id: string;
  name: string;
  amount: number;
  date: string; // YYYY-MM-DD
  category: string;
  recurrence: 'Mensal' | 'Única';
  profileName: string;
  notes?: string;
  version: number;
  updatedAt: string;
  updatedByDevice: string;
  isSynced: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  splitShare: number; // e.g. 50
  splitPercentage?: number;
  phone?: string;
  color: string;
  avatar: string;
}

export interface NotificationSetting {
  id: string;
  title: string;
  daysBeforeDue: number;
  enabled: boolean;
}

export interface CloudDevice {
  id: string;
  name: string;
  model: string;
  owner: string;
  lastActive: string;
  isCurrent: boolean;
  iCloudAccount: string;
}

export interface SyncConflictLog {
  id: string;
  recordTitle: string;
  entityType: 'bill' | 'revenue';
  deviceOrigin: string;
  conflictDetails: string;
  resolution: string;
  timestamp: string;
  versionA: number;
  versionB: number;
}

export interface BankConnection {
  id: string;
  institution: string;
  accountType: 'Conta Corrente' | 'Cartão de Crédito' | 'Investimento';
  accountNumber: string;
  balance: number;
  availableLimit?: number;
  usedLimit?: number;
  status: 'connected' | 'syncing' | 'needs_auth';
  lastSync: string;
  securityHash: string;
  cardHolder?: string;
  closingDay?: number;
  dueDay?: number;
  cardName?: string;
  last4?: string;
  brand?: string;
  color?: string;
}

export interface CardPurchaseRequest {
  institution?: string;
  cardId?: string;
  cardName?: string;
  cardLast4?: string;
  cardHolder?: string;
  description: string;
  totalAmount: number;
  installments: number;
  installmentAmount?: number;
  purchaseDate?: string;
  startMonth?: string;
  dueDay?: number;
  closingDay?: number;
  category?: string;
  splitHousehold?: boolean;
  notes?: string;
}

export interface CardPurchaseResult {
  bills: Bill[];
  totalAmount: number;
  installmentAmount: number;
  installmentsCount: number;
  cardName: string;
  firstDueDate: string;
  lastDueDate: string;
  parentInstallmentId: string;
  updatedConnection?: BankConnection;
}

export interface NotificationRule {
  enabled: boolean;
  dueToday: boolean;
  daysInAdvance: number;
  notifyOverdue: boolean;
  recurringReminders: boolean;
  soundEnabled: boolean;
  preferredTime: string;
}

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  date: string;
  type: 'urgent' | 'warning' | 'info' | 'success';
  read: boolean;
  billId?: string;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  formattedTime: string;
  status: 'success' | 'error' | 'in_progress';
  message: string;
  devicesDetectedCount: number;
  isWifeConnected: boolean;
  wifeDeviceName?: string;
  wifeDeviceModel?: string;
  billsSyncedCount: number;
  revenuesSyncedCount: number;
  latencyMs?: number;
}

