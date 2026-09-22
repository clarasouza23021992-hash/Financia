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
  endMonth?: string;
  isCarriedOver?: boolean;
  originalDueDate?: string;
  fixedValueType?: 'fixed_value' | 'variable_value';
  isEdited?: boolean;
  lastEditedAt?: string;
}

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

