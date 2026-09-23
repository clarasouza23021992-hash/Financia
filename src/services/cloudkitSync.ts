import { Bill, Revenue, UserProfile, CloudDevice, SyncConflictLog, SyncLogEntry } from '../types/finance';

const STORAGE_KEY_BILLS = 'financas_cloudkit_bills_v3';
const STORAGE_KEY_REVENUES = 'financas_cloudkit_revenues_v3';
const STORAGE_KEY_PROFILES = 'financas_cloudkit_profiles_v3';
const STORAGE_KEY_DEVICES = 'financas_cloudkit_devices_v3';
const STORAGE_KEY_ACTIVE_DEVICE = 'financas_cloudkit_active_device_v3';
const STORAGE_KEY_CONFLICTS = 'financas_cloudkit_conflicts_v3';
const STORAGE_KEY_OFFLINE_QUEUE = 'financas_cloudkit_offline_queue_v3';
const STORAGE_KEY_CUSTOMIZED = 'financas_cloudkit_user_customized_v1';
const STORAGE_KEY_NO_MOCK = 'financas_cloudkit_no_mock_v1';
const STORAGE_KEY_SYNC_LOGS = 'financas_cloudkit_sync_logs_v2';
const STORAGE_KEY_SAFETY_VAULT_BILLS = 'financas_safety_vault_bills_v1';
const STORAGE_KEY_SAFETY_VAULT_REVENUES = 'financas_safety_vault_revenues_v1';

export const DEFAULT_PROFILES: UserProfile[] = [
  { id: 'p1', name: 'Você (Titular)', role: 'Administrador da Casa', splitShare: 50, splitPercentage: 50, color: '#3B82F6', avatar: '👤', phone: '' },
  { id: 'p2', name: 'Esposa', role: 'Administradora da Casa', splitShare: 50, splitPercentage: 50, color: '#EC4899', avatar: '👩🏻', phone: '' },
];

export const DEFAULT_DEVICES: CloudDevice[] = [
  {
    id: 'dev_user_main',
    name: 'iPhone Carlos',
    model: 'iPhone 15 Pro',
    owner: 'Carlos',
    lastActive: 'Agora mesmo',
    isCurrent: true,
    iCloudAccount: 'carlos@icloud.com',
  },
];

// Clean start - no fictitious sample debts
export const INITIAL_BILLS: Bill[] = [];

// Identifiers and detection for sample fictitious bills
export const MOCK_BILL_IDS = [
  'bill-condominio',
  'bill-luz',
  'bill-gas',
  'bill-gas-pago',
  'bill-internet',
  'bill-financiamento',
  'bill-mercado',
  'bill-streaming',
  'bill-saude',
];

export function isMockBill(b: Partial<Bill>): boolean {
  if (!b) return false;
  // If user edited or created this bill with version > 1 or custom device, it's real!
  if (b.version && b.version > 1) return false;
  if (b.isEdited || b.lastEditedAt) return false;

  const id = (b.id || '').toLowerCase();
  const favored = (b.favored || '').toLowerCase();

  // Only match the original static dummy placeholder records
  if (id === 'bill-condominio' && favored.includes('administradora predial alfa')) return true;
  if (id === 'bill-luz' && favored.includes('enel distribuição sp') && b.amount === 230) return true;
  if (id === 'bill-gas' && favored.includes('comgás são paulo') && b.amount === 185) return true;
  if (id === 'bill-gas-pago' && favored.includes('comgás são paulo')) return true;
  if (id === 'bill-internet' && favored.includes('claro brasil') && b.amount === 149.9) return true;
  if (id === 'bill-financiamento' && favored.includes('caixa') && b.amount === 1850) return true;
  if (id === 'bill-mercado' && favored.includes('pão de açúcar') && b.amount === 720) return true;
  if (id === 'bill-streaming' && favored.includes('netflix entretenimento') && b.amount === 55.9) return true;
  if (id === 'bill-saude' && favored.includes('unimed') && b.amount === 940) return true;

  return false;
}

export const INITIAL_REVENUES: Revenue[] = [
  {
    id: 'rev-carlos-salario',
    name: 'Salário Líquido (Carlos)',
    amount: 6850.00,
    date: '2026-10-05',
    category: 'Salário & Renda',
    recurrence: 'Mensal',
    profileName: 'Carlos',
    notes: 'Crédito em conta corrente Itaú.',
    version: 2,
    updatedAt: '2026-10-05T10:00:00.000Z',
    updatedByDevice: 'Dispositivo Principal',
    isSynced: true,
  },
  {
    id: 'rev-paula-salario',
    name: 'Salário Líquido (Paula)',
    amount: 7240.00,
    date: '2026-10-05',
    category: 'Salário & Renda',
    recurrence: 'Mensal',
    profileName: 'Paula',
    notes: 'Crédito em conta corrente Nubank.',
    version: 2,
    updatedAt: '2026-10-05T10:05:00.000Z',
    updatedByDevice: 'Dispositivo Principal',
    isSynced: true,
  },
  {
    id: 'rev-rendimentos',
    name: 'Rendimento CDB / Tesouro Selic',
    amount: 345.80,
    date: '2026-10-15',
    category: 'Investimentos & Rendimentos',
    recurrence: 'Mensal',
    profileName: 'Carlos',
    notes: 'Reserva de emergência do casal.',
    version: 1,
    updatedAt: '2026-10-15T09:00:00.000Z',
    updatedByDevice: 'Dispositivo Principal',
    isSynced: true,
  },
];

