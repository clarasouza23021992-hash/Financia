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
  lastEditedBy?: string;
  lastActionDescription?: string;
}

// Retorna o mês efetivo onde a conta deve aparecer (paymentMonth se definido e legítimo, senão mês do dueDate)
export const getBillEffectiveMonth = (bill: {
  dueDate?: string;
  paymentMonth?: string;
  recurrence?: string;
  installmentNumber?: number;
  parentRecurringId?: string;
  id?: string;
  name?: string;
  isEdited?: boolean;
}): string => {
  const dueMonth = (bill.dueDate || '').substring(0, 7);

  // Regra fundamental: Dívidas parceladas NUNCA devem ter todas as parcelas aglomeradas no mesmo mês!
  // Cada parcela pertence ao seu próprio mês de vencimento (dueDate).
  const isInstallment = bill.recurrence === 'Parcelada' || 
                        Boolean(bill.installmentNumber && bill.installmentNumber > 0) ||
                        (bill.name && /\b(?:\d+\/\d+|\d+\s*de\s*\d+|parcela\s*\d+)\b/i.test(bill.name));

  if (isInstallment) {
    return dueMonth;
  }

  if (bill.paymentMonth && bill.paymentMonth.trim().length === 7) {
    const payMonth = bill.paymentMonth.trim();
    if (payMonth === dueMonth) {
      return dueMonth;
    }
    const isPropagatedRecurring = Boolean(bill.parentRecurringId || (bill.id && bill.id.startsWith('rec_')));
    if (isPropagatedRecurring && !bill.isEdited) {
      return dueMonth;
    }
    return payMonth;
  }
  return dueMonth;
};

// Verifica se a conta foi reagendada para pagar em outro mês (diferente do mês de vencimento)
export const isBillRescheduled = (bill: { dueDate?: string; paymentMonth?: string }): boolean => {
  const dueMonth = (bill.dueDate || '').substring(0, 7);
  const effectiveMonth = getBillEffectiveMonth(bill);
  return Boolean(bill.paymentMonth && effectiveMonth !== dueMonth);
};

// Normalização de título de conta para busca, agrupamento e deduplicação precisa
export const normalizeBillTitle = (name: string): string => {
  return (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\(recuperad[oa]\)/gi, '')
    .replace(/^conta\s*[-:]\s*/i, '')
    .replace(/^conta\s*de\s*/i, '')
    .replace(/^fatura\s*[-:]\s*/i, '')
    .replace(/^boleto\s*[-:]\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// Extrai nome base e número de parcela (suporta todos os formatos comuns: "1/10", "(1/10)", "1 de 10", "parcela 1", etc.)
export const parseInstallmentDetails = (
  name: string,
  b?: { installmentNumber?: number; totalInstallments?: number }
): { baseName: string; instNum?: number; totalInst?: number } => {
  const norm = normalizeBillTitle(name);

  // Padrão 1: Parcela no início (ex: "parcela 1/10 curso", "1/10 empréstimo", "parcela 1 de 10 dentista")
  const matchStart = norm.match(/^(?:parcela\s*)?(\d+)\s*(?:\/|de)\s*(\d+)\s*[-:–—]?\s*(.*)$/i);
  if (matchStart && matchStart[3].trim()) {
    return {
      baseName: matchStart[3].trim(),
      instNum: parseInt(matchStart[1], 10),
      totalInst: parseInt(matchStart[2], 10),
    };
  }

  // Padrão 2: Parcela no final (ex: "curso (1/10)", "curso 1/10", "curso parcela 1 de 10", "curso - 1 de 10", "curso (1 de 10)")
  const matchEnd = norm.match(/^(.*?)(?:[\s\-_(]+(?:parcela\s*)?(\d+)\s*(?:\/|de)\s*(\d+)\)?)$/i);
  if (matchEnd) {
    return {
      baseName: matchEnd[1].replace(/[-–—]\s*$/, '').trim(),
      instNum: parseInt(matchEnd[2], 10),
      totalInst: parseInt(matchEnd[3], 10),
    };
  }

  // Padrão 3: Parcela única identificada (ex: "curso parcela 1", "curso (parcela 1)", "curso - parcela 2")
  const matchSingle = norm.match(/^(.*?)(?:[\s\-_(]+parcela\s*(\d+)\)?)$/i);
  if (matchSingle) {
    return {
      baseName: matchSingle[1].replace(/[-–—]\s*$/, '').trim(),
      instNum: parseInt(matchSingle[2], 10),
      totalInst: b?.totalInstallments,
    };
  }

  return {
    baseName: norm,
    instNum: b?.installmentNumber,
    totalInst: b?.totalInstallments,
  };
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
  iCloudAccount?: string;
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
  actorName?: string;
  deviceName?: string;
  sourceDeviceName?: string;
  actionType?: string;
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

export interface CategoryBudget {
  category: string;
  limit: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  icon?: string;
}

export interface ChangeNotification {
  id: string;
  householdId: string;
  sourceDeviceId: string;
  sourceDeviceName: string;
  sourceUserName: string;
  actionType: 'bill_created' | 'bill_updated' | 'bill_paid' | 'bill_pending' | 'bill_deleted' | 'revenue_created' | 'revenue_deleted' | 'receipt_attached' | 'bill_rescheduled' | string;
  title: string;
  message: string;
  targetItemName?: string;
  targetBillId?: string;
  bill?: Bill;
  amount?: number;
  timestamp: string;
}

export interface WeeklyExtraExpense {
  id: string;
  description: string;
  amount: number;
}

export interface WeeklyCoffeeRoutine {
  id: string;
  completedAt: string;
  completedBy: string;
  weekRange: string;
  streakCount: number;
  billsDueCount: number;
  billsDueTotal: number;
  missingReceiptsCount: number;
  projectedSurplus: number;
  extraExpenses: WeeklyExtraExpense[];
  notes?: string;
  itemsChecked: {
    billsReviewed: boolean;
    receiptsReviewed: boolean;
    surplusReviewed: boolean;
    extraExpensesAligned: boolean;
  };
}

export interface PaymentPropagationLogEntry {
  id: string;
  timestamp: string;
  formattedTime: string;
  eventType: 
    | 'STATUS_CHANGE_LOCAL'
    | 'SYNC_DISPATCHED'
    | 'SYNC_ACKNOWLEDGED'
    | 'WS_BROADCAST_SENT'
    | 'WS_UPDATE_RECEIVED'
    | 'ID_RECONCILED'
    | 'CONFLICT_RESOLVED'
    | 'DIAGNOSTIC_CHECK';
  billId: string;
  canonicalId?: string;
  billName: string;
  billAmount: number;
  month: string;
  oldStatus?: 'pending' | 'paid' | 'overdue';
  newStatus: 'pending' | 'paid' | 'overdue';
  version: number;
  actor: string;
  deviceId: string;
  deviceName: string;
  householdId: string;
  details: string;
  success: boolean;
  propagationLatencyMs?: number;
}