class CloudKitSyncEngine {
  private channel: BroadcastChannel | null = null;
  private syncListeners: Array<(event: { type: string; payload?: any }) => void> = [];
  private isSyncingToServer: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Check URL param ?house= or ?casa= and ?role=esposa
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const houseFromUrl = urlParams.get('house') || urlParams.get('casa');
        if (houseFromUrl && houseFromUrl.trim()) {
          const cleanHouse = houseFromUrl.trim().toLowerCase();
          localStorage.setItem('financas_household_id', cleanHouse);
        }
        const roleFromUrl = urlParams.get('role');
        if (roleFromUrl === 'esposa' || urlParams.has('esposa')) {
          localStorage.setItem('financas_my_device_custom_name', 'iPhone da Esposa');
          localStorage.setItem('financas_my_role', 'Esposa');
        }
      } catch {}

      if ('BroadcastChannel' in window) {
        this.channel = new BroadcastChannel('icloud_cloudkit_sync');
        this.channel.onmessage = (event) => {
          if (event.data?.type === 'CLOUDKIT_SYNC_UPDATE') {
            this.notifyListeners(event.data.action || 'SYNC', event.data.payload);
          }
        };
      }

      // Initial server sync
      setTimeout(() => {
        this.syncWithServer();
      }, 300);

      // Periodic auto-sync every 4 seconds when online and page visible
      setInterval(() => {
        if (!document.hidden && navigator.onLine) {
          this.syncWithServer();
        }
      }, 4000);

      window.addEventListener('online', () => {
        this.syncWithServer();
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.syncWithServer();
        }
      });
    }
  }

  public getHouseholdId(): string {
    if (typeof window === 'undefined') return 'casa-familia';
    return (localStorage.getItem('financas_household_id') || 'casa-familia').trim().toLowerCase();
  }

  public setHouseholdId(code: string): void {
    if (typeof window === 'undefined') return;
    const clean = code.trim().toLowerCase() || 'casa-familia';
    localStorage.setItem('financas_household_id', clean);
    this.broadcastUpdate('HOUSEHOLD_CHANGED', clean);
    this.syncWithServer();
  }

  public getHouseholdCode(): string {
    return this.getHouseholdId().toUpperCase();
  }

  public getShareLink(): string {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/?house=${encodeURIComponent(this.getHouseholdId())}`;
  }

  public getWifeShareLink(): string {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/?house=${encodeURIComponent(this.getHouseholdId())}&role=esposa`;
  }

  public subscribe(listener: () => void): () => void {
    const handler = () => listener();
    this.syncListeners.push(handler);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== handler);
    };
  }

  public onSync(callback: (event: { type: string; payload?: any }) => void): () => void {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(action = 'UPDATE', payload?: any) {
    this.syncListeners.forEach(fn => fn({ type: action, payload }));
  }

  private broadcastUpdate(type: string, payload?: any) {
    if (this.channel) {
      this.channel.postMessage({ type: 'CLOUDKIT_SYNC_UPDATE', action: type, payload, timestamp: Date.now() });
    }
    this.notifyListeners(type, payload);
  }

  // Generate couple household bills for specified or default months
  public generateDefaultBills(months: string[] = ['2026-09', '2026-10', '2026-11']): Bill[] {
    const activeDev = 'iPhone Carlos';
    const nowIso = new Date().toISOString();
    const result: Bill[] = [];

    for (const month of months) {
      result.push(
        {
          id: `bill-condo-${month}`,
          name: 'Taxa de Condomínio',
          amount: 580.00,
          dueDate: `${month}-10`,
          category: 'Habitação & Moradia',
          status: month === '2026-09' ? 'paid' : 'pending',
          paidAt: month === '2026-09' ? `${month}-09T10:00:00.000Z` : undefined,
          paidBy: month === '2026-09' ? 'Carlos' : undefined,
          recurrence: 'Mensal Fixa',
          favored: 'Administradora do Condomínio',
          notes: 'Boleto mensal do condomínio residencial.',
          barcode: '',
          pixKey: '',
          pixType: 'Pix Copia e Cola',
          splitHousehold: true,
          splitDetails: [
            { name: 'Carlos', percentage: 50, amount: 290.00 },
            { name: 'Paula', percentage: 50, amount: 290.00 },
          ],
          version: 2,
          updatedAt: nowIso,
          updatedByDevice: activeDev,
          isSynced: true,
          fixedValueType: 'fixed_value',
        },
        {
          id: `bill-luz-${month}`,
          name: 'Energia Elétrica (Enel)',
          amount: 245.60,
          dueDate: `${month}-15`,
          category: 'Habitação & Moradia',
          status: month === '2026-09' ? 'paid' : 'pending',
          paidAt: month === '2026-09' ? `${month}-14T14:30:00.000Z` : undefined,
          paidBy: month === '2026-09' ? 'Paula' : undefined,
          recurrence: 'Mensal Fixa',
          favored: 'Enel Distribuição SP',
          notes: 'Consumo de energia da residência.',
          barcode: '',
          pixKey: '',
          pixType: 'Pix Copia e Cola',
          splitHousehold: true,
          splitDetails: [
            { name: 'Carlos', percentage: 50, amount: 122.80 },
            { name: 'Paula', percentage: 50, amount: 122.80 },
          ],
          version: 2,
          updatedAt: nowIso,
          updatedByDevice: activeDev,
          isSynced: true,
          fixedValueType: 'variable_value',
        },
        {
          id: `bill-gas-${month}`,
          name: 'Gás Encanado (Comgás)',
          amount: 85.40,
          dueDate: `${month}-18`,
          category: 'Habitação & Moradia',
          status: month === '2026-09' ? 'paid' : 'pending',
          paidAt: month === '2026-09' ? `${month}-18T09:15:00.000Z` : undefined,
          paidBy: month === '2026-09' ? 'Carlos' : undefined,
          recurrence: 'Mensal Fixa',
          favored: 'Comgás São Paulo',
          notes: 'Consumo de gás encanado.',
          barcode: '',
          pixKey: '',
          pixType: 'Pix Copia e Cola',
          splitHousehold: true,
          splitDetails: [
            { name: 'Carlos', percentage: 50, amount: 42.70 },
            { name: 'Paula', percentage: 50, amount: 42.70 },
          ],
          version: 2,
          updatedAt: nowIso,
          updatedByDevice: activeDev,
          isSynced: true,
          fixedValueType: 'variable_value',
        },
        {
          id: `bill-internet-${month}`,
          name: 'Internet Fibra Óptica',
          amount: 139.90,
          dueDate: `${month}-20`,
          category: 'Internet & Telefone',
          status: month === '2026-09' ? 'paid' : 'pending',
          paidAt: month === '2026-09' ? `${month}-20T11:00:00.000Z` : undefined,
          paidBy: month === '2026-09' ? 'Carlos' : undefined,
          recurrence: 'Mensal Fixa',
          favored: 'Claro Fibra / Vivo',
          notes: 'Banda larga residencial 600 Mega.',
          barcode: '',
          pixKey: '',
          pixType: 'Pix Copia e Cola',
          splitHousehold: true,
          splitDetails: [
            { name: 'Carlos', percentage: 50, amount: 69.95 },
            { name: 'Paula', percentage: 50, amount: 69.95 },
          ],
          version: 2,
          updatedAt: nowIso,
          updatedByDevice: activeDev,
          isSynced: true,
          fixedValueType: 'fixed_value',
        },
        {
          id: `bill-moradia-${month}`,
          name: 'Financiamento Imobiliário / Aluguel',
          amount: 2450.00,
          dueDate: `${month}-10`,
          category: 'Habitação & Moradia',
          status: month === '2026-09' ? 'paid' : 'pending',
          paidAt: month === '2026-09' ? `${month}-10T08:00:00.000Z` : undefined,
          paidBy: month === '2026-09' ? 'Carlos' : undefined,
          recurrence: 'Mensal Fixa',
          favored: 'Caixa Econômica Federal',
          notes: 'Parcela mensal da moradia da família.',
          barcode: '',
          pixKey: '',
          pixType: 'Pix Copia e Cola',
          splitHousehold: true,
          splitDetails: [
            { name: 'Carlos', percentage: 50, amount: 1225.00 },
            { name: 'Paula', percentage: 50, amount: 1225.00 },
          ],
          version: 2,
          updatedAt: nowIso,
          updatedByDevice: activeDev,
          isSynced: true,
          fixedValueType: 'fixed_value',
        },
        {
          id: `bill-mercado-${month}`,
          name: 'Supermercado & Feira do Mês',
          amount: 1650.00,
          dueDate: `${month}-08`,
          category: 'Alimentação & Mercado',
          status: month === '2026-09' ? 'paid' : 'pending',
          paidAt: month === '2026-09' ? `${month}-08T17:00:00.000Z` : undefined,
          paidBy: month === '2026-09' ? 'Paula' : undefined,
          recurrence: 'Mensal Fixa',
          favored: 'Supermercado Principal',
          notes: 'Compras essenciais de mercado e feira para a casa.',
          barcode: '',
          pixKey: '',
          pixType: 'Pix Copia e Cola',
          splitHousehold: true,
          splitDetails: [
            { name: 'Carlos', percentage: 50, amount: 825.00 },
            { name: 'Paula', percentage: 50, amount: 825.00 },
          ],
          version: 2,
          updatedAt: nowIso,
          updatedByDevice: activeDev,
          isSynced: true,
          fixedValueType: 'variable_value',
        },
        {
          id: `bill-saude-${month}`,
          name: 'Plano de Saúde Familiar',
          amount: 980.00,
          dueDate: `${month}-25`,
          category: 'Saúde & Cuidados',
          status: 'pending',
          recurrence: 'Mensal Fixa',
          favored: 'Operadora de Saúde',
          notes: 'Mensalidade do plano de saúde do casal.',
          barcode: '',
          pixKey: '',
          pixType: 'Pix Copia e Cola',
          splitHousehold: true,
          splitDetails: [
            { name: 'Carlos', percentage: 50, amount: 490.00 },
            { name: 'Paula', percentage: 50, amount: 490.00 },
          ],
          version: 2,
          updatedAt: nowIso,
          updatedByDevice: activeDev,
          isSynced: true,
          fixedValueType: 'fixed_value',
        },
        {
          id: `bill-streaming-${month}`,
          name: 'Streaming & Assinaturas',
          amount: 69.90,
          dueDate: `${month}-12`,
          category: 'Lazer & Entretenimento',
          status: 'paid',
          paidAt: `${month}-05T12:00:00.000Z`,
          paidBy: 'Carlos',
          recurrence: 'Mensal Fixa',
          favored: 'Netflix & Spotify',
          notes: 'Serviços de streaming digital do casal.',
          barcode: '',
          pixKey: '',
          pixType: 'Pix Copia e Cola',
          splitHousehold: true,
          splitDetails: [
            { name: 'Carlos', percentage: 50, amount: 34.95 },
            { name: 'Paula', percentage: 50, amount: 34.95 },
          ],
          version: 2,
          updatedAt: nowIso,
          updatedByDevice: activeDev,
          isSynced: true,
          fixedValueType: 'fixed_value',
        }
      );
    }
    return result;
  }

  // Generate couple household revenues for specified or default months
  public generateDefaultRevenues(months: string[] = ['2026-09', '2026-10', '2026-11']): Revenue[] {
    const activeDev = 'iPhone Carlos';
    const nowIso = new Date().toISOString();
    const result: Revenue[] = [];

    for (const month of months) {
      result.push(
        {
          id: `rev-carlos-${month}`,
          name: 'Salário Líquido (Carlos)',
          amount: 6850.00,
          date: `${month}-05`,
          category: 'Salário & Renda',
          recurrence: 'Mensal',
          profileName: 'Carlos',
          notes: 'Salário creditado em conta Itaú.',
          version: 2,
          updatedAt: nowIso,
          updatedByDevice: activeDev,
          isSynced: true,
        },
        {
          id: `rev-paula-${month}`,
          name: 'Salário Líquido (Paula)',
          amount: 7240.00,
          date: `${month}-05`,
          category: 'Salário & Renda',
          recurrence: 'Mensal',
          profileName: 'Paula',
          notes: 'Salário creditado em conta Nubank.',
          version: 2,
          updatedAt: nowIso,
          updatedByDevice: activeDev,
          isSynced: true,
        },
        {
          id: `rev-rendimentos-${month}`,
          name: 'Rendimento CDB / Tesouro Selic',
          amount: 345.80,
          date: `${month}-15`,
          category: 'Investimentos & Rendimentos',
          recurrence: 'Mensal',
          profileName: 'Carlos',
          notes: 'Rendimento da reserva de emergência do casal.',
          version: 2,
          updatedAt: nowIso,
          updatedByDevice: activeDev,
          isSynced: true,
        }
      );
    }
    return result;
  }

  // Load Bills
  public getBills(): Bill[] {
    if (typeof window === 'undefined') return this.generateDefaultBills();
    let raw = localStorage.getItem(STORAGE_KEY_BILLS);

    // Fallback checks on older storage keys and permanent Safety Vault so user's real bills are NEVER lost!
    if (!raw || raw === '[]') {
      const fallbackKeys = [
        STORAGE_KEY_SAFETY_VAULT_BILLS,
        'financas_cloudkit_bills_v2',
        'financas_cloudkit_bills_v1',
        'financas_cloudkit_bills',
        'household_bills',
        'financas_bills_backup',
      ];
      for (const k of fallbackKeys) {
        const legacy = localStorage.getItem(k);
        if (legacy && legacy !== 'null' && legacy !== 'undefined' && legacy !== '[]') {
          raw = legacy;
          localStorage.setItem(STORAGE_KEY_BILLS, legacy);
          break;
        }
      }
    }

    // If user has no bills stored, check safety vault again before initializing defaults
    if (!raw || raw === '[]') {
      const vaultData = localStorage.getItem(STORAGE_KEY_SAFETY_VAULT_BILLS);
      if (vaultData && vaultData !== '[]') {
        raw = vaultData;
        localStorage.setItem(STORAGE_KEY_BILLS, vaultData);
      } else {
        const defaultBills = this.generateDefaultBills();
        raw = JSON.stringify(defaultBills);
        localStorage.setItem(STORAGE_KEY_BILLS, raw);
        localStorage.setItem(STORAGE_KEY_SAFETY_VAULT_BILLS, raw);
        return defaultBills;
      }
    }

    try {
      const parsed: Bill[] = JSON.parse(raw);
      // Strip only exact legacy mock bills
      const cleaned = parsed.filter(b => !isMockBill(b));
      
      // If cleaned became empty, restore default couple bills immediately!
      if (cleaned.length === 0) {
        const defaultBills = this.generateDefaultBills();
        localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(defaultBills));
        localStorage.setItem(STORAGE_KEY_SAFETY_VAULT_BILLS, JSON.stringify(defaultBills));
        return defaultBills;
      }

      if (cleaned.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(cleaned));
      }

      // Secure real bills in the safety vault!
      localStorage.setItem(STORAGE_KEY_SAFETY_VAULT_BILLS, JSON.stringify(cleaned));

      // Migration: sanitize author so bills are never falsely attributed to Paula
      const migrated = cleaned.map(b => {
        let cleanDev = b.updatedByDevice || 'iPhone Carlos';
        if (cleanDev.includes('Paula') || cleanDev.includes('Camila') || cleanDev.includes('Clara') || cleanDev.includes('Principal') || cleanDev.includes('Dispositivo')) {
          cleanDev = 'iPhone Carlos';
        }
        return {
          ...b,
          updatedByDevice: cleanDev,
          paidBy: b.paidBy === 'Camila' ? 'Paula' : b.paidBy,
          splitDetails: (b.splitDetails || []).map(s => (s.name === 'Camila' ? { ...s, name: 'Paula' } : s)),
        };
      });

      return this.deduplicateBills(migrated);
    } catch {
      return this.generateDefaultBills();
    }
  }

  // Merge two bill lists safely, never dropping local user edits
  public mergeBillsLists(localBills: Bill[], incomingBills: Bill[]): Bill[] {
    const map = new Map<string, Bill>();
    localBills.forEach(b => {
      if (b && b.id) map.set(b.id, b);
    });
    incomingBills.forEach(b => {
      if (!b || !b.id) return;
      const current = map.get(b.id);
      if (!current) {
        map.set(b.id, b);
      } else {
        const incVersion = b.version || 0;
        const curVersion = current.version || 0;
        const incUpdated = new Date(b.updatedAt || 0).getTime();
        const curUpdated = new Date(current.updatedAt || 0).getTime();
        if (incVersion > curVersion || incUpdated >= curUpdated) {
          map.set(b.id, b);
        }
      }
    });
    return Array.from(map.values());
  }

  // Deduplicate bills list keeping the richest / paid version
  public deduplicateBills(billsList: Bill[]): Bill[] {
    const map = new Map<string, Bill>();
    for (const b of billsList) {
      if (isMockBill(b)) continue;
      const cleanName = (b.name || '').trim().toLowerCase();
      const key = `${cleanName}_${b.dueDate}_${Number(b.amount || 0).toFixed(2)}`;
      if (map.has(key)) {
        const existing = map.get(key)!;
        if (b.status === 'paid' && existing.status !== 'paid') {
          map.set(key, b);
        } else if (b.receiptUrl && !existing.receiptUrl) {
          map.set(key, b);
        }
      } else {
        map.set(key, b);
      }
    }
    return Array.from(map.values());
  }

  // Save Bills preserving each bill's own updatedAt so modifying one bill doesn't alter timestamps of all other bills
  public saveBills(bills: Bill[], sourceDevice?: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_CUSTOMIZED, 'true');
    localStorage.setItem(STORAGE_KEY_NO_MOCK, 'true');
    const currentDevice = sourceDevice || this.getActiveDevice().name;
    const realBills = bills.filter(b => !isMockBill(b));
    const deduped = this.deduplicateBills(realBills);
    const updated = deduped.map(b => ({
      ...b,
      updatedAt: b.updatedAt,
      updatedByDevice: b.updatedByDevice || currentDevice,
      isSynced: true,
    }));
    localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(updated));
    // Keep in permanent safety vault whenever bills are not empty
    if (updated.length > 0) {
      localStorage.setItem(STORAGE_KEY_SAFETY_VAULT_BILLS, JSON.stringify(updated));
    }
    this.broadcastUpdate('BILLS_UPDATED', { count: updated.length });
    this.syncWithServer();
  }

  // Method to completely remove fictitious sample bills, keeping only user-created bills
  public clearMockBills(): Bill[] {
    if (typeof window === 'undefined') return [];
    localStorage.setItem(STORAGE_KEY_CUSTOMIZED, 'true');
    localStorage.setItem(STORAGE_KEY_NO_MOCK, 'true');
    const all = this.getBills();
    const removedBills = all.filter(b => isMockBill(b));
    removedBills.forEach(b => {
      if (b.id) this.recordDeletedBill(b.id);
    });
    // Also record standard mock IDs in deleted list
    MOCK_BILL_IDS.forEach(id => this.recordDeletedBill(id));
    const realBills = all.filter(b => !isMockBill(b));
    localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(realBills));
    this.broadcastUpdate('BILLS_UPDATED', { count: realBills.length });
    this.syncWithServer();
    return realBills;
  }

  // Ensure recurring bills (Mensal Fixa) and unpaid debts (pendentes/atrasadas) propagate forward to target month automatically
  public ensureRecurringBillsForMonth(targetMonthId: string): Bill[] {
    const allBills = this.getBills();
    const existingInTarget = allBills.filter(b => b.dueDate.startsWith(targetMonthId));
    const existingNames = new Set(existingInTarget.map(b => b.name.trim().toLowerCase()));

    // Get all 'Mensal Fixa' recurring bills
    const recurringFixed = allBills.filter(b => b.recurrence === 'Mensal Fixa');
    const seenFixed = new Map<string, Bill>();
    for (const b of recurringFixed) {
      const key = b.name.trim().toLowerCase();
      if (!seenFixed.has(key)) {
        seenFixed.set(key, b);
      }
    }

    let changed = false;
    const newBills: Bill[] = [];
    const activeDev = this.getActiveDevice().name;

    // 1. Propagate 'Mensal Fixa'
    seenFixed.forEach((baseBill, nameKey) => {
      if (!existingNames.has(nameKey)) {
        const dayPart = (baseBill.dueDate.split('-')[2] || '10').padStart(2, '0');
        const [y, m] = targetMonthId.split('-').map(Number);
        const maxDays = new Date(y, m, 0).getDate();
        const validDay = String(Math.min(parseInt(dayPart, 10), maxDays)).padStart(2, '0');

        const isVariable = baseBill.fixedValueType === 'variable_value';
        const newBill: Bill = {
          ...baseBill,
          id: `bill-${targetMonthId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          amount: isVariable ? 0 : baseBill.amount,
          fixedValueType: baseBill.fixedValueType,
          dueDate: `${targetMonthId}-${validDay}`,
          status: 'pending',
          paidAt: undefined,
          paidBy: undefined,
          receiptUrl: undefined,
          receiptName: undefined,
          receiptSize: undefined,
          version: 1,
          isEdited: false,
          lastEditedAt: undefined,
          updatedAt: undefined as any,
          updatedByDevice: activeDev,
          isSynced: true,
        };
        newBills.push(newBill);
        existingNames.add(nameKey);
        changed = true;
      }
    });

    // 2. Rollover Unpaid Debts from previous months ("a divida não está indo para o próximo mês")
    // If a bill from an earlier month (< targetMonthId) is not paid (pending or overdue),
    // and hasn't been carried over to targetMonthId yet, carry it over!
    const priorUnpaid = allBills.filter(b => {
      const billMonth = b.dueDate.substring(0, 7);
      return billMonth < targetMonthId && b.status !== 'paid';
    });

    for (const unpaid of priorUnpaid) {
      const cleanName = unpaid.name.trim().toLowerCase();
      // Check if target month already has this bill or an installment
      const alreadyInTarget = existingInTarget.some(
        b => b.id === unpaid.id || 
             (b.parentInstallmentId && b.parentInstallmentId === unpaid.parentInstallmentId) ||
             (b.name.trim().toLowerCase() === cleanName && !b.isCarriedOver) ||
             (b.isCarriedOver && (b.originalDueDate === unpaid.dueDate || b.name.includes(unpaid.name)))
      );

      if (!alreadyInTarget) {
        const [y, m] = targetMonthId.split('-').map(Number);
        const dayPart = (unpaid.dueDate.split('-')[2] || '10').padStart(2, '0');
        const maxDays = new Date(y, m, 0).getDate();
        const validDay = String(Math.min(parseInt(dayPart, 10), maxDays)).padStart(2, '0');

        const carriedBill: Bill = {
          ...unpaid,
          id: `bill-carried-${targetMonthId}-${unpaid.id}`,
          dueDate: `${targetMonthId}-${validDay}`,
          status: 'pending',
          isCarriedOver: true,
          originalDueDate: unpaid.dueDate,
          version: 1,
          isEdited: false,
          lastEditedAt: undefined,
          updatedAt: new Date().toISOString(),
          updatedByDevice: activeDev,
          isSynced: true,
        };
        newBills.push(carriedBill);
        changed = true;
      }
    }

    if (changed) {
      const combined = [...allBills, ...newBills];
      this.saveBills(combined);
      return combined;
    }
    return allBills;
  }

  // Save bill with automatic generation of installments for Parcelada
  public saveBillWithInstallments(
    billData: Partial<Bill>,
    installmentConfig?: {
      totalInstallments: number;
      currentInstallment: number;
      valueIsPerInstallment: boolean;
    }
  ): Bill[] {
    localStorage.setItem(STORAGE_KEY_CUSTOMIZED, 'true');
    localStorage.setItem(STORAGE_KEY_NO_MOCK, 'true');

    const allBills = this.getBills();
    const activeDev = this.getActiveDevice().name;
    const isParcelada = billData.recurrence === 'Parcelada';
    const totalInst = installmentConfig?.totalInstallments && installmentConfig.totalInstallments > 1
      ? installmentConfig.totalInstallments
      : (billData.totalInstallments || 1);
    const startInst = installmentConfig?.currentInstallment && installmentConfig.currentInstallment >= 1
      ? installmentConfig.currentInstallment
      : (billData.installmentNumber || 1);

    // If not parcelada or only 1 installment, standard single save
    if (!isParcelada || totalInst <= 1) {
      const single = this.upsertBill(billData as any);
      // If it is 'Mensal Fixa', ensure it will be available in future months
      return this.getBills();
    }

    // Parcelada with multiple installments
    const baseDueDate = billData.dueDate || new Date().toISOString().slice(0, 10);
    const [yearStr, monthStr, dayStr] = baseDueDate.split('-');
    const baseYear = parseInt(yearStr, 10);
    const baseMonth = parseInt(monthStr, 10); // 1-12
    const baseDay = parseInt(dayStr, 10);

    const rawAmount = typeof billData.amount === 'number' ? billData.amount : 0;
    const installmentAmount = (installmentConfig?.valueIsPerInstallment === false)
      ? Number((rawAmount / totalInst).toFixed(2))
      : rawAmount;

    // Clean base name without existing (X/Y)
    const baseCleanName = (billData.name || 'Dívida Parcelada').replace(/\s*\(\d+\/\d+\)/, '').trim();
    const parentGroupId = billData.parentInstallmentId || `inst-group-${Date.now()}`;

    // Calculate end month
    const endTargetMonthIndex = baseMonth + (totalInst - startInst);
    const endYear = baseYear + Math.floor((endTargetMonthIndex - 1) / 12);
    const endMonthNum = ((endTargetMonthIndex - 1) % 12) + 1;
    const endMonthStr = `${endYear}-${String(endMonthNum).padStart(2, '0')}`;

    // Remove any existing installments of the same parentGroupId if editing
    let workingBills = billData.id
      ? allBills.filter(b => b.id !== billData.id && b.parentInstallmentId !== parentGroupId)
      : allBills;

    const generatedInstallments: Bill[] = [];

    for (let inst = startInst; inst <= totalInst; inst++) {
      const offset = inst - startInst;
      const targetMonthIndex = baseMonth + offset;
      const targetYear = baseYear + Math.floor((targetMonthIndex - 1) / 12);
      const targetMonthNum = ((targetMonthIndex - 1) % 12) + 1;

      const maxDaysInMonth = new Date(targetYear, targetMonthNum, 0).getDate();
      const validDay = Math.min(baseDay, maxDaysInMonth);
      const installmentDueDate = `${targetYear}-${String(targetMonthNum).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`;

      const isFirst = inst === startInst;
      const isExistingEdit = Boolean(isFirst && billData.id);

      const instBill: Bill = {
        ...(billData as any),
        id: isFirst && billData.id ? billData.id : `bill-inst-${parentGroupId}-${inst}`,
        name: `${baseCleanName} (${inst}/${totalInst})`,
        amount: installmentAmount,
        dueDate: installmentDueDate,
        recurrence: 'Parcelada',
        status: isFirst ? (billData.status || 'pending') : 'pending',
        installmentNumber: inst,
        totalInstallments: totalInst,
        parentInstallmentId: parentGroupId,
        endMonth: endMonthStr,
        splitHousehold: false,
        splitDetails: [],
        version: isExistingEdit ? ((billData.version || 1) + 1) : 1,
        isEdited: isExistingEdit,
        lastEditedAt: isExistingEdit ? new Date().toISOString() : undefined,
        updatedAt: new Date().toISOString(),
        updatedByDevice: activeDev,
        isSynced: true,
      };

      generatedInstallments.push(instBill);
    }

    const merged = [...workingBills, ...generatedInstallments];
    this.saveBills(merged);
    return merged;
  }

  // Replicate recurring bills into a target subsequent month
  public replicateBillsToMonth(targetMonthId: string, sourceMonthId?: string): Bill[] {
    const allBills = this.getBills();
    const activeDev = this.getActiveDevice().name;

    // Find source bills (either from specified month or all recurring bills)
    let sourceBills = sourceMonthId
      ? allBills.filter(b => b.dueDate.startsWith(sourceMonthId))
      : allBills.filter(b => b.recurrence === 'Mensal Fixa' || b.recurrence === 'Parcelada');

    if (sourceBills.length === 0) {
      sourceBills = allBills;
    }

    // Filter out bills that already exist in targetMonthId with same name
    const existingInTarget = allBills.filter(b => b.dueDate.startsWith(targetMonthId));
    const existingNames = new Set(existingInTarget.map(b => b.name.toLowerCase()));

    const newBillsForMonth: Bill[] = [];
    sourceBills.forEach((b, idx) => {
      if (!existingNames.has(b.name.toLowerCase())) {
        const day = b.dueDate.split('-')[2] || '10';
        const newBill: Bill = {
          ...b,
          id: `bill-${targetMonthId}-${Date.now()}-${idx}`,
          dueDate: `${targetMonthId}-${day}`,
          status: 'pending',
          paidAt: undefined,
          receiptUrl: undefined,
          receiptName: undefined,
          receiptSize: undefined,
          version: 1,
          isEdited: false,
          lastEditedAt: undefined,
          updatedAt: new Date().toISOString(),
          updatedByDevice: activeDev,
          isSynced: true,
        };
        newBillsForMonth.push(newBill);
      }
    });

    const combined = [...allBills, ...newBillsForMonth];
    this.saveBills(combined);
    return combined;
  }

  // Add or Update Single Bill (Strictly isolates modification timestamp to edited bill)
  public upsertBill(bill: Omit<Bill, 'version' | 'updatedAt' | 'updatedByDevice' | 'isSynced'> & Partial<Bill>): Bill {
    localStorage.setItem(STORAGE_KEY_CUSTOMIZED, 'true');
    const bills = this.getBills();
    const activeDev = this.getActiveDevice().name;
    const existingIndex = bill.id ? bills.findIndex(b => b.id === bill.id) : -1;
    const nowIso = new Date().toISOString();

    let savedBill: Bill;
    if (existingIndex >= 0) {
      const existing = bills[existingIndex];
      const newVersion = (existing.version || 1) + 1;
      savedBill = {
        ...existing,
        ...bill,
        version: newVersion,
        isEdited: true,
        lastEditedAt: nowIso,
        updatedAt: nowIso,
        updatedByDevice: activeDev,
        isSynced: true,
      };
      bills[existingIndex] = savedBill;
    } else {
      savedBill = {
        ...bill,
        id: bill.id || `bill-${Date.now()}`,
        version: 1,
        isEdited: false,
        lastEditedAt: undefined,
        updatedAt: nowIso,
        updatedByDevice: activeDev,
        isSynced: true,
      } as Bill;
      bills.unshift(savedBill);
    }

    localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(bills));
    this.broadcastUpdate('BILL_UPSERTED', savedBill);
    this.syncWithServer();
    return savedBill;
  }

  public saveBill(bill: Partial<Bill>): Bill {
    return this.upsertBill(bill as any);
  }

  // Toggling paid status does NOT mark the bill as edited or change debt parameters
  public toggleBillStatus(billId: string, status: 'pending' | 'paid' | 'overdue'): Bill | null {
    const bills = this.getBills();
    const existingIndex = bills.findIndex(b => b.id === billId);
    if (existingIndex === -1) return null;
    const existing = bills[existingIndex];
    const updated: Bill = {
      ...existing,
      status,
      paidAt: status === 'paid' ? new Date().toISOString() : undefined,
      isSynced: true,
    };
    bills[existingIndex] = updated;
    localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(bills));
    this.broadcastUpdate('BILL_UPSERTED', updated);
    this.syncWithServer();
    return updated;
  }

  public getDeletedBillIds(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('financas_deleted_bill_ids');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public recordDeletedBill(id: string): void {
    if (typeof window === 'undefined' || !id) return;
    const deleted = this.getDeletedBillIds();
    if (!deleted.includes(id)) {
      deleted.push(id);
      localStorage.setItem('financas_deleted_bill_ids', JSON.stringify(deleted));
    }
  }

  // Deleted Revenue IDs (Tombstones for CloudKit Sync)
  public getDeletedRevenueIds(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('financas_deleted_revenue_ids');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public recordDeletedRevenue(id: string): void {
    if (typeof window === 'undefined' || !id) return;
    const deleted = this.getDeletedRevenueIds();
    if (!deleted.includes(id)) {
      deleted.push(id);
      localStorage.setItem('financas_deleted_revenue_ids', JSON.stringify(deleted));
    }
  }

  // Deduplicate revenues list strictly by ID without dropping user revenues
  public deduplicateRevenues(revenuesList: Revenue[]): Revenue[] {
    if (!Array.isArray(revenuesList)) return [];

    const activeDeleted = this.getDeletedRevenueIds();
    const map = new Map<string, Revenue>();

    for (const r of revenuesList) {
      if (!r || !r.id) continue;
      // If actively deleted by user, skip
      if (activeDeleted.includes(r.id)) continue;

      const existing = map.get(r.id);
      if (!existing) {
        map.set(r.id, r);
      } else {
        const rVersion = r.version || 0;
        const curVersion = existing.version || 0;
        const rUpdated = new Date(r.updatedAt || 0).getTime();
        const curUpdated = new Date(existing.updatedAt || 0).getTime();

        if (rVersion > curVersion || rUpdated >= curUpdated) {
          map.set(r.id, r);
        }
      }
    }

    return Array.from(map.values());
  }

  // Delete Bill
  public deleteBill(id: string): void {
    localStorage.setItem(STORAGE_KEY_CUSTOMIZED, 'true');
    this.recordDeletedBill(id);
    const bills = this.getBills().filter(b => b.id !== id);
    localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(bills));
    this.broadcastUpdate('BILL_DELETED', { id });
    this.syncWithServer();
  }

  // Revenues
  public getRevenues(): Revenue[] {
    if (typeof window === 'undefined') return this.generateDefaultRevenues();
    let raw = localStorage.getItem(STORAGE_KEY_REVENUES);

    // Fallback checks on older keys and safety vault
    if (!raw || raw === '[]') {
      const fallbackKeys = [
        STORAGE_KEY_SAFETY_VAULT_REVENUES,
        'financas_cloudkit_revenues_v2',
        'financas_cloudkit_revenues_v1',
        'financas_cloudkit_revenues',
      ];
      for (const k of fallbackKeys) {
        const legacy = localStorage.getItem(k);
        if (legacy && legacy !== 'null' && legacy !== 'undefined' && legacy !== '[]') {
          raw = legacy;
          localStorage.setItem(STORAGE_KEY_REVENUES, legacy);
          break;
        }
      }
    }

    if (!raw || raw === '[]') {
      const vaultData = localStorage.getItem(STORAGE_KEY_SAFETY_VAULT_REVENUES);
      if (vaultData && vaultData !== '[]') {
        raw = vaultData;
        localStorage.setItem(STORAGE_KEY_REVENUES, vaultData);
      } else {
        const defaultRevs = this.generateDefaultRevenues();
        raw = JSON.stringify(defaultRevs);
        localStorage.setItem(STORAGE_KEY_REVENUES, raw);
        localStorage.setItem(STORAGE_KEY_SAFETY_VAULT_REVENUES, raw);
        return defaultRevs;
      }
    }

    try {
      const parsed: Revenue[] = JSON.parse(raw);
      const activeDeleted = this.getDeletedRevenueIds();
      let sanitized = parsed
        .filter(r => r && r.id && !activeDeleted.includes(r.id))
        .map(r => ({
          ...r,
          name: r.name.replace(/Camila/g, 'Paula'),
          profileName: r.profileName === 'Camila' ? 'Paula' : r.profileName,
          updatedByDevice: r.updatedByDevice?.replace(/Camila/g, 'Paula'),
        }));

      // If aggressive tombstones wiped everything, unblock them
      if (sanitized.length === 0 && parsed.length > 0) {
        localStorage.setItem('financas_deleted_revenue_ids', '[]');
        sanitized = parsed;
      }

      // If still empty, restore default revenues immediately!
      if (sanitized.length === 0) {
        const defaultRevs = this.generateDefaultRevenues();
        localStorage.setItem(STORAGE_KEY_REVENUES, JSON.stringify(defaultRevs));
        localStorage.setItem(STORAGE_KEY_SAFETY_VAULT_REVENUES, JSON.stringify(defaultRevs));
        return defaultRevs;
      }

      const deduped = this.deduplicateRevenues(sanitized);
      if (deduped.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY_REVENUES, JSON.stringify(deduped));
      }
      return deduped;
    } catch {
      return this.generateDefaultRevenues();
    }
  }

  public saveRevenues(revenues: Revenue[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_CUSTOMIZED, 'true');
    const deduped = this.deduplicateRevenues(revenues);
    localStorage.setItem(STORAGE_KEY_REVENUES, JSON.stringify(deduped));
    if (deduped.length > 0) {
      localStorage.setItem(STORAGE_KEY_SAFETY_VAULT_REVENUES, JSON.stringify(deduped));
    }
    this.broadcastUpdate('REVENUES_UPDATED', { count: deduped.length });
  }

  // Direct helper to edit and persist Carlos & Paula salaries
  public updateCoupleSalaries(carlosAmount: number, paulaAmount: number, selectedMonthId?: string): Revenue[] {
    const rawRevenues = this.getRevenues();
    const activeDev = this.getActiveDevice().name;
    const monthPrefix = selectedMonthId ? selectedMonthId : '2026-10';
    const dateStr = `${monthPrefix}-05`;

    const carlosId = `rev-carlos-${monthPrefix}`;
    const paulaId = `rev-paula-${monthPrefix}`;

    // Remove target IDs from deleted list
    const cleanDeleted = this.getDeletedRevenueIds().filter(id => id !== carlosId && id !== paulaId);
    localStorage.setItem('financas_deleted_revenue_ids', JSON.stringify(cleanDeleted));

    // Keep all non-matching revenues
    const remainingRevenues = rawRevenues.filter(r => {
      const isTargetCarlos = r.id === carlosId || ((r.profileName === 'Carlos' || r.name.toLowerCase().includes('carlos')) && (r.category === 'Salário & Renda') && (r.date || '').startsWith(monthPrefix));
      const isTargetPaula = r.id === paulaId || ((r.profileName === 'Paula' || r.name.toLowerCase().includes('paula')) && (r.category === 'Salário & Renda') && (r.date || '').startsWith(monthPrefix));
      return !isTargetCarlos && !isTargetPaula;
    });

    const nowIso = new Date().toISOString();
    const carlosSalaryRev: Revenue = {
      id: carlosId,
      name: 'Salário Líquido (Carlos)',
      amount: carlosAmount,
      date: dateStr,
      category: 'Salário & Renda',
      recurrence: 'Mensal',
      profileName: 'Carlos',
      notes: 'Salário de Carlos',
      version: 2,
      updatedAt: nowIso,
      updatedByDevice: activeDev,
      isSynced: true,
    };

    const paulaSalaryRev: Revenue = {
      id: paulaId,
      name: 'Salário Líquido (Paula)',
      amount: paulaAmount,
      date: dateStr,
      category: 'Salário & Renda',
      recurrence: 'Mensal',
      profileName: 'Paula',
      notes: 'Salário de Paula',
      version: 2,
      updatedAt: nowIso,
      updatedByDevice: activeDev,
      isSynced: true,
    };

    const updated = [carlosSalaryRev, paulaSalaryRev, ...remainingRevenues];
    this.saveRevenues(updated);
    this.syncWithServer();
    return updated;
  }

  public upsertRevenue(rev: Partial<Revenue> & { name: string; amount: number; date: string; category: string }): Revenue {
    localStorage.setItem(STORAGE_KEY_CUSTOMIZED, 'true');
    const revenues = this.getRevenues();
    const activeDev = this.getActiveDevice().name;
    const revId = rev.id || `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Ensure this ID is NEVER in deleted list
    const cleanDeleted = this.getDeletedRevenueIds().filter(id => id !== revId);
    localStorage.setItem('financas_deleted_revenue_ids', JSON.stringify(cleanDeleted));

    const existingIndex = revenues.findIndex(r => r.id === revId);
    const nowIso = new Date().toISOString();

    let saved: Revenue;
    if (existingIndex >= 0) {
      const existing = revenues[existingIndex];
      saved = {
        ...existing,
        ...rev,
        id: revId,
        amount: Number(rev.amount) || 0,
        version: (existing.version || 1) + 1,
        updatedAt: nowIso,
        updatedByDevice: activeDev,
        isSynced: true,
      };
      revenues[existingIndex] = saved;
    } else {
      saved = {
        id: revId,
        name: rev.name.trim(),
        amount: Number(rev.amount) || 0,
        date: rev.date,
        category: rev.category,
        recurrence: rev.recurrence || 'Mensal',
        profileName: rev.profileName || 'Carlos',
        notes: rev.notes || '',
        version: 1,
        updatedAt: nowIso,
        updatedByDevice: activeDev,
        isSynced: true,
      };
      revenues.unshift(saved);
    }

    const deduped = this.deduplicateRevenues(revenues);
    localStorage.setItem(STORAGE_KEY_REVENUES, JSON.stringify(deduped));
    localStorage.setItem(STORAGE_KEY_SAFETY_VAULT_REVENUES, JSON.stringify(deduped));
    this.broadcastUpdate('REVENUE_UPSERTED', saved);
    this.broadcastUpdate('REVENUES_UPDATED', { count: deduped.length });
    this.syncWithServer();
    return saved;
  }

  public saveRevenue(rev: Partial<Revenue> & { name: string; amount: number; date: string; category: string }): Revenue {
    return this.upsertRevenue(rev);
  }

  // Ensure default data if empty and clear any corrupt tombstones
  public ensureDefaultDataIfEmpty(): boolean {
    if (typeof window === 'undefined') return false;

    // Purge any corrupted tombstones that might hide newly created items
    localStorage.removeItem('financas_deleted_revenue_ids');

    let changed = false;
    let currentBills = this.getBills();
    if (currentBills.length === 0) {
      currentBills = this.generateDefaultBills();
      this.saveBills(currentBills);
      changed = true;
    }

    let currentRevs = this.getRevenues();
    if (currentRevs.length === 0) {
      currentRevs = this.generateDefaultRevenues();
      this.saveRevenues(currentRevs);
      changed = true;
    }

    if (changed) {
      this.syncWithServer();
      this.broadcastUpdate('SYNC_COMPLETED');
    }
    return changed;
  }

  public deleteRevenue(id: string): void {
    localStorage.setItem(STORAGE_KEY_CUSTOMIZED, 'true');
    this.recordDeletedRevenue(id);
    const revenues = this.getRevenues().filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY_REVENUES, JSON.stringify(revenues));
    this.broadcastUpdate('REVENUE_DELETED', { id });
    this.syncWithServer();
  }

  // Devices (Sincronização de Aparelhos Conectados)
  public getCurrentDeviceInfo(): CloudDevice {
    if (typeof window === 'undefined') return DEFAULT_DEVICES[0];

    let myId = localStorage.getItem('financas_my_device_id');
    if (!myId) {
      myId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem('financas_my_device_id', myId);
    }

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

    let defaultName = 'iPhone Carlos';
    let model = 'iPhone 15 Pro';

    if (isIOS) {
      defaultName = 'iPhone Carlos';
      model = isStandalone ? 'iPhone (Tela de Início)' : 'iPhone (Safari)';
    } else if (isAndroid) {
      defaultName = 'Celular Carlos';
      model = isStandalone ? 'Android (Tela de Início)' : 'Android (Chrome)';
    } else {
      defaultName = 'iPhone Carlos';
      model = 'Computador / Web';
    }

    const savedCustomName = localStorage.getItem('financas_my_device_custom_name');

    return {
      id: myId,
      name: savedCustomName || defaultName,
      model,
      owner: 'Carlos',
      lastActive: 'Agora mesmo',
      isCurrent: true,
      iCloudAccount: 'carlos@icloud.com',
    };
  }

  private isOfflineManual: boolean = false;

  public isOfflineMode(): boolean {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('financas_offline_mode');
      if (stored !== null) return stored === 'true';
    }
    return this.isOfflineManual;
  }

  public setOfflineMode(enabled: boolean): void {
    this.isOfflineManual = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('financas_offline_mode', String(enabled));
    }
    this.broadcastUpdate('OFFLINE_MODE_CHANGED', { isOffline: enabled });
    if (!enabled && typeof navigator !== 'undefined' && navigator.onLine) {
      this.syncWithServer();
    }
  }

  public getDevices(): CloudDevice[] {
    if (typeof window === 'undefined') return DEFAULT_DEVICES;
    const raw = localStorage.getItem(STORAGE_KEY_DEVICES);
    const myDevice = this.getCurrentDeviceInfo();

    if (!raw) {
      const initial = [myDevice];
      localStorage.setItem(STORAGE_KEY_DEVICES, JSON.stringify(initial));
      return initial;
    }
    try {
      let parsed: CloudDevice[] = JSON.parse(raw);
      // Strip only obsolete placeholder mock IDs, keeping all user phones
      parsed = parsed.filter(d => 
        d.id !== 'dev_iphone_paula' && 
        d.id !== 'dev_iphone_carlos' && 
        d.id !== 'dev_user_main'
      );

      // Ensure current device is present and marked as isCurrent
      const hasMyDev = parsed.some(d => d.id === myDevice.id);
      if (!hasMyDev) {
        parsed.unshift(myDevice);
      } else {
        parsed = parsed.map(d => ({
          ...d,
          isCurrent: d.id === myDevice.id,
          name: d.id === myDevice.id ? `${myDevice.name} (Este Aparelho)` : d.name,
        }));
      }

      return parsed;
    } catch {
      return [myDevice];
    }
  }

  public isWifeConnected(): boolean {
    const devices = this.getDevices();
    const myDev = this.getCurrentDeviceInfo();
    return devices.some(d => d.id !== myDev.id && !d.isCurrent);
  }

  public getWifeDevice(): CloudDevice | null {
    const devices = this.getDevices();
    const myDev = this.getCurrentDeviceInfo();
    return devices.find(d => d.id !== myDev.id && !d.isCurrent) || null;
  }

  public saveDevices(devices: CloudDevice[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_DEVICES, JSON.stringify(devices));
    this.broadcastUpdate('DEVICES_UPDATED');
  }

  public async removeDevice(deviceId: string): Promise<void> {
    const houseId = this.getHouseholdId();
    try {
      await fetch(`/api/household/${encodeURIComponent(houseId)}/devices/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      });
    } catch (err) {
      console.warn('Error removing device on server:', err);
    }
    const current = this.getDevices().filter(d => d.id !== deviceId);
    this.saveDevices(current);
  }

  public getActiveDevice(): CloudDevice {
    const devices = this.getDevices();
    const current = devices.find(d => d.isCurrent);
    return current || devices[0] || DEFAULT_DEVICES[0];
  }

  public switchActiveDevice(deviceId: string): void {
    const devices = this.getDevices().map(d => ({
      ...d,
      isCurrent: d.id === deviceId,
      lastActive: d.id === deviceId ? 'Agora mesmo' : d.lastActive,
    }));
    localStorage.setItem(STORAGE_KEY_DEVICES, JSON.stringify(devices));
    this.broadcastUpdate('DEVICE_SWITCHED', { deviceId });
  }

  public updateDevice(deviceId: string, updates: Partial<CloudDevice>): void {
    if (updates.name) {
      const myDev = this.getCurrentDeviceInfo();
      if (deviceId === myDev.id) {
        localStorage.setItem('financas_my_device_custom_name', updates.name);
      }
    }
    const devices = this.getDevices().map(d => 
      d.id === deviceId ? { ...d, ...updates } : d
    );
    this.saveDevices(devices);
  }

  // Sync Logs History
  public getSyncLogs(): SyncLogEntry[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY_SYNC_LOGS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public addSyncLog(entry: Omit<SyncLogEntry, 'id' | 'timestamp' | 'formattedTime'>): SyncLogEntry {
    const logs = this.getSyncLogs();
    const now = new Date();
    const formattedTime = now.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const newEntry: SyncLogEntry = {
      ...entry,
      id: `sync-log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now.toISOString(),
      formattedTime,
    };
    logs.unshift(newEntry);
    localStorage.setItem(STORAGE_KEY_SYNC_LOGS, JSON.stringify(logs.slice(0, 30)));
    this.broadcastUpdate('SYNC_LOG_ADDED');
    return newEntry;
  }

  public getLastSyncLog(): SyncLogEntry | null {
    const logs = this.getSyncLogs();
    return logs.length > 0 ? logs[0] : null;
  }

  public clearSyncLogs(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY_SYNC_LOGS);
    this.broadcastUpdate('SYNC_LOG_ADDED');
  }

  // Real server synchronization
  public async syncWithServer(): Promise<{ success: boolean; message: string }> {
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    if (typeof window === 'undefined' || this.isOfflineMode() || !navigator.onLine) {
      // Graceful offline operation: no error thrown, local storage is fully operational
      return { success: true, message: 'Operando localmente em modo offline (dados salvos com segurança).' };
    }
    if (this.isSyncingToServer) {
      return { success: true, message: 'Sincronização em andamento.' };
    }
    this.isSyncingToServer = true;

    try {
      const houseId = this.getHouseholdId();
      const currentDev = this.getCurrentDeviceInfo();
      const localBills = this.getBills();
      const localRevenues = this.getRevenues();
      const localProfiles = this.getProfiles();
      const deletedBillIds = this.getDeletedBillIds();
      const deletedRevenueIds = this.getDeletedRevenueIds();

      const resp = await fetch(`/api/household/${encodeURIComponent(houseId)}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bills: localBills,
          revenues: localRevenues,
          profiles: localProfiles,
          device: currentDev,
          deletedBillIds,
          deletedRevenueIds,
          clientTimestamp: new Date().toISOString(),
        }),
      });

      const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const latencyMs = Math.round(endTime - startTime);

      if (!resp.ok) {
        throw new Error(`Servidor respondeu com status HTTP ${resp.status}`);
      }

      const data = await resp.json();
      if (data && data.household) {
        const serverHouse = data.household;

        if (Array.isArray(serverHouse.deletedBillIds) && serverHouse.deletedBillIds.length > 0) {
          serverHouse.deletedBillIds.forEach((id: string) => this.recordDeletedBill(id));
        }
        if (Array.isArray(serverHouse.deletedRevenueIds) && serverHouse.deletedRevenueIds.length > 0) {
          serverHouse.deletedRevenueIds.forEach((id: string) => this.recordDeletedRevenue(id));
        }
        const activeDeletedBills = this.getDeletedBillIds();
        const activeDeletedRevenues = this.getDeletedRevenueIds();

        if (Array.isArray(serverHouse.bills) && serverHouse.bills.length > 0) {
          const filteredBills = serverHouse.bills.filter((b: any) => b && b.id && !activeDeletedBills.includes(b.id));
          const currentLocal = this.getBills();
          // Safe two-way merge: never drop local bills when merging server updates
          const merged = this.mergeBillsLists(currentLocal, filteredBills);
          localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(merged));
          if (merged.length > 0) {
            localStorage.setItem(STORAGE_KEY_SAFETY_VAULT_BILLS, JSON.stringify(merged));
          }
        } else if (localBills.length > 0) {
          // If server had 0 bills but client has local bills, keep local bills and update vault
          localStorage.setItem(STORAGE_KEY_SAFETY_VAULT_BILLS, JSON.stringify(localBills));
        }

        if (Array.isArray(serverHouse.revenues) && serverHouse.revenues.length > 0) {
          const filteredRevenues = serverHouse.revenues.filter(
            (r: any) => r && r.id && !activeDeletedRevenues.includes(r.id)
          );
          const currentRevs = this.getRevenues();
          const mergedRevs = this.deduplicateRevenues([...currentRevs, ...filteredRevenues]);
          localStorage.setItem(STORAGE_KEY_REVENUES, JSON.stringify(mergedRevs));
          if (mergedRevs.length > 0) {
            localStorage.setItem(STORAGE_KEY_SAFETY_VAULT_REVENUES, JSON.stringify(mergedRevs));
          }
        } else if (localRevenues.length > 0) {
          localStorage.setItem(STORAGE_KEY_SAFETY_VAULT_REVENUES, JSON.stringify(localRevenues));
        }
        if (Array.isArray(serverHouse.profiles) && serverHouse.profiles.length > 0) {
          localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(serverHouse.profiles));
        }

        let updatedDevices: CloudDevice[] = [];
        if (Array.isArray(serverHouse.devices)) {
          const myDev = this.getCurrentDeviceInfo();
          const mapped: CloudDevice[] = serverHouse.devices
            .filter((d: any) => 
              d.id !== 'dev_iphone_paula' && 
              d.id !== 'dev_iphone_carlos' && 
              d.id !== 'dev_user_main'
            )
            .map((d: any) => ({
              id: d.id,
              name: d.id === myDev.id ? `${myDev.name} (Este Aparelho)` : (d.name || 'Celular Conectado'),
              model: d.model || 'Smartphone',
              owner: d.id === myDev.id ? 'Você' : (d.owner || 'Morador'),
              lastActive: d.lastActive || 'Conectado',
              isCurrent: d.id === myDev.id,
              iCloudAccount: 'clarasouza23021992@gmail.com',
            }));

          if (!mapped.some(d => d.id === myDev.id)) {
            mapped.unshift(myDev);
          }
          localStorage.setItem(STORAGE_KEY_DEVICES, JSON.stringify(mapped));
          updatedDevices = mapped;
        } else {
          updatedDevices = this.getDevices();
        }

        const myDev = this.getCurrentDeviceInfo();
        const wifeDev = updatedDevices.find(d => d.id !== myDev.id && !d.isCurrent);
        const isWife = !!wifeDev;

        const successMessage = isWife
          ? `Sincronizado com sucesso! Celular da esposa pareado e ativo (${wifeDev.name} - ${wifeDev.model}).`
          : `Sincronizado na nuvem com sucesso! Servidor ativo (Aparelho da esposa ainda não pareado).`;

        this.addSyncLog({
          status: 'success',
          message: successMessage,
          devicesDetectedCount: updatedDevices.length,
          isWifeConnected: isWife,
          wifeDeviceName: wifeDev?.name,
          wifeDeviceModel: wifeDev?.model,
          billsSyncedCount: (serverHouse.bills || []).length,
          revenuesSyncedCount: (serverHouse.revenues || []).length,
          latencyMs,
        });

        this.broadcastUpdate('SYNC_COMPLETED', serverHouse);
        this.broadcastUpdate('DEVICES_UPDATED');
        this.broadcastUpdate('BILLS_UPDATED');
        return { success: true, message: successMessage };
      }

      this.addSyncLog({
        status: 'success',
        message: 'Sincronização completada com o servidor.',
        devicesDetectedCount: 1,
        isWifeConnected: false,
        billsSyncedCount: (this.getBills() || []).length,
        revenuesSyncedCount: (this.getRevenues() || []).length,
        latencyMs,
      });

      return { success: true, message: 'Sincronização concluída.' };
    } catch (err: any) {
      const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const latencyMs = Math.round(endTime - startTime);
      const devices = this.getDevices();
      const myDev = this.getCurrentDeviceInfo();
      const wifeDev = devices.find(d => d.id !== myDev.id && !d.isCurrent);
      const isWife = !!wifeDev;

      const errorMessage = err?.message ? `Falha na sincronização: ${err.message}` : 'Erro de conexão com o servidor.';
      console.warn('Sync server notice:', err?.message || err);

      this.addSyncLog({
        status: 'error',
        message: errorMessage,
        devicesDetectedCount: devices.length,
        isWifeConnected: isWife,
        wifeDeviceName: wifeDev?.name,
        wifeDeviceModel: wifeDev?.model,
        billsSyncedCount: (this.getBills() || []).length,
        revenuesSyncedCount: (this.getRevenues() || []).length,
        latencyMs,
      });

      return { success: false, message: 'Operando localmente offline.' };
    } finally {
      this.isSyncingToServer = false;
    }
  }

  // Profiles
  public getProfiles(): UserProfile[] {
    if (typeof window === 'undefined') return DEFAULT_PROFILES;
    const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(DEFAULT_PROFILES));
      return DEFAULT_PROFILES;
    }
    try {
      const parsed: UserProfile[] = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PROFILES;
    } catch {
      return DEFAULT_PROFILES;
    }
  }

  public saveProfiles(profiles: UserProfile[]): void {
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
    this.broadcastUpdate('PROFILES_UPDATED');
    this.syncWithServer();
  }

  // Conflict Logs
  public getConflictLogs(): SyncConflictLog[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY_CONFLICTS);
    if (!raw) {
      const defaultLogs: SyncConflictLog[] = [
        {
          id: 'conf-1',
          recordTitle: 'Taxa de Condomínio',
          entityType: 'bill',
          deviceOrigin: 'Sincronização em Nuvem',
          conflictDetails: 'Atualizações simultâneas de status e anotações verificadas e mescladas.',
          resolution: 'Mesclagem automática CloudKit (Merge 3-Way com preservação de comprovantes e status mais recente).',
          timestamp: 'Hoje',
          versionA: 1,
          versionB: 2,
        },
      ];
      localStorage.setItem(STORAGE_KEY_CONFLICTS, JSON.stringify(defaultLogs));
      return defaultLogs;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public addConflictLog(log: Omit<SyncConflictLog, 'id'>): void {
    const logs = this.getConflictLogs();
    logs.unshift({ ...log, id: `conf-${Date.now()}` });
    localStorage.setItem(STORAGE_KEY_CONFLICTS, JSON.stringify(logs.slice(0, 20)));
    this.broadcastUpdate('CONFLICT_LOGGED');
  }

  // Force CloudKit sync
  public async forceSyncWithCloud(): Promise<{ success: boolean; message: string }> {
    return await this.syncWithServer();
  }

  public async syncWithCloudKit(): Promise<{ success: boolean; message: string }> {
    return await this.syncWithServer();
  }


  // Deep scan all localStorage keys and cloud server to rescue any lost financial data
  public async scanAndRecoverLostData(): Promise<{
    success: boolean;
    billsRecovered: number;
    revenuesRecovered: number;
    sources: string[];
    foundOtherMonths: string[];
  }> {
    if (typeof window === 'undefined') {
      return { success: false, billsRecovered: 0, revenuesRecovered: 0, sources: [], foundOtherMonths: [] };
    }

    const recoveredBillsMap = new Map<string, Bill>();
    const recoveredRevenuesMap = new Map<string, Revenue>();
    const sourcesFound: string[] = [];

    // Helper to test and collect bills
    const tryExtractBills = (dataStr: string, sourceName: string) => {
      try {
        const parsed = JSON.parse(dataStr);
        let list: any[] = [];
        if (Array.isArray(parsed)) {
          list = parsed;
        } else if (parsed && Array.isArray(parsed.bills)) {
          list = parsed.bills;
        } else if (parsed && parsed.household && Array.isArray(parsed.household.bills)) {
          list = parsed.household.bills;
        }
        for (const item of list) {
          if (item && item.name && (item.amount !== undefined || item.dueDate)) {
            if (isMockBill(item)) continue;
            const bill: Bill = {
              id: item.id || `bill-rec-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              name: String(item.name || '').trim(),
              amount: Number(item.amount) || 0,
              dueDate: item.dueDate || '2026-10-10',
              category: item.category || 'Habitação & Moradia',
              status: item.status || 'pending',
              paidAt: item.paidAt,
              paidBy: item.paidBy === 'Camila' ? 'Paula' : item.paidBy,
              recurrence: item.recurrence || 'Mensal Fixa',
              favored: item.favored || '',
              barcode: item.barcode || '',
              pixKey: item.pixKey || '',
              pixType: item.pixType || 'Pix Copia e Cola',
              notes: item.notes || '',
              splitHousehold: item.splitHousehold ?? true,
              splitDetails: item.splitDetails || [
                { name: 'Carlos', percentage: 50, amount: (Number(item.amount) || 0) / 2 },
                { name: 'Paula', percentage: 50, amount: (Number(item.amount) || 0) / 2 },
              ],
              version: item.version || 1,
              updatedAt: item.updatedAt || new Date().toISOString(),
              updatedByDevice: item.updatedByDevice || 'iPhone Carlos',
              isSynced: true,
              receiptUrl: item.receiptUrl,
              receiptName: item.receiptName,
              fixedValueType: item.fixedValueType === 'variable_value' ? 'variable_value' : 'fixed_value',
            };
            const key = bill.id || `${bill.name.toLowerCase()}_${bill.dueDate}_${bill.amount.toFixed(2)}`;
            if (!recoveredBillsMap.has(key)) {
              recoveredBillsMap.set(key, bill);
              if (!sourcesFound.includes(sourceName)) sourcesFound.push(sourceName);
            }
          }
        }
      } catch {}
    };

    // Helper to test and collect revenues
    const tryExtractRevenues = (dataStr: string, sourceName: string) => {
      try {
        const parsed = JSON.parse(dataStr);
        let list: any[] = [];
        if (Array.isArray(parsed)) {
          list = parsed;
        } else if (parsed && Array.isArray(parsed.revenues)) {
          list = parsed.revenues;
        } else if (parsed && parsed.household && Array.isArray(parsed.household.revenues)) {
          list = parsed.household.revenues;
        }
        for (const item of list) {
          if (item && item.name && (item.amount !== undefined || item.category)) {
            const rev: Revenue = {
              id: item.id || `rev-rec-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              name: String(item.name || '').trim().replace(/Camila/g, 'Paula'),
              amount: Number(item.amount) || 0,
              date: item.date || '2026-10-05',
              category: item.category || 'Salário & Renda',
              recurrence: item.recurrence || 'Mensal',
              profileName: (item.profileName === 'Camila' ? 'Paula' : item.profileName) || 'Carlos',
              notes: item.notes || '',
              version: item.version || 1,
              updatedAt: item.updatedAt || new Date().toISOString(),
              updatedByDevice: item.updatedByDevice || 'iPhone Carlos',
              isSynced: true,
            };
            const key = rev.id || `${rev.name.toLowerCase()}_${rev.date}_${rev.amount.toFixed(2)}`;
            if (!recoveredRevenuesMap.has(key)) {
              recoveredRevenuesMap.set(key, rev);
              if (!sourcesFound.includes(sourceName)) sourcesFound.push(sourceName);
            }
          }
        }
      } catch {}
    };

    // 1. Scan all localStorage keys
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key);
          if (val && val.length > 5 && (val.startsWith('[') || val.startsWith('{'))) {
            tryExtractBills(val, `Armazenamento Local (${key})`);
            tryExtractRevenues(val, `Armazenamento Local (${key})`);
          }
        }
      }
    } catch {}

    // 2. Scan server household endpoint
    try {
      const houseId = this.getHouseholdId();
      const resp = await fetch(`/api/household/${encodeURIComponent(houseId)}`);
      if (resp.ok) {
        const serverData = await resp.json();
        if (serverData && serverData.household) {
          if (Array.isArray(serverData.household.bills) && serverData.household.bills.length > 0) {
            tryExtractBills(JSON.stringify(serverData.household.bills), 'Nuvem / Servidor Principal');
          }
          if (Array.isArray(serverData.household.revenues) && serverData.household.revenues.length > 0) {
            tryExtractRevenues(JSON.stringify(serverData.household.revenues), 'Nuvem / Servidor Principal');
          }
        }
      }
    } catch {}

    const allRecoveredBills = Array.from(recoveredBillsMap.values());
    const allRecoveredRevenues = Array.from(recoveredRevenuesMap.values());

    if (allRecoveredBills.length > 0) {
      // Clear tombstones for recovered IDs
      const recoveredIds = new Set(allRecoveredBills.map(b => b.id));
      const cleanDeleted = this.getDeletedBillIds().filter(id => !recoveredIds.has(id));
      localStorage.setItem('financas_deleted_bill_ids', JSON.stringify(cleanDeleted));

      const existingBills = this.getBills();
      const merged = this.deduplicateBills(this.mergeBillsLists(existingBills, allRecoveredBills));
      localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(merged));
      localStorage.setItem(STORAGE_KEY_SAFETY_VAULT_BILLS, JSON.stringify(merged));
      this.broadcastUpdate('BILLS_UPDATED', { count: merged.length });
    }

    if (allRecoveredRevenues.length > 0) {
      const recoveredRevIds = new Set(allRecoveredRevenues.map(r => r.id));
      const cleanRevDeleted = this.getDeletedRevenueIds().filter(id => !recoveredRevIds.has(id));
      localStorage.setItem('financas_deleted_revenue_ids', JSON.stringify(cleanRevDeleted));

      const existingRevs = this.getRevenues();
      const mergedRevs = this.deduplicateRevenues([...existingRevs, ...allRecoveredRevenues]);
      localStorage.setItem(STORAGE_KEY_REVENUES, JSON.stringify(mergedRevs));
      localStorage.setItem(STORAGE_KEY_SAFETY_VAULT_REVENUES, JSON.stringify(mergedRevs));
      this.broadcastUpdate('REVENUES_UPDATED', { count: mergedRevs.length });
    }

    // Push recovered data to server
    try {
      await this.syncWithServer();
    } catch {}

    const currentBills = this.getBills();
    const monthsWithBills = Array.from(new Set(currentBills.map(b => b.dueDate.slice(0, 7))));

    return {
      success: allRecoveredBills.length > 0 || allRecoveredRevenues.length > 0,
      billsRecovered: allRecoveredBills.length,
      revenuesRecovered: allRecoveredRevenues.length,
      sources: sourcesFound,
      foundOtherMonths: monthsWithBills,
    };
  }

  // Restore complete household preset (Carlos & Paula) with realistic household bills
  public restoreCouplePresetData(targetMonthId: string = '2026-10'): { bills: Bill[]; revenues: Revenue[] } {
    const month = targetMonthId || '2026-10';
    const activeDev = this.getActiveDevice().name || 'iPhone Carlos';
    const nowIso = new Date().toISOString();

    const presetBills: Bill[] = [
      {
        id: `bill-preset-condominio-${month}`,
        name: 'Taxa de Condomínio',
        amount: 580.00,
        dueDate: `${month}-10`,
        category: 'Habitação & Moradia',
        status: 'pending',
        recurrence: 'Mensal Fixa',
        favored: 'Administradora do Condomínio',
        notes: 'Boleto mensal do condomínio.',
        barcode: '',
        pixKey: '',
        pixType: 'Pix Copia e Cola',
        splitHousehold: true,
        splitDetails: [
          { name: 'Carlos', percentage: 50, amount: 290.00 },
          { name: 'Paula', percentage: 50, amount: 290.00 },
        ],
        version: 1,
        updatedAt: nowIso,
        updatedByDevice: activeDev,
        isSynced: true,
        fixedValueType: 'fixed_value',
      },
      {
        id: `bill-preset-luz-${month}`,
        name: 'Energia Elétrica (Enel)',
        amount: 245.60,
        dueDate: `${month}-15`,
        category: 'Habitação & Moradia',
        status: 'pending',
        recurrence: 'Mensal Fixa',
        favored: 'Enel Distribuição',
        notes: 'Consumo de energia da residência.',
        barcode: '',
        pixKey: '',
        pixType: 'Pix Copia e Cola',
        splitHousehold: true,
        splitDetails: [
          { name: 'Carlos', percentage: 50, amount: 122.80 },
          { name: 'Paula', percentage: 50, amount: 122.80 },
        ],
        version: 1,
        updatedAt: nowIso,
        updatedByDevice: activeDev,
        isSynced: true,
        fixedValueType: 'variable_value',
      },
      {
        id: `bill-preset-gas-${month}`,
        name: 'Gás Encanado (Comgás)',
        amount: 85.40,
        dueDate: `${month}-18`,
        category: 'Habitação & Moradia',
        status: 'pending',
        recurrence: 'Mensal Fixa',
        favored: 'Comgás',
        notes: 'Consumo de gás encanado.',
        barcode: '',
        pixKey: '',
        pixType: 'Pix Copia e Cola',
        splitHousehold: true,
        splitDetails: [
          { name: 'Carlos', percentage: 50, amount: 42.70 },
          { name: 'Paula', percentage: 50, amount: 42.70 },
        ],
        version: 1,
        updatedAt: nowIso,
        updatedByDevice: activeDev,
        isSynced: true,
        fixedValueType: 'variable_value',
      },
      {
        id: `bill-preset-internet-${month}`,
        name: 'Internet Fibra Óptica',
        amount: 139.90,
        dueDate: `${month}-20`,
        category: 'Internet & Telefone',
        status: 'pending',
        recurrence: 'Mensal Fixa',
        favored: 'Claro Fibra / Vivo',
        notes: 'Banda larga residencial 600 Mega.',
        barcode: '',
        pixKey: '',
        pixType: 'Pix Copia e Cola',
        splitHousehold: true,
        splitDetails: [
          { name: 'Carlos', percentage: 50, amount: 69.95 },
          { name: 'Paula', percentage: 50, amount: 69.95 },
        ],
        version: 1,
        updatedAt: nowIso,
        updatedByDevice: activeDev,
        isSynced: true,
        fixedValueType: 'fixed_value',
      },
      {
        id: `bill-preset-moradia-${month}`,
        name: 'Financiamento Imobiliário / Aluguel',
        amount: 2450.00,
        dueDate: `${month}-10`,
        category: 'Habitação & Moradia',
        status: 'pending',
        recurrence: 'Mensal Fixa',
        favored: 'Caixa Econômica / Locador',
        notes: 'Parcela mensal da moradia da família.',
        barcode: '',
        pixKey: '',
        pixType: 'Pix Copia e Cola',
        splitHousehold: true,
        splitDetails: [
          { name: 'Carlos', percentage: 50, amount: 1225.00 },
          { name: 'Paula', percentage: 50, amount: 1225.00 },
        ],
        version: 1,
        updatedAt: nowIso,
        updatedByDevice: activeDev,
        isSynced: true,
        fixedValueType: 'fixed_value',
      },
      {
        id: `bill-preset-mercado-${month}`,
        name: 'Supermercado & Feira do Mês',
        amount: 1650.00,
        dueDate: `${month}-08`,
        category: 'Alimentação & Mercado',
        status: 'pending',
        recurrence: 'Mensal Fixa',
        favored: 'Supermercado Principal',
        notes: 'Compras essenciais de mercado e mantimentos.',
        barcode: '',
        pixKey: '',
        pixType: 'Pix Copia e Cola',
        splitHousehold: true,
        splitDetails: [
          { name: 'Carlos', percentage: 50, amount: 825.00 },
          { name: 'Paula', percentage: 50, amount: 825.00 },
        ],
        version: 1,
        updatedAt: nowIso,
        updatedByDevice: activeDev,
        isSynced: true,
        fixedValueType: 'variable_value',
      },
      {
        id: `bill-preset-saude-${month}`,
        name: 'Plano de Saúde Familiar',
        amount: 980.00,
        dueDate: `${month}-25`,
        category: 'Saúde & Cuidados',
        status: 'pending',
        recurrence: 'Mensal Fixa',
        favored: 'Operadora de Saúde',
        notes: 'Mensalidade do plano de saúde do casal.',
        barcode: '',
        pixKey: '',
        pixType: 'Pix Copia e Cola',
        splitHousehold: true,
        splitDetails: [
          { name: 'Carlos', percentage: 50, amount: 490.00 },
          { name: 'Paula', percentage: 50, amount: 490.00 },
        ],
        version: 1,
        updatedAt: nowIso,
        updatedByDevice: activeDev,
        isSynced: true,
        fixedValueType: 'fixed_value',
      },
      {
        id: `bill-preset-streaming-${month}`,
        name: 'Streaming & Assinaturas',
        amount: 69.90,
        dueDate: `${month}-12`,
        category: 'Lazer & Entretenimento',
        status: 'paid',
        paidAt: `${month}-05T12:00:00.000Z`,
        paidBy: 'Carlos',
        recurrence: 'Mensal Fixa',
        favored: 'Netflix / Spotify Família',
        notes: 'Serviços de entretenimento digital da casa.',
        barcode: '',
        pixKey: '',
        pixType: 'Pix Copia e Cola',
        splitHousehold: true,
        splitDetails: [
          { name: 'Carlos', percentage: 50, amount: 34.95 },
          { name: 'Paula', percentage: 50, amount: 34.95 },
        ],
        version: 1,
        updatedAt: nowIso,
        updatedByDevice: activeDev,
        isSynced: true,
        fixedValueType: 'fixed_value',
      },
    ];

    // Remove tombstones for preset IDs
    const presetIds = presetBills.map(b => b.id);
    const cleanDeleted = this.getDeletedBillIds().filter(id => !presetIds.includes(id));
    localStorage.setItem('financas_deleted_bill_ids', JSON.stringify(cleanDeleted));

    // Save bills to main storage and safety vault
    this.saveBills(presetBills);

    // Save revenues (Carlos R$ 6850, Paula R$ 7240, Rendimentos R$ 345,80)
    const revenues = this.updateCoupleSalaries(6850, 7240, month);

    return { bills: presetBills, revenues };
  }

  // Reset to default sample
  public resetToSample(): void {
    localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(INITIAL_BILLS));
    localStorage.setItem(STORAGE_KEY_REVENUES, JSON.stringify(INITIAL_REVENUES));
    localStorage.setItem(STORAGE_KEY_DEVICES, JSON.stringify(DEFAULT_DEVICES));
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(DEFAULT_PROFILES));
    this.broadcastUpdate('RESET');
  }
}

export const cloudkit = new CloudKitSyncEngine();
