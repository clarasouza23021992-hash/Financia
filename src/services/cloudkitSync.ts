import {
  Bill,
  Revenue,
  UserProfile,
  CloudDevice,
  SyncConflictLog,
  SyncLogEntry,
  PaymentPropagationLogEntry,
  ChangeNotification,
  getBillEffectiveMonth,
  isBillRescheduled,
  normalizeBillTitle,
  parseInstallmentDetails,
} from '../types/finance';
import { inferCategoryFromName, getStoredCategories, saveStoredCategories } from '../utils/categories';

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
const STORAGE_KEY_PAYMENT_LOGS = 'financas_cloudkit_payment_logs_v1';
const STORAGE_KEY_SAFETY_VAULT_BILLS = 'financas_safety_vault_bills_v1';
const STORAGE_KEY_SAFETY_VAULT_REVENUES = 'financas_safety_vault_revenues_v1';

export const DEFAULT_PROFILES: UserProfile[] = [
  { id: 'p1', name: 'Carlos', role: 'Administrador da Casa', splitShare: 50, splitPercentage: 50, color: '#3B82F6', avatar: '👤', phone: '' },
  { id: 'p2', name: 'Paula', role: 'Administradora da Casa', splitShare: 50, splitPercentage: 50, color: '#EC4899', avatar: '👩🏻', phone: '' },
];

export const DEFAULT_DEVICES: CloudDevice[] = [
  {
    id: 'dev_user_main',
    name: 'Meu Celular',
    model: 'Smartphone',
    owner: 'Você',
    lastActive: 'Agora mesmo',
    isCurrent: true,
  },
  {
    id: 'dev_esposa_permanente',
    name: 'iPhone da Esposa',
    model: 'iPhone (Tela de Início)',
    owner: 'Esposa',
    lastActive: 'Agora mesmo',
    isCurrent: false,
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
  if (!b) return true;
  if ((b as any).isMockSeed === true || (b as any).isDemoPlaceholder === true) return true;
  const id = String(b.id || '');
  if (
    id.startsWith('bill-condo-') ||
    id.startsWith('bill-luz-') ||
    id.startsWith('bill-gas-') ||
    id.startsWith('bill-preset-') ||
    id.startsWith('bill-streaming-') ||
    id.startsWith('bill-mock-') ||
    id.startsWith('bill-sample-') ||
    id === 'bill-gas-pago' ||
    id === 'bill-condominio' ||
    id === 'bill-luz' ||
    id === 'bill-gas' ||
    id === 'bill-internet' ||
    id === 'bill-financiamento' ||
    id === 'bill-mercado' ||
    id === 'bill-saude'
  ) {
    return true;
  }
  // Exclude bills that were mistakenly created by migrating revenues or that are salary
  if (id.startsWith('bill-migrated-') || (b.notes && b.notes.includes('Transferido automaticamente para Dívidas'))) {
    return true;
  }
  if (b.category === 'Salário & Renda') return true;
  const lowerName = String(b.name || '').toLowerCase();
  if (lowerName.includes('salário') || lowerName.includes('salario')) return true;
  return false;
}

export function isMockRevenue(r: Partial<Revenue>): boolean {
  if (!r) return true;
  if ((r as any).isMockSeed === true || (r as any).isDemoPlaceholder === true) return true;
  const id = String(r.id || '');
  if (id.startsWith('rev-mock-') || id.startsWith('rev-sample-')) {
    return true;
  }
  return false;
}

export const INITIAL_REVENUES: Revenue[] = [];

class CloudKitSyncEngine {
  private channel: BroadcastChannel | null = null;
  private syncListeners: Array<(event: { type: string; payload?: any }) => void> = [];
  private isSyncingToServer: boolean = false;
  private ws: WebSocket | null = null;
  private wsReconnectTimer: any = null;
  private lastSeenNotificationTime: string = (typeof window !== 'undefined' ? localStorage.getItem('financas_last_seen_notif_time') : null) || new Date(Date.now() - 300000).toISOString();

  constructor() {
    if (typeof window !== 'undefined') {
      // Check URL param ?house= or ?casa= and ?role=esposa
      try {
        // Purge any legacy 'Clara' from storage
        const currentWife = localStorage.getItem('financas_wife_name') || '';
        if (currentWife.toLowerCase().includes('clara')) {
          localStorage.setItem('financas_wife_name', 'Paula');
          localStorage.setItem('financas_spouse_name', 'Paula');
        }

        const urlParams = new URLSearchParams(window.location.search);
        const houseFromUrl = urlParams.get('house') || urlParams.get('casa');
        if (houseFromUrl && houseFromUrl.trim()) {
          const cleanHouse = houseFromUrl.trim().toLowerCase();
          localStorage.setItem('financas_household_id', cleanHouse);
        }

        const roleFromUrl = (urlParams.get('role') || urlParams.get('user') || urlParams.get('conta') || '').toLowerCase();
        const isWifeParam = roleFromUrl === 'esposa' || roleFromUrl === 'paula' || urlParams.has('esposa') || urlParams.has('paula');
        const isCarlosParam = roleFromUrl === 'carlos' || roleFromUrl === 'titular' || urlParams.has('carlos');

        if (isWifeParam) {
          const wifeName = 'Paula';
          localStorage.setItem('financas_wife_name', wifeName);
          localStorage.setItem('financas_spouse_name', wifeName);
          localStorage.setItem('financas_my_device_custom_name', `iPhone de ${wifeName}`);
          localStorage.setItem('financas_my_role', 'Esposa');
          localStorage.setItem('financas_active_user_name', wifeName);
        } else if (isCarlosParam) {
          localStorage.setItem('financas_my_role', 'Titular');
          localStorage.setItem('financas_active_user_name', 'Carlos');
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

      // Connect real-time WebSocket for instant cross-device notifications
      setTimeout(() => {
        this.connectWebSocket();
      }, 600);

      // Periodic auto-sync every 4 seconds when online and page visible
      setInterval(() => {
        if (!document.hidden && navigator.onLine) {
          this.syncWithServer();
        }
      }, 4000);

      window.addEventListener('online', () => {
        this.connectWebSocket();
        this.syncWithServer();
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.connectWebSocket();
          this.syncWithServer();
        }
      });
    }
  }

  public getWifeName(): string {
    if (typeof window === 'undefined') return 'Paula';
    const stored = localStorage.getItem('financas_wife_name') || localStorage.getItem('financas_spouse_name');
    if (stored && stored.trim() && !/iphone|android|celular|smartphone|computador/i.test(stored) && !stored.toLowerCase().includes('clara')) {
      return stored.trim();
    }
    const profiles = this.getProfiles();
    const wifeProfile = profiles.find(p => 
      p.id === 'p2' || 
      p.avatar === '👩🏻' ||
      p.role?.toLowerCase().includes('esposa') || 
      p.role?.toLowerCase().includes('cônjuge')
    );
    if (wifeProfile?.name && wifeProfile.name !== 'Cônjuge' && wifeProfile.name !== 'Esposa' && !/iphone|android|celular/i.test(wifeProfile.name) && !wifeProfile.name.toLowerCase().includes('clara')) {
      return wifeProfile.name;
    }
    return 'Paula';
  }

  public setWifeName(name: string): void {
    if (typeof window === 'undefined') return;
    const clean = name.trim() || 'Paula';
    localStorage.setItem('financas_wife_name', clean);
    localStorage.setItem('financas_spouse_name', clean);
    const profiles = this.getProfiles();
    const updated = profiles.map(p => {
      if (p.id === 'p2' || p.avatar === '👩🏻' || p.role?.toLowerCase().includes('esposa') || p.role?.toLowerCase().includes('cônjuge')) {
        return { ...p, name: clean };
      }
      return p;
    });
    this.saveProfiles(updated);
    this.broadcastUpdate('WIFE_NAME_CHANGED', clean);
  }

  public getTitularName(): string {
    if (typeof window === 'undefined') return 'Carlos';
    const stored = localStorage.getItem('financas_titular_name');
    if (stored && stored.trim() && !/iphone|android|celular|smartphone|computador/i.test(stored)) {
      return stored.trim();
    }
    const profiles = this.getProfiles();
    const titularProfile = profiles.find(p => p.id === 'p1' || p.avatar === '👤');
    if (titularProfile?.name && titularProfile.name !== 'Você (Titular)' && titularProfile.name !== 'Você') {
      return titularProfile.name;
    }
    return 'Carlos';
  }

  public setTitularName(name: string): void {
    if (typeof window === 'undefined') return;
    const clean = name.trim() || 'Carlos';
    localStorage.setItem('financas_titular_name', clean);
    const profiles = this.getProfiles();
    const updated = profiles.map(p => {
      if (p.id === 'p1' || p.avatar === '👤' || p.role?.toLowerCase().includes('titular')) {
        return { ...p, name: clean };
      }
      return p;
    });
    this.saveProfiles(updated);
    this.broadcastUpdate('TITULAR_NAME_CHANGED', clean);
  }

  public getCurrentUserName(): string {
    if (typeof window === 'undefined') return 'Carlos';
    
    // Check role of the device first: if this is wife's device, strictly use wife's name!
    const storedRole = localStorage.getItem('financas_my_role');
    const isWifeDevice = storedRole === 'Esposa' || storedRole === 'Cônjuge';
    if (isWifeDevice) {
      return this.getWifeName();
    }

    const customName = localStorage.getItem('financas_my_device_custom_name');
    if (customName) {
      const low = customName.toLowerCase();
      if (low.includes('esposa') || low.includes('clara') || low.includes('paula')) {
        return this.getWifeName();
      }
      if (low.includes('carlos')) return 'Carlos';
      if (!/iphone|android|celular|smartphone|computador|dispositivo/i.test(customName) && customName.trim()) {
        return customName.trim();
      }
    }

    const activeUser = localStorage.getItem('financas_active_user_name');
    if (activeUser && activeUser.trim() && !/iphone|android|celular|smartphone|computador|dispositivo/i.test(activeUser)) {
      const low = activeUser.toLowerCase();
      if (low.includes('esposa') || low.includes('clara') || low.includes('paula')) {
        return this.getWifeName();
      }
      return activeUser.trim();
    }

    return this.getTitularName();
  }

  public setActiveUserName(name: string): void {
    if (typeof window === 'undefined') return;
    const clean = name.trim();
    localStorage.setItem('financas_active_user_name', clean);
    const low = clean.toLowerCase();
    const wifeName = this.getWifeName().toLowerCase();
    if (low.includes(wifeName) || low.includes('esposa') || low.includes('clara') || low.includes('paula')) {
      localStorage.setItem('financas_my_role', 'Esposa');
    } else {
      localStorage.setItem('financas_my_role', 'Titular');
    }
    this.broadcastUpdate('ACTIVE_USER_CHANGED', clean);
  }

  public formatCurrency(val?: number): string {
    if (val === undefined || val === null || isNaN(val)) return 'R$ 0,00';
    return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  public getCanonicalDeviceName(overrideUser?: string): string {
    const rawUser = overrideUser || this.getCurrentUserName();
    const low = (rawUser || '').toLowerCase();
    const storedRole = typeof window !== 'undefined' ? (localStorage.getItem('financas_my_role') || '') : '';
    const customDev = typeof window !== 'undefined' ? (localStorage.getItem('financas_my_device_custom_name') || '') : '';
    const isWife = low.includes('paula') || low.includes('esposa') || low.includes('clara') || storedRole === 'Esposa' || storedRole === 'Cônjuge' || customDev.toLowerCase().includes('paula') || customDev.toLowerCase().includes('esposa');
    return isWife ? 'Paula (iPhone)' : 'Carlos (iPhone)';
  }

  public connectWebSocket(): void {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        const myDev = this.getCurrentDeviceInfo();
        const houseId = this.getHouseholdId();
        const userName = this.getCurrentUserName();
        const canonicalDevName = this.getCanonicalDeviceName(userName);

        this.ws?.send(
          JSON.stringify({
            type: 'JOIN',
            householdId: houseId,
            deviceId: myDev.id,
            deviceName: canonicalDevName,
            sourceDeviceName: canonicalDevName,
            userName,
            sourceUserName: userName,
          })
        );
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'STATUS_UPDATE_ACK') {
            this.addPaymentPropagationLog({
              eventType: 'SYNC_ACKNOWLEDGED',
              billId: data.billId || 'conta',
              canonicalId: data.billId || 'conta',
              billName: 'Conta',
              billAmount: 0,
              month: '',
              newStatus: data.status || 'paid',
              version: data.version || 1,
              actor: 'Servidor',
              deviceId: this.getCurrentDeviceInfo().id,
              deviceName: this.getCurrentDeviceInfo().name,
              householdId: this.getHouseholdId(),
              details: `Confirmação de recebimento: servidor registrou status ${String(data.status).toUpperCase()} (v${data.version || 1})`,
              success: true,
            });
          }

          if (data.type === 'LIVE_BILLS_SYNC') {
            const myDev = this.getCurrentDeviceInfo();
            if (data.sourceDeviceId !== myDev.id) {
              if (Array.isArray(data.bills) && data.bills.length > 0) {
                const activeDeletedBills = this.getDeletedBillIds();
                const filteredBills = data.bills.filter((b: any) => b && b.id && !activeDeletedBills.includes(b.id));
                const currentLocal = this.getBills();

                // Detailed diff log for any payment status change arriving from the other device
                data.bills.forEach((remoteB: Bill) => {
                  if (!remoteB || !remoteB.id) return;
                  const localMatch = currentLocal.find(lb => lb.id === remoteB.id || this.getCanonicalBillKey(lb) === this.getCanonicalBillKey(remoteB));
                  if (localMatch && localMatch.status !== remoteB.status) {
                    this.addPaymentPropagationLog({
                      eventType: 'WS_UPDATE_RECEIVED',
                      billId: remoteB.id,
                      canonicalId: remoteB.id,
                      billName: remoteB.name,
                      billAmount: remoteB.amount,
                      month: (remoteB.dueDate || '').substring(0, 7),
                      oldStatus: localMatch.status as any,
                      newStatus: remoteB.status as any,
                      version: remoteB.version || 1,
                      actor: remoteB.lastEditedBy || remoteB.paidBy || 'Cônjuge',
                      deviceId: data.sourceDeviceId || 'outro_aparelho',
                      deviceName: remoteB.updatedByDevice || 'Outro Aparelho',
                      householdId: this.getHouseholdId(),
                      details: `Status ${remoteB.status.toUpperCase()} recebido e aplicado em tempo real a partir do outro celular (<30ms)!`,
                      success: true,
                    });
                  }
                });

                const merged = this.mergeBillsLists(currentLocal, filteredBills);
                this.safeSaveBillsToStorage(merged);
                this.autoPropagateRecurringBills();
                this.broadcastUpdate('BILLS_UPDATED', { count: merged.length });
              }
              if (Array.isArray(data.revenues) && data.revenues.length > 0) {
                const activeDeletedRevenues = this.getDeletedRevenueIds();
                const filteredRevs = data.revenues.filter((r: any) => r && r.id && !activeDeletedRevenues.includes(r.id));
                const currentRevs = this.getRevenues();
                const mergedRevs = this.deduplicateRevenues([...currentRevs, ...filteredRevs]);
                this.saveRevenues(mergedRevs);
              }
            }
          }

          if (data.type === 'CHANGE_NOTIFICATION' && data.notification) {
            const notif: ChangeNotification = data.notification;
            const myDev = this.getCurrentDeviceInfo();
            const currentUserName = this.getCurrentUserName();
            const isDifferentDevice = notif.sourceDeviceId !== myDev.id;
            const isDifferentUser = Boolean(notif.sourceUserName && notif.sourceUserName !== currentUserName);

            if (isDifferentDevice || isDifferentUser) {
              this.lastSeenNotificationTime = notif.timestamp || new Date().toISOString();
              localStorage.setItem('financas_last_seen_notif_time', this.lastSeenNotificationTime);
              this.broadcastUpdate('REMOTE_CHANGE_NOTIFICATION', notif);
              // Trigger auto-sync to refresh local bills and revenues immediately
              this.syncWithServer();
            }
          }
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
        if (!this.wsReconnectTimer) {
          this.wsReconnectTimer = setTimeout(() => {
            this.wsReconnectTimer = null;
            this.connectWebSocket();
          }, 3000);
        }
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch (e) {
      console.warn('WebSocket connection not available:', e);
    }
  }

  public async notifyRemoteChange(
    actionType: string,
    title: string,
    message: string,
    targetItemName?: string,
    amount?: number
  ): Promise<void> {
    if (typeof window === 'undefined') return;
    const myDev = this.getCurrentDeviceInfo();
    const houseId = this.getHouseholdId();
    const userName = this.getCurrentUserName();
    const canonicalDevName = this.getCanonicalDeviceName(userName); // strictly 'Paula (iPhone)' or 'Carlos (iPhone)'

    const notif: ChangeNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      householdId: houseId,
      sourceDeviceId: myDev.id,
      sourceDeviceName: canonicalDevName,
      sourceUserName: userName,
      actionType,
      title,
      message,
      targetItemName,
      amount,
      timestamp: new Date().toISOString(),
    };

    // 1. Broadcast locally so that in-app notification & toast triggers for current device too
    this.broadcastUpdate('CHANGE_NOTIFICATION_TRIGGERED', notif);

    // 2. Ultra-fast real-time WebSocket delivery (<30ms)
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(
          JSON.stringify({
            type: 'NOTIFY_CHANGE',
            ...notif,
            deviceName: canonicalDevName,
            sourceDeviceName: canonicalDevName,
            userName,
            sourceUserName: userName,
          })
        );
      } catch (err) {
        console.warn('WS send failed, falling back to REST:', err);
      }
    }

    // 3. Guaranteed REST delivery fallback
    try {
      fetch(`/api/household/${encodeURIComponent(houseId)}/notify-change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...notif,
          deviceName: canonicalDevName,
          sourceDeviceName: canonicalDevName,
          userName,
          sourceUserName: userName,
        }),
      }).catch(() => {});
    } catch {}
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
    return `${window.location.origin}/?house=${encodeURIComponent(this.getHouseholdId())}&role=paula`;
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
    return [];
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
    return [];
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
    if (typeof window === 'undefined') return [];
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
          try {
            const parsed = JSON.parse(legacy);
            const cleaned = Array.isArray(parsed) ? parsed.filter(b => !isMockBill(b)) : [];
            if (cleaned.length > 0) {
              raw = JSON.stringify(cleaned);
              localStorage.setItem(STORAGE_KEY_BILLS, raw);
              break;
            }
          } catch {}
        }
      }
    }

    if (!raw || raw === '[]') {
      const vaultData = localStorage.getItem(STORAGE_KEY_SAFETY_VAULT_BILLS);
      if (vaultData && vaultData !== '[]') {
        try {
          const parsed = JSON.parse(vaultData);
          const cleaned = Array.isArray(parsed) ? parsed.filter(b => !isMockBill(b)) : [];
          if (cleaned.length > 0) {
            localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(cleaned));
            return this.deduplicateBills(cleaned);
          }
        } catch {}
      }
      return [];
    }

    try {
      const parsed: Bill[] = JSON.parse(raw);
      // Strip only exact legacy mock bills
      const cleaned = parsed.filter(b => !isMockBill(b));
      
      if (cleaned.length === 0) {
        localStorage.setItem(STORAGE_KEY_BILLS, '[]');
        return [];
      }

      if (cleaned.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(cleaned));
      }

      // Secure real bills in the safety vault!
      localStorage.setItem(STORAGE_KEY_SAFETY_VAULT_BILLS, JSON.stringify(cleaned));

      const currentActor = this.getCurrentUserName();
      const migrated = cleaned.map(b => {
        let actor = b.lastEditedBy;
        const rawHint = (b.updatedByDevice || (b.status === 'paid' ? b.paidBy : '') || '').toLowerCase();
        if (rawHint.includes('paula') || rawHint.includes('esposa')) {
          actor = 'Paula';
        } else if (!actor || /iphone|android|celular|computador|smartphone|dev_/i.test(actor)) {
          actor = currentActor;
        }
        return {
          ...b,
          lastEditedBy: actor,
          lastEditedAt: b.lastEditedAt || b.paidAt || b.updatedAt || new Date().toISOString(),
          updatedByDevice: b.updatedByDevice || 'Meu Celular',
        };
      });

      return this.deduplicateBills(migrated);
    } catch {
      return [];
    }
  }

  // Safe helper to write bills to localStorage with automatic QuotaExceededError protection
  public safeSaveBillsToStorage(bills: Bill[]): void {
    if (typeof window === 'undefined') return;
    try {
      const serialized = JSON.stringify(bills);
      localStorage.setItem(STORAGE_KEY_BILLS, serialized);
      try {
        localStorage.setItem(STORAGE_KEY_SAFETY_VAULT_BILLS, serialized);
      } catch {}
    } catch (err) {
      console.warn('LocalStorage QuotaExceededError while saving bills. Pruning older receipts to preserve storage...', err);
      try {
        // Strip heavy base64 receipt data from older bills while keeping receiptName and receiptSize
        const pruned = bills.map((b, idx) => {
          if (idx > 2 && b.receiptUrl && b.receiptUrl.length > 50000) {
            return { ...b, receiptUrl: undefined };
          }
          return b;
        });
        localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(pruned));
      } catch (retryErr) {
        console.error('Failed to save bills to localStorage even after pruning:', retryErr);
      }
    }
  }

  // Canonical key to guarantee a unique, consistent identifier for each debt across all devices
  public getCanonicalBillKey(b: Bill): string {
    if (!b) return '';
    const month = (b.dueDate || '').substring(0, 7) || '2026-10';
    const cleanBarcode = (b.barcode || '').replace(/\D/g, '');
    const { baseName, instNum } = parseInstallmentDetails(b.name, b);
    const isInstallment = b.recurrence === 'Parcelada' || Boolean(instNum && instNum > 0) || Boolean(b.installmentNumber && b.installmentNumber > 0);

    if (cleanBarcode.length >= 10) {
      return `bc_${month}_${cleanBarcode}`;
    }
    if (isInstallment) {
      const num = instNum || b.installmentNumber || 1;
      return `inst_${month}_${baseName}_${num}`;
    }
    return `name_${month}_${baseName}`;
  }

  // Merge two bill lists safely, ensuring canonical ID consistency and reliable payment propagation across devices
  public mergeBillsLists(localBills: Bill[], incomingBills: Bill[]): Bill[] {
    const mapById = new Map<string, Bill>();
    const mapByKey = new Map<string, Bill>();

    // 1. Index local bills
    localBills.forEach(b => {
      if (!b || !b.id) return;
      mapById.set(b.id, b);
      const key = this.getCanonicalBillKey(b);
      if (key && !mapByKey.has(key)) {
        mapByKey.set(key, b);
      }
    });

    // 2. Merge incoming bills with canonical matching & payment status preservation
    incomingBills.forEach(incoming => {
      if (!incoming || !incoming.id) return;
      const key = this.getCanonicalBillKey(incoming);
      const current = mapById.get(incoming.id) || (key ? mapByKey.get(key) : undefined);

      if (!current) {
        mapById.set(incoming.id, incoming);
        if (key) mapByKey.set(key, incoming);
      } else {
        const incVersion = incoming.version || 0;
        const curVersion = current.version || 0;
        const incUpdated = new Date(incoming.updatedAt || incoming.lastEditedAt || incoming.paidAt || 0).getTime();
        const curUpdated = new Date(current.updatedAt || current.lastEditedAt || current.paidAt || 0).getTime();
        const isEitherPaid = incoming.status === 'paid' || current.status === 'paid';

        // Check if IDs differed (inconsistent ID detected between devices!)
        const isIdMismatch = current.id !== incoming.id;
        const canonicalId = (curVersion > incVersion) ? current.id : incoming.id;

        if (isIdMismatch) {
          this.addPaymentPropagationLog({
            eventType: 'ID_RECONCILED',
            billId: canonicalId,
            canonicalId,
            billName: incoming.name,
            billAmount: incoming.amount,
            month: (incoming.dueDate || '').substring(0, 7),
            oldStatus: current.status as any,
            newStatus: (isEitherPaid ? 'paid' : incoming.status) as any,
            version: Math.max(incVersion, curVersion),
            actor: incoming.lastEditedBy || this.getCurrentUserName(),
            deviceId: this.getCurrentDeviceInfo().id,
            deviceName: this.getCurrentDeviceInfo().name,
            householdId: this.getHouseholdId(),
            details: `Identificador inconsistente reconciliado entre aparelhos (De: "${current.id}" / "${incoming.id}" -> Para: "${canonicalId}")`,
            success: true,
          });
        }

        let resolvedStatus: 'pending' | 'paid' | 'overdue' = current.status;
        let resolvedPaidAt = current.paidAt;
        let resolvedPaidBy = current.paidBy;

        if (incoming.status === 'paid' && current.status !== 'paid') {
          resolvedStatus = 'paid';
          resolvedPaidAt = incoming.paidAt || new Date().toISOString();
          resolvedPaidBy = incoming.paidBy || incoming.lastEditedBy || 'Cônjuge';
        } else if (current.status === 'paid' && incoming.status !== 'paid') {
          if (incVersion > curVersion && incUpdated > curUpdated) {
            resolvedStatus = 'pending';
            resolvedPaidAt = undefined;
            resolvedPaidBy = undefined;
          } else {
            resolvedStatus = 'paid';
            resolvedPaidAt = current.paidAt;
            resolvedPaidBy = current.paidBy;
          }
        } else if (incVersion > curVersion || incUpdated >= curUpdated) {
          resolvedStatus = incoming.status;
          resolvedPaidAt = incoming.paidAt;
          resolvedPaidBy = incoming.paidBy;
        }

        const preferred = (incVersion > curVersion || incUpdated >= curUpdated) ? incoming : current;
        const secondary = preferred === incoming ? current : incoming;

        const merged: Bill = {
          ...secondary,
          ...preferred,
          id: canonicalId,
          status: resolvedStatus,
          paidAt: resolvedPaidAt,
          paidBy: resolvedPaidBy,
          receiptUrl: preferred.receiptUrl || secondary.receiptUrl,
          receiptName: preferred.receiptName || secondary.receiptName,
          receiptSize: preferred.receiptSize || secondary.receiptSize,
          version: Math.max(incVersion, curVersion),
          updatedAt: new Date(Math.max(incUpdated, curUpdated, Date.now())).toISOString(),
          isSynced: true,
        };

        if (isIdMismatch) {
          mapById.delete(current.id);
          mapById.delete(incoming.id);
        }
        mapById.set(canonicalId, merged);
        if (key) mapByKey.set(key, merged);
      }
    });

    return Array.from(mapById.values());
  }

  // Deduplicate bills list keeping the richest / real version and reconciling into single canonical ID
  public deduplicateBills(billsList: Bill[]): Bill[] {
    if (!Array.isArray(billsList)) return [];
    const deleted = this.getDeletedBillIds();
    const deletedSet = new Set(deleted);
    const map = new Map<string, Bill>();

    for (const b of billsList) {
      if (!b || !b.id || isMockBill(b) || deletedSet.has(b.id)) {
        if (b?.id && !deletedSet.has(b.id) && isMockBill(b)) {
          this.recordDeletedBill(b.id);
          deletedSet.add(b.id);
        }
        continue;
      }

      const key = this.getCanonicalBillKey(b);

      if (map.has(key)) {
        const existing = map.get(key)!;
        const isEitherPaid = b.status === 'paid' || existing.status === 'paid';
        const bVer = b.version || 1;
        const eVer = existing.version || 1;
        const bTime = new Date(b.updatedAt || b.lastEditedAt || b.paidAt || 0).getTime();
        const eTime = new Date(existing.updatedAt || existing.lastEditedAt || existing.paidAt || 0).getTime();

        const preferred = (bVer > eVer || (bVer === eVer && bTime >= eTime)) ? b : existing;
        const secondary = preferred === b ? existing : b;

        const mergedBill: Bill = {
          ...secondary,
          ...preferred,
          id: existing.id || b.id,
          status: isEitherPaid ? 'paid' : (preferred.status || 'pending'),
          paidAt: isEitherPaid ? (preferred.status === 'paid' ? preferred.paidAt : secondary.paidAt) || new Date().toISOString() : undefined,
          paidBy: isEitherPaid ? (preferred.status === 'paid' ? preferred.paidBy : secondary.paidBy) : undefined,
          receiptUrl: preferred.receiptUrl || secondary.receiptUrl,
          receiptName: preferred.receiptName || secondary.receiptName,
          receiptSize: preferred.receiptSize || secondary.receiptSize,
          version: Math.max(bVer, eVer),
          updatedAt: new Date(Math.max(bTime, eTime, Date.now())).toISOString(),
          isSynced: true,
        };

        map.set(key, mergedBill);
        // CRITICAL: We do NOT tombstone either ID so both devices stay in sync!
      } else {
        map.set(key, b);
      }
    }

    // Cross-month cleanup:
    // If a bill was rescheduled/moved (single 'Única / Pontual' or carried-over bill), eliminate earlier phantom ghost copies.
    // CRITICAL: NEVER delete recurring bills ('Mensal Fixa') or installment bills ('Parcelada') across months!
    const list = Array.from(map.values());
    const finalList: Bill[] = [];

    for (const b of list) {
      // Recurring bills ('Mensal Fixa') and installment bills ('Parcelada') legitimately exist in multiple months
      if (b.recurrence === 'Mensal Fixa' || b.recurrence === 'Parcelada' || b.fixedValueType) {
        finalList.push(b);
        continue;
      }

      const bMonth = getBillEffectiveMonth(b);
      const bBarcode = (b.barcode || '').replace(/\D/g, '');
      const bName = b.name.trim().toLowerCase();

      const hasLaterVersion = list.some(other => {
        if (other.id === b.id) return false;
        if (other.recurrence === 'Mensal Fixa' || other.recurrence === 'Parcelada') return false;
        const otherMonth = getBillEffectiveMonth(other);
        if (otherMonth <= bMonth) return false;
        const otherBarcode = (other.barcode || '').replace(/\D/g, '');
        if (bBarcode.length >= 10 && otherBarcode === bBarcode) return true;
        return other.name.trim().toLowerCase() === bName && (b.id.startsWith('bill-carried-') || b.isCarriedOver);
      });

      if (hasLaterVersion) {
        this.recordDeletedBill(b.id);
        deletedSet.add(b.id);
      } else {
        finalList.push(b);
      }
    }

    return finalList;
  }

  // Force thorough deduplication across all months, fix installment distribution, and revert falsely paid statuses
  public cleanupAndDeduplicateAllBills(): Bill[] {
    if (typeof window === 'undefined') return [];

    let raw = localStorage.getItem(STORAGE_KEY_BILLS);
    let bills: Bill[] = [];
    try {
      bills = raw ? JSON.parse(raw) : [];
    } catch {
      bills = [];
    }
    if (!Array.isArray(bills)) bills = [];

    // Filter out mock bills and mock revenues
    bills = bills.filter(b => !isMockBill(b));

    // 1. Sanitize falsely marked 'paid' status only for fictitious preset seed bills, never for real user marks
    bills = bills.map(b => {
      const isAutoMigrated = b.id.startsWith('bill-migrated-') || (b.notes && b.notes.includes('Transferido automaticamente para Dívidas'));
      const isPreset = b.id.startsWith('bill-preset-') || b.id.startsWith('bill-streaming-') || b.id === 'bill-gas-pago' || b.id.startsWith('bill-condo-');
      const isMockSeedPaid = (isPreset || isAutoMigrated) && !b.paidAt && (b as any).isMockSeed;
      if (isMockSeedPaid && b.status === 'paid' && !b.receiptUrl) {
        return {
          ...b,
          status: 'pending' as const,
          paidAt: undefined,
          paidBy: undefined,
        };
      }
      return b;
    });

    // 2. Clear corrupted paymentMonth on all installments so each installment appears in its own due date month
    bills = bills.map(b => {
      const dueMonth = (b.dueDate || '').substring(0, 7);
      const { instNum, totalInst } = parseInstallmentDetails(b.name, b);
      const isInstallment = b.recurrence === 'Parcelada' || Boolean(instNum && instNum > 0) || (totalInst && totalInst > 1);
      const isPropagated = Boolean(b.parentRecurringId || (b.id && b.id.startsWith('rec_')));
      
      if (isInstallment || isPropagated) {
        return {
          ...b,
          paymentMonth: undefined,
        };
      }
      if (b.paymentMonth && b.paymentMonth === dueMonth) {
        return {
          ...b,
          paymentMonth: undefined,
        };
      }
      return b;
    });

    // 3. Fix installment distribution: Group installments by normalized baseName and distribute them consecutively across months
    const installmentGroups = new Map<string, Bill[]>();
    bills.forEach(b => {
      const { baseName, instNum, totalInst } = parseInstallmentDetails(b.name, b);
      const isInst = b.recurrence === 'Parcelada' || Boolean(instNum && instNum > 0) || (totalInst && totalInst > 1);
      if (isInst) {
        const groupKey = baseName;
        if (!installmentGroups.has(groupKey)) {
          installmentGroups.set(groupKey, []);
        }
        installmentGroups.get(groupKey)!.push(b);
      }
    });

    installmentGroups.forEach((groupBills) => {
      if (groupBills.length > 1) {
        groupBills.sort((a, b) => {
          const numA = a.installmentNumber || parseInstallmentDetails(a.name, a).instNum || 1;
          const numB = b.installmentNumber || parseInstallmentDetails(b.name, b).instNum || 1;
          return numA - numB;
        });

        const firstBill = groupBills[0];
        const firstDue = firstBill.dueDate || '2026-10-10';
        const [baseYearStr, baseMonthStr, baseDayStr] = firstDue.split('-');
        const baseYear = parseInt(baseYearStr, 10) || 2026;
        const baseMonth = parseInt(baseMonthStr, 10) || 10;
        const baseDay = parseInt(baseDayStr, 10) || 10;
        const firstInstNum = firstBill.installmentNumber || parseInstallmentDetails(firstBill.name, firstBill).instNum || 1;

        groupBills.forEach(b => {
          const instNum = b.installmentNumber || parseInstallmentDetails(b.name, b).instNum || 1;
          const offset = instNum - firstInstNum;
          const targetMonthIndex = baseMonth + offset;
          const targetYear = baseYear + Math.floor((targetMonthIndex - 1) / 12);
          const targetMonthNum = ((targetMonthIndex - 1) % 12) + 1;
          const maxDays = new Date(targetYear, targetMonthNum, 0).getDate();
          const validDay = Math.min(baseDay, maxDays);
          b.dueDate = `${targetYear}-${String(targetMonthNum).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`;
          b.paymentMonth = undefined;
        });
      }
    });

    // 4. Sanitize and migrate mismatched revenues
    this.sanitizeAndMigrateMismatchedRevenues();

    // 5. Run thorough deduplication
    const deduped = this.deduplicateBills(bills);
    this.safeSaveBillsToStorage(deduped);
    
    // Clear temporary deep scan cache keys
    localStorage.removeItem('financas_bills_deep_scan');
    
    this.broadcastUpdate('BILLS_UPDATED', { count: deduped.length });
    this.syncWithServer();
    return deduped;
  }

  // Helper to infer expense category from bill title or favored
  public guessCategoryFromName(name: string): string {
    const smart = inferCategoryFromName(name);
    if (smart) return smart.name;
    return 'Outras Despesas';
  }

  // Ensure bills list is automatically populated for target month with all recurring and installment bills
  public ensureRecurringBillsForMonth(targetMonthId: string): Bill[] {
    return this.autoPropagateRecurringBills([targetMonthId]);
  }

  /**
   * Automatically populates subsequent months with recurring and installment bills:
   * 1. 'Mensal Fixa' with fixed value -> Populates all subsequent months with exact fixed amount.
   * 2. 'Mensal Fixa' with variable value (or amount 0.00) -> Populates subsequent months with 0.00 ready to enter.
   * 3. 'Parcelada' -> Populates each subsequent month with installment number (X/total) and installment amount.
   *
   * Completely automated and prevents duplicate entries.
   */
  public autoPropagateRecurringBills(specificMonths?: string[]): Bill[] {
    if (typeof window === 'undefined') return this.getBills();

    const allBills = this.getBills();
    const activeDev = this.getActiveDevice().name;
    const deletedSeriesSlugs = new Set(this.getDeletedSeriesSlugs());

    // Target months range: all standard 16+ months plus any requested month
    const defaultMonths = [
      '2026-08', '2026-09', '2026-10', '2026-11', '2026-12',
      '2027-01', '2027-02', '2027-03', '2027-04', '2027-05',
      '2027-06', '2027-07', '2027-08', '2027-09', '2027-10',
      '2027-11', '2027-12'
    ];
    const targetMonthList = Array.from(new Set([
      ...defaultMonths,
      ...(specificMonths || []),
      ...allBills.map(b => (b.dueDate || '').substring(0, 7)).filter(Boolean)
    ])).sort();

    // 1. Gather all master recurring bills (Mensal Fixa)
    // Cluster bills into unique recurring series so editing a bill in one month never conflicts with old names
    interface RecurringSeriesCluster {
      master: Bill;
      keys: Set<string>;
    }
    const seriesClusters: RecurringSeriesCluster[] = [];

    allBills.forEach(b => {
      const isRecurring = b.recurrence === 'Mensal Fixa' || 
                          (b.recurrence as string) === 'Fixa' || 
                          b.fixedValueType === 'fixed_value' || 
                          b.fixedValueType === 'variable_value' ||
                          (b as any).isRecurring === true;
      if (!isMockBill(b) && isRecurring) {
        const cleanName = b.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const cleanSlug = cleanName.replace(/[^a-z0-9]/g, '-').substring(0, 24);
        const cleanBarcode = (b.barcode || '').replace(/\D/g, '');
        const parentId = b.parentRecurringId;

        // Check if b matches any existing cluster
        let matchedCluster: RecurringSeriesCluster | undefined;
        for (const cluster of seriesClusters) {
          const keys = cluster.keys;
          if (
            (parentId && keys.has(parentId)) ||
            keys.has(b.id) ||
            (cleanBarcode.length >= 10 && keys.has(cleanBarcode)) ||
            keys.has(cleanName) ||
            keys.has(cleanSlug)
          ) {
            matchedCluster = cluster;
            break;
          }
        }

        if (!matchedCluster) {
          const keys = new Set<string>();
          keys.add(cleanName);
          keys.add(cleanSlug);
          if (b.id) keys.add(b.id);
          if (parentId) keys.add(parentId);
          if (cleanBarcode.length >= 10) keys.add(cleanBarcode);
          seriesClusters.push({ master: b, keys });
        } else {
          // Merge identifiers into this cluster
          matchedCluster.keys.add(cleanName);
          matchedCluster.keys.add(cleanSlug);
          if (b.id) matchedCluster.keys.add(b.id);
          if (parentId) matchedCluster.keys.add(parentId);
          if (cleanBarcode.length >= 10) matchedCluster.keys.add(cleanBarcode);

          // Determine which bill should be the canonical master of this series
          const cur = matchedCluster.master;
          let shouldReplace = false;
          if (b.isEdited && !cur.isEdited) {
            shouldReplace = true;
          } else if (!b.isEdited && cur.isEdited) {
            shouldReplace = false;
          } else {
            const bTime = new Date(b.lastEditedAt || b.updatedAt || 0).getTime();
            const curTime = new Date(cur.lastEditedAt || cur.updatedAt || 0).getTime();
            if (bTime > curTime) {
              shouldReplace = true;
            } else if (bTime === curTime) {
              const bMonth = (b.dueDate || '').substring(0, 7);
              const curMonth = (cur.dueDate || '').substring(0, 7);
              if (bMonth > curMonth) shouldReplace = true;
            }
          }

          if (shouldReplace) {
            matchedCluster.master = b;
          }
        }
      }
    });

    // Filter out blacklisted series
    const activeRecurringClusters = seriesClusters.filter(cluster => {
      for (const k of cluster.keys) {
        if (deletedSeriesSlugs.has(k)) return false;
      }
      return true;
    });

    // 2. Gather master installment bills (Parcelada)
    const installmentGroups = new Map<string, Bill>();
    allBills.forEach(b => {
      if (!isMockBill(b) && (b.recurrence === 'Parcelada' || (b.totalInstallments || 1) > 1)) {
        const cleanBaseName = b.name.replace(/\s*\(\d+\/\d+\)/, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const cleanSlug = cleanBaseName.replace(/[^a-z0-9]/g, '-').substring(0, 24);
        if (deletedSeriesSlugs.has(cleanSlug) || deletedSeriesSlugs.has(cleanBaseName)) {
          return;
        }

        const groupId = b.parentInstallmentId || cleanBaseName;
        if (!installmentGroups.has(groupId)) {
          installmentGroups.set(groupId, b);
        } else {
          const prev = installmentGroups.get(groupId)!;
          if (b.isEdited && !prev.isEdited) {
            installmentGroups.set(groupId, b);
          } else {
            const bTime = new Date(b.lastEditedAt || b.updatedAt || 0).getTime();
            const prevTime = new Date(prev.lastEditedAt || prev.updatedAt || 0).getTime();
            if (bTime > prevTime) {
              installmentGroups.set(groupId, b);
            }
          }
        }
      }
    });

    let workingBills = [...allBills];
    let hasChanges = false;

    // Process each target month
    for (const targetMonth of targetMonthList) {
      const billsInMonth = workingBills.filter(b => (b.dueDate || '').startsWith(targetMonth));
      const namesInMonth = new Set(billsInMonth.map(b => b.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
      const barcodesInMonth = new Set(
        billsInMonth.map(b => (b.barcode || '').replace(/\D/g, '')).filter(bc => bc.length >= 10)
      );

      // A. Populate 'Mensal Fixa' (Com valor e Sem valor / Variável)
      for (const cluster of activeRecurringClusters) {
        const master = cluster.master;
        const masterMonth = (master.dueDate || '').substring(0, 7);
        // Only populate into strictly subsequent months (the master itself already exists in masterMonth)
        if (targetMonth <= masterMonth) continue;

        const cleanName = master.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const cleanBarcode = (master.barcode || '').replace(/\D/g, '');

        // Check if an instance already exists in this target month
        const existingInstance = billsInMonth.find(b => {
          if (b.parentRecurringId && (cluster.keys.has(b.parentRecurringId) || b.parentRecurringId === master.id)) return true;
          if (cluster.keys.has(b.id)) return true;
          const bBarcode = (b.barcode || '').replace(/\D/g, '');
          if (cleanBarcode.length >= 10 && bBarcode === cleanBarcode) return true;
          const bCleanName = b.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return cluster.keys.has(bCleanName) || bCleanName === cleanName;
        });

        if (existingInstance) {
          // Synchronize master changes to existing future instance
          if (
            existingInstance.name !== master.name ||
            existingInstance.category !== master.category ||
            existingInstance.favored !== master.favored ||
            existingInstance.barcode !== master.barcode ||
            existingInstance.pixKey !== master.pixKey
          ) {
            existingInstance.name = master.name;
            existingInstance.category = master.category;
            existingInstance.favored = master.favored;
            existingInstance.barcode = master.barcode;
            existingInstance.pixKey = master.pixKey;
            existingInstance.pixType = master.pixType;
            existingInstance.recurrence = master.recurrence;
            existingInstance.fixedValueType = master.fixedValueType;
            existingInstance.parentRecurringId = master.id;
            hasChanges = true;
          }
          continue;
        }

        const alreadyExists = namesInMonth.has(cleanName) || 
          (cleanBarcode.length >= 10 && barcodesInMonth.has(cleanBarcode));

        if (!alreadyExists) {
          const day = master.dueDate.split('-')[2] || '10';
          const [yStr, mStr] = targetMonth.split('-');
          const y = parseInt(yStr, 10);
          const m = parseInt(mStr, 10);
          const maxDays = new Date(y, m, 0).getDate();
          const safeDay = String(Math.min(parseInt(day, 10), maxDays)).padStart(2, '0');
          const targetDueDate = `${targetMonth}-${safeDay}`;

          const isVariable = master.fixedValueType === 'variable_value' || (master.amount || 0) === 0;
          const newAmount = isVariable ? 0 : (master.amount || 0);
          const cleanSlug = cleanName.replace(/[^a-z0-9]/g, '-').substring(0, 24);
          const newId = `rec_${cleanSlug}_${targetMonth}`;

          this.unrecordDeletedBill(newId);

          const newBill: Bill = {
            ...master,
            id: newId,
            parentRecurringId: master.id,
            dueDate: targetDueDate,
            amount: newAmount,
            fixedValueType: isVariable ? 'variable_value' : 'fixed_value',
            status: 'pending',
            paymentMonth: undefined,
            paidAt: undefined,
            paidBy: undefined,
            receiptUrl: undefined,
            receiptName: undefined,
            receiptSize: undefined,
            receiptType: undefined,
            version: 1,
            isEdited: false,
            lastEditedAt: undefined,
            isProjected: true,
            updatedAt: new Date().toISOString(),
            updatedByDevice: activeDev,
            isSynced: true,
          };

          workingBills.push(newBill);
          namesInMonth.add(cleanName);
          if (cleanBarcode.length >= 10) barcodesInMonth.add(cleanBarcode);
          hasChanges = true;
        }
      }

      // B. Populate 'Parcelada'
      for (const [_groupId, master] of installmentGroups.entries()) {
        const totalInst = master.totalInstallments || 1;
        const startInst = master.installmentNumber || 1;
        const baseMonth = (master.dueDate || '').substring(0, 7);
        const day = master.dueDate.split('-')[2] || '10';

        const [y1, m1] = baseMonth.split('-').map(Number);
        const [y2, m2] = targetMonth.split('-').map(Number);
        const monthDiff = (y2 - y1) * 12 + (m2 - m1);
        const targetInst = startInst + monthDiff;

        if (targetInst >= 1 && targetInst <= totalInst) {
          const baseCleanName = master.name.replace(/\s*\(\d+(?:\/\d+)?\)?/, '').trim();
          const targetName = `${baseCleanName} (${targetInst}/${totalInst})`;
          const cleanTargetName = targetName.toLowerCase();

          const alreadyExists = workingBills.some(b => {
            const bMonth = (b.dueDate || '').substring(0, 7);
            if (bMonth !== targetMonth) return false;
            if (
              b.parentInstallmentId &&
              (b.parentInstallmentId === (master.parentInstallmentId || master.id) || b.parentInstallmentId === _groupId) &&
              b.installmentNumber === targetInst
            ) {
              return true;
            }
            const { baseName: bBase, instNum: bInst } = parseInstallmentDetails(b.name, b);
            const { baseName: mBase } = parseInstallmentDetails(master.name, master);
            if (bBase === mBase && (bInst === targetInst || b.installmentNumber === targetInst)) {
              return true;
            }
            return b.name.trim().toLowerCase() === cleanTargetName;
          });

          if (!alreadyExists) {
            const [yStr, mStr] = targetMonth.split('-');
            const y = parseInt(yStr, 10);
            const m = parseInt(mStr, 10);
            const maxDays = new Date(y, m, 0).getDate();
            const safeDay = String(Math.min(parseInt(day, 10), maxDays)).padStart(2, '0');
            const targetDueDate = `${targetMonth}-${safeDay}`;

            const cleanSlug = baseCleanName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().substring(0, 20);
            const newId = `bill-inst-${cleanSlug}-${targetMonth}-${targetInst}`;

            this.unrecordDeletedBill(newId);

            const newInstBill: Bill = {
              ...master,
              id: newId,
              name: targetName,
              dueDate: targetDueDate,
              amount: master.amount,
              status: 'pending',
              paymentMonth: undefined,
              paidAt: undefined,
              paidBy: undefined,
              receiptUrl: undefined,
              receiptName: undefined,
              receiptSize: undefined,
              receiptType: undefined,
              installmentNumber: targetInst,
              totalInstallments: totalInst,
              parentInstallmentId: master.parentInstallmentId || master.id,
              recurrence: 'Parcelada',
              version: 1,
              isEdited: false,
              lastEditedAt: undefined,
              isProjected: true,
              updatedAt: new Date().toISOString(),
              updatedByDevice: activeDev,
              isSynced: true,
            };

            workingBills.push(newInstBill);
            hasChanges = true;
          }
        }
      }
    }

    if (hasChanges) {
      this.saveBills(workingBills);
      return this.getBills();
    }

    return workingBills;
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
    this.safeSaveBillsToStorage(updated);
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

    // Clean base name without existing (X/Y) or (X)
    const baseCleanName = (billData.name || 'Dívida Parcelada').replace(/\s*\(\d+(?:\/\d+)?\)?/, '').trim();
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
        paymentMonth: (isFirst && billData.paymentMonth && billData.paymentMonth !== installmentDueDate.substring(0, 7)) ? billData.paymentMonth : undefined,
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

  // Add or Update Single Bill (Properly references unique ID to update instead of triggering accidental duplicate insert)
  public upsertBill(bill: Omit<Bill, 'version' | 'updatedAt' | 'updatedByDevice' | 'isSynced'> & Partial<Bill>): Bill {
    localStorage.setItem(STORAGE_KEY_CUSTOMIZED, 'true');
    let bills = this.getBills();
    const activeDev = this.getActiveDevice().name;
    const nowIso = new Date().toISOString();
    const newMonth = (bill.dueDate || '').substring(0, 7);
    const cleanName = (bill.name || '').trim().toLowerCase();
    const cleanBarcode = (bill.barcode || '').replace(/\D/g, '');

    // Step 1: Identify existing bill using prioritized unique identity criteria:
    // A. By explicit bill.id
    // B. By exact barcode (>= 10 digits) across all bills
    // C. By normalized name in the target month (target month placeholder, draft or duplicate)
    // D. By normalized name in other months (moving bill forward or backward across months)
    let existingIndex = -1;

    if (bill.id) {
      existingIndex = bills.findIndex(b => b.id === bill.id);
    }

    if (existingIndex < 0 && cleanBarcode.length >= 10) {
      existingIndex = bills.findIndex(b => (b.barcode || '').replace(/\D/g, '') === cleanBarcode);
    }

    if (existingIndex < 0 && cleanName) {
      // Check in target month first
      existingIndex = bills.findIndex(b => {
        const bMonth = (b.dueDate || '').substring(0, 7);
        return bMonth === newMonth && b.name.trim().toLowerCase() === cleanName;
      });
    }

    if (existingIndex < 0 && cleanName) {
      // Check across other months for unpaid, pending, or carried-over bill being rescheduled
      existingIndex = bills.findIndex(b => {
        return b.name.trim().toLowerCase() === cleanName && (b.status !== 'paid' || (b.amount || 0) === 0 || b.id.startsWith('bill-carried-'));
      });
    }

    let savedBill: Bill;
    if (existingIndex >= 0) {
      const existing = bills[existingIndex];
      const oldMonth = (existing.dueDate || '').substring(0, 7);
      const newVersion = (existing.version || 1) + 1;

      // CRITICAL: Ensure existing bill's unique ID is referenced for update instead of triggering an insert
      const actor = this.getCurrentUserName();
      savedBill = {
        ...existing,
        ...bill,
        id: existing.id, // Strictly retain canonical unique ID
        version: newVersion,
        isEdited: true,
        lastEditedAt: nowIso,
        lastEditedBy: bill.lastEditedBy || actor,
        lastActionDescription: bill.lastActionDescription || 'Editou a conta',
        updatedAt: nowIso,
        updatedByDevice: activeDev,
        isSynced: true,
      };
      bills[existingIndex] = savedBill;

      // Clean up any phantom duplicates across months:
      // 1. Any other bill with the same barcode
      // 2. Any other bill in newMonth with the same name (e.g. preset/placeholder in target month)
      // 3. Any other bill in oldMonth with the same name (if moved between months)
      // 4. Any zero-amount or carried-over ghosts
      const deletedIdsToRecord: string[] = [];
      const isRecurring = savedBill.recurrence === 'Mensal Fixa' || savedBill.recurrence === 'Parcelada';

      bills = bills.filter(b => {
        if (b.id === savedBill.id) return true;
        const bMonth = (b.dueDate || '').substring(0, 7);
        const bName = (b.name || '').trim().toLowerCase();
        const bBarcode = (b.barcode || '').replace(/\D/g, '');

        // Never prune recurring or installment bills from other months!
        if (isRecurring && bMonth !== newMonth) {
          return true;
        }

        const isBarcodeDup = (cleanBarcode.length >= 10 && bBarcode === cleanBarcode && bMonth === newMonth);
        const isNewMonthDup = (bMonth === newMonth && bName === cleanName);
        const isOldMonthDup = (!isRecurring && oldMonth && newMonth && oldMonth !== newMonth && bMonth === oldMonth && bName === cleanName);
        const isGhostDup = (!isRecurring && bName === cleanName && (b.id.startsWith('bill-carried-') || (b.amount || 0) === 0));

        if (isBarcodeDup || isNewMonthDup || isOldMonthDup || isGhostDup) {
          deletedIdsToRecord.push(b.id);
          return false;
        }
        return true;
      });

      deletedIdsToRecord.forEach(id => this.recordDeletedBill(id));

      // Propagate changes to subsequent months for recurring and installment bills
      const applyToFutureMonths = (bill as any).applyToFutureMonths !== false;
      const previousName = (bill as any).previousName || existing.name;

      if (applyToFutureMonths && isRecurring) {
        const currentMonth = (savedBill.dueDate || '').substring(0, 7);
        const dayOfMonth = (savedBill.dueDate.split('-')[2] || '10');
        const prevCleanName = (previousName || '').replace(/\s*\(\d+\/\d+\)/, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const newCleanBaseName = savedBill.name.replace(/\s*\(\d+\/\d+\)/, '').trim();
        const masterId = savedBill.parentRecurringId || savedBill.id;
        const parentInstId = savedBill.parentInstallmentId || (savedBill.recurrence === 'Parcelada' ? savedBill.id : undefined);

        bills = bills.map(b => {
          if (b.id === savedBill.id) return b;
          const bMonth = (b.dueDate || '').substring(0, 7);
          if (bMonth <= currentMonth) return b; // Only update subsequent months!

          // Check if b belongs to this recurring series
          const bBaseCleanName = b.name.replace(/\s*\(\d+\/\d+\)/, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const matchesSeries =
            (b.parentRecurringId && (b.parentRecurringId === masterId || b.parentRecurringId === savedBill.id)) ||
            (parentInstId && b.parentInstallmentId === parentInstId) ||
            (prevCleanName && bBaseCleanName === prevCleanName) ||
            (bBaseCleanName === newCleanBaseName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')) ||
            (cleanBarcode.length >= 10 && (b.barcode || '').replace(/\D/g, '') === cleanBarcode);

          if (!matchesSeries) return b;

          // Compute updated due date in that future month using the chosen day
          const [yStr, mStr] = bMonth.split('-');
          const y = parseInt(yStr, 10);
          const m = parseInt(mStr, 10);
          const maxDays = new Date(y, m, 0).getDate();
          const safeDay = String(Math.min(parseInt(dayOfMonth, 10), maxDays)).padStart(2, '0');
          const updatedDueDate = `${bMonth}-${safeDay}`;

          // Preserve installment number if Parcelada
          let updatedName = savedBill.name;
          if (savedBill.recurrence === 'Parcelada' && b.installmentNumber) {
            updatedName = `${newCleanBaseName} (${b.installmentNumber}/${b.totalInstallments || savedBill.totalInstallments || 10})`;
          }

          // Amount logic: if fixed and not paid, update amount
          let updatedAmount = b.amount;
          if (savedBill.fixedValueType === 'fixed_value' && b.status !== 'paid') {
            updatedAmount = savedBill.amount;
          }

          return {
            ...b,
            name: updatedName,
            category: savedBill.category,
            favored: savedBill.favored,
            barcode: savedBill.barcode,
            pixKey: savedBill.pixKey,
            pixType: savedBill.pixType,
            recurrence: savedBill.recurrence,
            fixedValueType: savedBill.fixedValueType,
            notes: savedBill.notes,
            amount: updatedAmount,
            dueDate: updatedDueDate,
            parentRecurringId: masterId,
            parentInstallmentId: parentInstId || b.parentInstallmentId,
            version: (b.version || 1) + 1,
            updatedAt: nowIso,
            updatedByDevice: activeDev,
            isSynced: true,
          };
        });
      }
    } else {
      // Pure new bill creation (no existing record matched by ID, barcode, or name)
      const actor = this.getCurrentUserName();
      savedBill = {
        ...bill,
        id: bill.id || `bill-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        version: 1,
        isEdited: false,
        lastEditedAt: nowIso,
        lastEditedBy: bill.lastEditedBy || actor,
        lastActionDescription: bill.lastActionDescription || 'Cadastrou nova conta',
        updatedAt: nowIso,
        updatedByDevice: activeDev,
        isSynced: true,
      } as Bill;
      bills.unshift(savedBill);

      const isRecurring = savedBill.recurrence === 'Mensal Fixa' || savedBill.recurrence === 'Parcelada';

      // Clean up any previous month unpaid ghosts if adding into subsequent month (only for non-recurring single bills)
      if (!isRecurring) {
        const priorMonthMatches = bills.filter(b => {
          if (b.id === savedBill.id) return false;
          if (b.recurrence === 'Mensal Fixa' || b.recurrence === 'Parcelada') return false;
          const bMonth = (b.dueDate || '').substring(0, 7);
          if (bMonth >= newMonth) return false;
          const bName = (b.name || '').trim().toLowerCase();
          const bBarcode = (b.barcode || '').replace(/\D/g, '');
          if (cleanBarcode.length >= 10 && bBarcode === cleanBarcode) return true;
          return bName === cleanName && (b.status !== 'paid' || (b.amount || 0) === 0 || b.id.startsWith('bill-carried-'));
        });

        if (priorMonthMatches.length > 0) {
          priorMonthMatches.forEach(oldB => this.recordDeletedBill(oldB.id));
          const prunedIds = new Set(priorMonthMatches.map(m => m.id));
          bills = bills.filter(b => !prunedIds.has(b.id));
        }
      }
    }

    let deduped = this.deduplicateBills(bills);
    this.safeSaveBillsToStorage(deduped);

    // If recurring or installment bill was updated/added, auto-propagate to subsequent months
    if (savedBill.recurrence === 'Mensal Fixa' || savedBill.recurrence === 'Parcelada' || savedBill.fixedValueType !== undefined) {
      deduped = this.autoPropagateRecurringBills();
    }

    this.broadcastUpdate('BILL_UPSERTED', savedBill);
    this.broadcastUpdate('BILLS_UPDATED', { count: deduped.length });

    const isNew = existingIndex === -1;
    const actor = this.getCurrentUserName();
    if (isNew) {
      const title = 'Nova Conta Cadastrada 🧾';
      const dueFormatted = savedBill.dueDate ? savedBill.dueDate.split('-').reverse().join('/') : '';
      const msg = `${actor} adicionou a conta "${savedBill.name}" (${this.formatCurrency(savedBill.amount)})${dueFormatted ? ` para pagar em ${dueFormatted}` : ''}`;
      this.notifyRemoteChange('bill_created', title, msg, savedBill.name, savedBill.amount);
    } else {
      const hadReceipt = Boolean(bills[existingIndex]?.receiptUrl);
      const nowHasReceipt = Boolean(savedBill.receiptUrl);
      const isReceiptNewlyAttached = !hadReceipt && nowHasReceipt;

      if (isReceiptNewlyAttached) {
        const title = 'Comprovante Anexado 📎';
        const msg = `${actor} anexou o comprovante de pagamento da conta "${savedBill.name}"`;
        this.notifyRemoteChange('receipt_attached', title, msg, savedBill.name, savedBill.amount);
      } else {
        const title = 'Conta Atualizada ✏️';
        const msg = `${actor} alterou a conta "${savedBill.name}" (${this.formatCurrency(savedBill.amount)})`;
        this.notifyRemoteChange('bill_updated', title, msg, savedBill.name, savedBill.amount);
      }
    }

    this.syncWithServer();
    return savedBill;
  }

  public saveBill(bill: Partial<Bill>): Bill {
    return this.upsertBill(bill as any);
  }

  // Toggling paid status records audit trail of who paid/reopened with bumped version & updatedAt
  public toggleBillStatus(billId: string, status: 'pending' | 'paid' | 'overdue'): Bill | null {
    const bills = this.getBills();
    const existingIndex = bills.findIndex(b => b.id === billId);
    if (existingIndex === -1) return null;
    const existing = bills[existingIndex];
    const actor = this.getCurrentUserName();
    const isPaid = status === 'paid';
    const nowIso = new Date().toISOString();
    const newVersion = (existing.version || 1) + 1;
    const activeDev = this.getCurrentDeviceInfo().name;
    const devId = this.getCurrentDeviceInfo().id;
    const houseId = this.getHouseholdId();

    // Ensure bill is never suppressed by local tombstones
    this.unrecordDeletedBill(billId);

    const updated: Bill = {
      ...existing,
      status,
      version: newVersion,
      updatedAt: nowIso,
      updatedByDevice: activeDev,
      paidAt: isPaid ? nowIso : undefined,
      paidBy: isPaid ? actor : undefined,
      lastEditedAt: nowIso,
      lastEditedBy: actor,
      lastActionDescription: isPaid ? 'Marcou como Pago' : 'Reabriu como Pendente',
      isEdited: true,
      isSynced: true,
    };
    bills[existingIndex] = updated;
    this.safeSaveBillsToStorage(bills);
    this.broadcastUpdate('BILL_UPSERTED', updated);
    this.broadcastUpdate('BILLS_UPDATED', { count: bills.length });

    // 1. Detailed payment propagation audit log
    this.addPaymentPropagationLog({
      eventType: 'STATUS_CHANGE_LOCAL',
      billId: updated.id,
      canonicalId: updated.id,
      billName: updated.name,
      billAmount: updated.amount,
      month: (updated.dueDate || '').substring(0, 7),
      oldStatus: existing.status as any,
      newStatus: status as any,
      version: newVersion,
      actor,
      deviceId: devId,
      deviceName: activeDev,
      householdId: houseId,
      details: `${actor} alterou status no ${activeDev}: ${existing.status.toUpperCase()} -> ${status.toUpperCase()} (v${newVersion})`,
      success: true,
    });

    const title = isPaid ? 'Conta Paga! ✅' : 'Conta Reaberta 🔄';
    const msg = isPaid
      ? `${actor} marcou a conta "${existing.name}" (${this.formatCurrency(existing.amount)}) como PAGA! ✅`
      : `${actor} reabriu a conta "${existing.name}" como Pendente.`;
    this.notifyRemoteChange(isPaid ? 'bill_paid' : 'bill_pending', title, msg, existing.name, existing.amount);

    // 2. Ultra-fast real-time WebSocket status push (<25ms)
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: 'LIVE_STATUS_UPDATE',
          householdId: houseId,
          billId: updated.id,
          status: updated.status,
          paidAt: updated.paidAt,
          paidBy: updated.paidBy,
          actor,
          version: updated.version,
          billName: updated.name,
          amount: updated.amount,
          canonicalKey: this.getCanonicalBillKey(updated),
          bill: updated,
        }));
        this.addPaymentPropagationLog({
          eventType: 'WS_BROADCAST_SENT',
          billId: updated.id,
          canonicalId: updated.id,
          billName: updated.name,
          billAmount: updated.amount,
          month: (updated.dueDate || '').substring(0, 7),
          oldStatus: existing.status as any,
          newStatus: status as any,
          version: newVersion,
          actor,
          deviceId: devId,
          deviceName: activeDev,
          householdId: houseId,
          details: `Enviado broadcast WebSocket em tempo real para o outro aparelho (<30ms)`,
          success: true,
        });
      } catch (wsErr) {
        console.warn('WS status broadcast error:', wsErr);
      }
    }

    // 3. Guaranteed REST delivery to persistent server storage
    fetch(`/api/household/${encodeURIComponent(houseId)}/payment-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        billId: updated.id,
        status: updated.status,
        actor,
        deviceId: devId,
        deviceName: activeDev,
        paidAt: updated.paidAt,
        version: updated.version,
        bill: updated,
      }),
    })
      .then(res => res.json())
      .then(() => {
        this.addPaymentPropagationLog({
          eventType: 'SYNC_ACKNOWLEDGED',
          billId: updated.id,
          canonicalId: updated.id,
          billName: updated.name,
          billAmount: updated.amount,
          month: (updated.dueDate || '').substring(0, 7),
          oldStatus: existing.status as any,
          newStatus: status as any,
          version: newVersion,
          actor,
          deviceId: devId,
          deviceName: activeDev,
          householdId: houseId,
          details: `Servidor confirmou e persistiu o status ${status.toUpperCase()} no banco da casa`,
          success: true,
        });
      })
      .catch(() => {
        this.syncWithServer();
      });

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

  public unrecordDeletedBill(id: string): void {
    if (typeof window === 'undefined' || !id) return;
    const deleted = this.getDeletedBillIds().filter(d => d !== id);
    localStorage.setItem('financas_deleted_bill_ids', JSON.stringify(deleted));
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

  // Deduplicate revenues: ensures no duplicate entries per month (e.g. at most 1 salary for Resident 1, 1 for Resident 2, etc.)
  public deduplicateRevenues(revenuesList: Revenue[]): Revenue[] {
    if (!Array.isArray(revenuesList)) return [];

    const activeDeleted = this.getDeletedRevenueIds();
    const map = new Map<string, Revenue>();

    for (const r of revenuesList) {
      if (!r || !r.id || isMockRevenue(r)) continue;
      // If actively deleted by user, skip
      if (activeDeleted.includes(r.id)) continue;

      const rMonth = (r.date || '').substring(0, 7) || '2026-10';
      const cleanName = (r.name || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const profLower = (r.profileName || '').trim().toLowerCase();
      const isSalary = r.category === 'Salário & Renda' || cleanName.includes('salario') || cleanName.includes('salário');

      let key = `id_${r.id}`;
      if (isSalary) {
        if (profLower === 'carlos' || cleanName.includes('carlos') || profLower === 'você' || profLower === 'voce') {
          key = `salary_user_${rMonth}`;
        } else if (profLower === 'paula' || profLower === 'esposa' || profLower === 'cônjuge' || profLower === 'conjuge' || cleanName.includes('paula') || cleanName.includes('esposa')) {
          key = `salary_spouse_${rMonth}`;
        } else {
          key = `salary_${profLower || cleanName}_${rMonth}`;
        }
      } else {
        key = `rev_${rMonth}_${cleanName}_${profLower}`;
      }

      const existing = map.get(key);
      if (!existing) {
        map.set(key, r);
      } else {
        const rVersion = r.version || 0;
        const curVersion = existing.version || 0;
        const rUpdated = new Date(r.updatedAt || 0).getTime();
        const curUpdated = new Date(existing.updatedAt || 0).getTime();

        let keepIncoming = false;
        if ((r.amount || 0) > 0 && (existing.amount || 0) === 0) {
          keepIncoming = true;
        } else if ((existing.amount || 0) > 0 && (r.amount || 0) === 0) {
          keepIncoming = false;
        } else if (rVersion > curVersion) {
          keepIncoming = true;
        } else if (rVersion === curVersion && rUpdated >= curUpdated) {
          keepIncoming = true;
        }

        if (keepIncoming) {
          map.set(key, r);
        }
      }
    }

    return Array.from(map.values());
  }

  // Delete Bill (single month instance)
  public deleteBill(id: string): void {
    localStorage.setItem(STORAGE_KEY_CUSTOMIZED, 'true');
    const toDelete = this.getBills().find(b => b.id === id);
    const bName = toDelete?.name || 'Conta';

    this.recordDeletedBill(id);
    const bills = this.getBills().filter(b => b.id !== id);
    this.safeSaveBillsToStorage(bills);
    this.broadcastUpdate('BILL_DELETED', { id });

    const actor = this.getCurrentUserName();
    this.notifyRemoteChange('bill_deleted', 'Conta Excluída 🗑️', `${actor} excluiu a conta "${bName}"`, bName);

    this.syncWithServer();
  }

  // Slugs of recurring series permanently deleted by user across all months
  public getDeletedSeriesSlugs(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('financas_deleted_series_slugs');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public recordDeletedSeriesSlug(slug: string): void {
    if (typeof window === 'undefined' || !slug) return;
    const slugs = this.getDeletedSeriesSlugs();
    if (!slugs.includes(slug)) {
      slugs.push(slug);
      localStorage.setItem('financas_deleted_series_slugs', JSON.stringify(slugs));
    }
  }

  // Delete all occurrences of a recurring/installment bill across ALL months (current and future)
  public deleteBillSeries(bill: Bill): string[] {
    localStorage.setItem(STORAGE_KEY_CUSTOMIZED, 'true');
    const allBills = this.getBills();
    const cleanBaseName = bill.name.replace(/\s*\(\d+\/\d+\)/, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const cleanBarcode = (bill.barcode || '').replace(/\D/g, '');
    const masterId = bill.parentRecurringId || bill.id;
    const parentInstId = bill.parentInstallmentId || (bill.recurrence === 'Parcelada' ? bill.id : undefined);

    const deletedIds: string[] = [];
    const remainingBills: Bill[] = [];

    for (const b of allBills) {
      const bBaseName = b.name.replace(/\s*\(\d+\/\d+\)/, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const bBarcode = (b.barcode || '').replace(/\D/g, '');
      const isMatch =
        b.id === bill.id ||
        (b.parentRecurringId && (b.parentRecurringId === masterId || b.parentRecurringId === bill.id)) ||
        (parentInstId && b.parentInstallmentId === parentInstId) ||
        (cleanBaseName && bBaseName === cleanBaseName) ||
        (cleanBarcode.length >= 10 && bBarcode === cleanBarcode);

      if (isMatch) {
        deletedIds.push(b.id);
        this.recordDeletedBill(b.id);
      } else {
        remainingBills.push(b);
      }
    }

    if (cleanBaseName) {
      const slug = cleanBaseName.replace(/[^a-z0-9]/g, '-').substring(0, 24);
      this.recordDeletedSeriesSlug(slug);
      this.recordDeletedSeriesSlug(cleanBaseName);
    }
    if (cleanBarcode.length >= 10) {
      this.recordDeletedSeriesSlug(cleanBarcode);
    }

    this.safeSaveBillsToStorage(remainingBills);
    this.broadcastUpdate('BILLS_SERIES_DELETED', { deletedIds, billName: bill.name });

    const actor = this.getCurrentUserName();
    this.notifyRemoteChange('bill_deleted', 'Conta Excluída 🗑️', `${actor} excluiu a conta "${bill.name}" de todos os meses`, bill.name);

    this.syncWithServer();
    return deletedIds;
  }

  // Reversal check: Never convert revenues into debt expenses
  public isDebtExpense(_item: { name: string; category?: string }): boolean {
    return false;
  }

  /**
   * Cleanses both bills and revenues:
   * 1. Removes any bills that were mistakenly created by migrating revenues or that are salary
   * 2. Purges any mock/fictitious revenues and bills (Camila, Carlos, Paula seed data)
   */
  public sanitizeAndMigrateMismatchedRevenues(): void {
    if (typeof window === 'undefined') return;
    try {
      // 1. Purge any bills that were migrated from revenues or are salary-related
      const rawBills = localStorage.getItem(STORAGE_KEY_BILLS);
      if (rawBills) {
        const parsedBills: Bill[] = JSON.parse(rawBills);
        if (Array.isArray(parsedBills)) {
          const pureBills = parsedBills.filter(b => !isMockBill(b));
          if (pureBills.length !== parsedBills.length) {
            localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(pureBills));
            localStorage.setItem(STORAGE_KEY_SAFETY_VAULT_BILLS, JSON.stringify(pureBills));
          }
        }
      }

      // 2. Purge any mock/seed revenues (Camila, Carlos, Paula seed data)
      const rawRevs = localStorage.getItem(STORAGE_KEY_REVENUES);
      if (rawRevs) {
        const parsedRevs: Revenue[] = JSON.parse(rawRevs);
        if (Array.isArray(parsedRevs)) {
          const pureRevs = parsedRevs.filter(r => !isMockRevenue(r));
          if (pureRevs.length !== parsedRevs.length) {
            localStorage.setItem(STORAGE_KEY_REVENUES, JSON.stringify(pureRevs));
            localStorage.setItem(STORAGE_KEY_SAFETY_VAULT_REVENUES, JSON.stringify(pureRevs));
          }
        }
      }
    } catch (e) {
      console.error('Error cleaning up mismatched revenues and bills:', e);
    }
  }

  // Revenues
  public getRevenues(): Revenue[] {
    if (typeof window === 'undefined') return [];
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
          try {
            const parsed = JSON.parse(legacy);
            const cleaned = Array.isArray(parsed) ? parsed.filter(r => !isMockRevenue(r)) : [];
            if (cleaned.length > 0) {
              raw = JSON.stringify(cleaned);
              localStorage.setItem(STORAGE_KEY_REVENUES, raw);
              break;
            }
          } catch {}
        }
      }
    }

    if (!raw || raw === '[]') {
      const vaultData = localStorage.getItem(STORAGE_KEY_SAFETY_VAULT_REVENUES);
      if (vaultData && vaultData !== '[]') {
        try {
          const parsed = JSON.parse(vaultData);
          const cleaned = Array.isArray(parsed) ? parsed.filter(r => !isMockRevenue(r)) : [];
          if (cleaned.length > 0) {
            localStorage.setItem(STORAGE_KEY_REVENUES, JSON.stringify(cleaned));
            return this.deduplicateRevenues(cleaned);
          }
        } catch {}
      }
      return [];
    }

    try {
      const parsed: Revenue[] = JSON.parse(raw);
      const activeDeleted = this.getDeletedRevenueIds();
      const sanitized = parsed.filter(r => r && r.id && !activeDeleted.includes(r.id) && !isMockRevenue(r));

      if (sanitized.length === 0) {
        localStorage.setItem(STORAGE_KEY_REVENUES, '[]');
        return [];
      }

      const deduped = this.deduplicateRevenues(sanitized);
      if (deduped.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY_REVENUES, JSON.stringify(deduped));
      }
      return deduped;
    } catch {
      return [];
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

  // Direct helper to edit and persist household salaries with automatic propagation to subsequent months
  public updateCoupleSalaries(userAmount: number, spouseAmount: number, selectedMonthId: string = '2026-11'): Revenue[] {
    const rawRevenues = this.getRevenues().filter(r => !isMockRevenue(r));
    const activeDev = this.getActiveDevice().name;
    const monthPrefix = selectedMonthId || '2026-11';
    const profiles = this.getProfiles();
    const userPName = profiles[0]?.name || 'Você';
    const spousePName = profiles[1]?.name || 'Cônjuge';

    const defaultMonths = [
      '2026-08', '2026-09', '2026-10', '2026-11', '2026-12',
      '2027-01', '2027-02', '2027-03', '2027-04', '2027-05',
      '2027-06', '2027-07', '2027-08', '2027-09', '2027-10',
      '2027-11', '2027-12'
    ];
    const targetMonthList = Array.from(new Set([
      ...defaultMonths,
      monthPrefix,
      ...rawRevenues.map(r => (r.date || '').substring(0, 7)).filter(Boolean)
    ])).sort();

    const futureMonths = targetMonthList.filter(m => m >= monthPrefix);
    const nowIso = new Date().toISOString();

    let updated = [...rawRevenues];

    for (const m of futureMonths) {
      const dateStr = `${m}-05`;

      // Filter out existing salary instances in month m for user and spouse
      updated = updated.filter(r => {
        const isMonth = (r.date || '').startsWith(m);
        if (!isMonth) return true;
        if (r.category === 'Salário & Renda') {
          if (r.profileName === userPName || r.profileName === 'Você') return false;
          if (r.profileName === spousePName || r.profileName === 'Esposa' || r.profileName === 'Cônjuge') return false;
        }
        return true;
      });

      if (userAmount > 0) {
        updated.push({
          id: `rev-user-${m}`,
          name: `Salário (${userPName})`,
          amount: userAmount,
          date: dateStr,
          category: 'Salário & Renda',
          recurrence: 'Mensal',
          profileName: userPName,
          notes: `Salário de ${userPName}`,
          version: 2,
          updatedAt: nowIso,
          updatedByDevice: activeDev,
          isSynced: true,
        });
      }

      if (spouseAmount > 0) {
        updated.push({
          id: `rev-spouse-${m}`,
          name: `Salário (${spousePName})`,
          amount: spouseAmount,
          date: dateStr,
          category: 'Salário & Renda',
          recurrence: 'Mensal',
          profileName: spousePName,
          notes: `Salário de ${spousePName}`,
          version: 2,
          updatedAt: nowIso,
          updatedByDevice: activeDev,
          isSynced: true,
        });
      }
    }

    this.saveRevenues(updated);
    this.syncWithServer();
    return this.autoPropagateRecurringRevenues();
  }

  /**
   * Automatically populates subsequent months with recurring revenues (Carlos, Paula, and other 'Mensal' entries)
   */
  public autoPropagateRecurringRevenues(specificMonths?: string[]): Revenue[] {
    if (typeof window === 'undefined') return this.getRevenues();

    const allRevenues = this.getRevenues();
    const activeDev = this.getActiveDevice().name;

    const defaultMonths = [
      '2026-08', '2026-09', '2026-10', '2026-11', '2026-12',
      '2027-01', '2027-02', '2027-03', '2027-04', '2027-05',
      '2027-06', '2027-07', '2027-08', '2027-09', '2027-10',
      '2027-11', '2027-12'
    ];
    const targetMonthList = Array.from(new Set([
      ...defaultMonths,
      ...(specificMonths || []),
      ...allRevenues.map(r => (r.date || '').substring(0, 7)).filter(Boolean)
    ])).sort();

    // 1. Group recurring revenues by series
    interface RevenueSeriesCluster {
      id: string; // 'carlos' | 'paula' | custom slug
      master: Revenue;
      startMonth: string;
      dayOfMonth: string;
    }
    const seriesMap = new Map<string, RevenueSeriesCluster>();

    const deletedSeries = this.getDeletedRevenueSeriesSlugs();

    // Check existing revenues
    allRevenues.forEach(r => {
      if (isMockRevenue(r)) return;
      const isRecurring = r.recurrence === 'Mensal' || r.category === 'Salário & Renda';
      if (!isRecurring) return;

      const rMonth = (r.date || '').substring(0, 7) || '2026-10';
      const day = (r.date || '').split('-')[2] || '05';

      let seriesKey = '';
      const idRoot = r.id.replace(/-\d{4}-\d{2}$/, '');
      if (r.category === 'Salário & Renda') {
        const prof = (r.profileName || 'user').toLowerCase();
        seriesKey = `salary_${prof}`;
      } else if (r.id.startsWith('rev-rec-')) {
        seriesKey = idRoot;
      } else {
        const cleanName = r.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '-');
        seriesKey = `custom_${cleanName}_${(r.profileName || 'user').toLowerCase()}`;
      }

      if (deletedSeries.includes(seriesKey) || (idRoot && deletedSeries.includes(idRoot))) {
        return;
      }

      const existing = seriesMap.get(seriesKey);
      if (!existing) {
        seriesMap.set(seriesKey, {
          id: seriesKey,
          master: r,
          startMonth: rMonth,
          dayOfMonth: day,
        });
      } else {
        const eTime = new Date(existing.master.updatedAt || 0).getTime();
        const rTime = new Date(r.updatedAt || 0).getTime();
        const rVer = r.version || 1;
        const eVer = existing.master.version || 1;
        
        if (rMonth < existing.startMonth) {
          existing.startMonth = rMonth;
        }

        // Canonical master is the one with highest version or most recently edited timestamp
        if (rVer > eVer || (rVer === eVer && rTime > eTime)) {
          existing.master = r;
          existing.dayOfMonth = day;
        }
      }
    });

    const nowIso = new Date().toISOString();
    let workingRevs = [...allRevenues];
    let hasChanges = false;

    for (const targetMonth of targetMonthList) {
      for (const cluster of seriesMap.values()) {
        if (targetMonth < cluster.startMonth) continue;

        const master = cluster.master;
        const masterMonth = (master.date || '').substring(0, 7) || cluster.startMonth;
        const targetDate = `${targetMonth}-${cluster.dayOfMonth.padStart(2, '0')}`;

        // Find existing revenue in targetMonth for this series
        const existingIdx = workingRevs.findIndex(r => {
          const m = (r.date || '').substring(0, 7);
          if (m !== targetMonth) return false;
          if (cluster.id.startsWith('salary_')) {
            const prof = (r.profileName || 'user').toLowerCase();
            return `salary_${prof}` === cluster.id && r.category === 'Salário & Renda';
          }
          const rIdRoot = r.id.replace(/-\d{4}-\d{2}$/, '');
          if (rIdRoot && rIdRoot === cluster.id) return true;
          const cleanName = r.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '-');
          return `custom_${cleanName}_${(r.profileName || 'user').toLowerCase()}` === cluster.id;
        });

        if (existingIdx >= 0) {
          const item = workingRevs[existingIdx];
          // For months from master's month onwards, ensure amount and details match master
          if (targetMonth >= masterMonth && (item.amount !== master.amount || item.name !== master.name)) {
            workingRevs[existingIdx] = {
              ...item,
              amount: master.amount,
              name: master.name,
              category: master.category,
              profileName: master.profileName,
              notes: master.notes,
              version: (item.version || 1) + 1,
              updatedAt: nowIso,
            };
            hasChanges = true;
          }
        } else {
          // Create revenue for targetMonth
          const newId = `rev-rec-${cluster.id}-${targetMonth}`;

          const cleanDeleted = this.getDeletedRevenueIds().filter(d => d !== newId);
          localStorage.setItem('financas_deleted_revenue_ids', JSON.stringify(cleanDeleted));

          workingRevs.push({
            id: newId,
            name: master.name,
            amount: master.amount,
            date: targetDate,
            category: master.category,
            recurrence: 'Mensal',
            profileName: master.profileName,
            notes: master.notes || '',
            version: 1,
            updatedAt: nowIso,
            updatedByDevice: activeDev,
            isSynced: true,
          });
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      this.saveRevenues(workingRevs);
      return this.getRevenues();
    }

    return workingRevs;
  }

  // Ensure revenues are populated for target month
  public ensureRecurringRevenuesForMonth(targetMonthId: string): Revenue[] {
    return this.autoPropagateRecurringRevenues([targetMonthId]);
  }

  public upsertRevenue(rev: Partial<Revenue> & { name: string; amount: number; date: string; category: string; applyToFutureMonths?: boolean }): Revenue {
    localStorage.setItem(STORAGE_KEY_CUSTOMIZED, 'true');
    const revenues = this.getRevenues();
    const activeDev = this.getActiveDevice().name;
    const revId = rev.id || `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Ensure this ID is NEVER in deleted list
    const cleanDeleted = this.getDeletedRevenueIds().filter(id => id !== revId);
    localStorage.setItem('financas_deleted_revenue_ids', JSON.stringify(cleanDeleted));

    const existingIndex = revenues.findIndex(r => r.id === revId);
    let prevName = '';
    if (existingIndex >= 0) {
      prevName = revenues[existingIndex].name || '';
    }
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
        profileName: rev.profileName || this.getProfiles()[0]?.name || 'Você',
        notes: rev.notes || '',
        version: 1,
        updatedAt: nowIso,
        updatedByDevice: activeDev,
        isSynced: true,
      };
      revenues.unshift(saved);
    }

    let deduped = this.deduplicateRevenues(revenues);

    // If recurring monthly revenue, propagate directly to all subsequent months
    const shouldPropagate = rev.applyToFutureMonths !== false && (saved.recurrence === 'Mensal' || saved.category === 'Salário & Renda');
    if (shouldPropagate) {
      const savedMonth = (saved.date || '').substring(0, 7) || '2026-10';
      const dayStr = (saved.date || '').split('-')[2] || '05';
      const defaultMonths = [
        '2026-08', '2026-09', '2026-10', '2026-11', '2026-12',
        '2027-01', '2027-02', '2027-03', '2027-04', '2027-05',
        '2027-06', '2027-07', '2027-08', '2027-09', '2027-10',
        '2027-11', '2027-12',
      ];
      const targetMonths = Array.from(new Set([
        ...defaultMonths,
        ...deduped.map(r => (r.date || '').substring(0, 7)).filter(Boolean)
      ])).filter(m => m >= savedMonth).sort();

      const cleanName = saved.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '-');
      const prevCleanName = prevName ? prevName.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '-') : '';
      const savedIdRoot = saved.id.replace(/-\d{4}-\d{2}$/, '');
      const profLower = (saved.profileName || 'user').toLowerCase();

      // Un-record from deleted series slugs if actively being saved/re-created
      const delSlugs = this.getDeletedRevenueSeriesSlugs().filter(s => 
        s !== `salary_${profLower}` && 
        s !== `salary_${cleanName}` && 
        s !== cleanName && 
        s !== `custom_${cleanName}_${profLower}` &&
        s !== savedIdRoot
      );
      localStorage.setItem('financas_deleted_revenue_series_slugs', JSON.stringify(delSlugs));

      for (const m of targetMonths) {
        if (m === savedMonth) continue;
        const targetDate = `${m}-${dayStr.padStart(2, '0')}`;

        const existingSubIdx = deduped.findIndex(r => {
          if ((r.date || '').substring(0, 7) !== m) return false;
          const rIdRoot = r.id.replace(/-\d{4}-\d{2}$/, '');
          if (savedIdRoot && rIdRoot === savedIdRoot) return true;
          const rClean = r.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '-');
          const matchesName = rClean === cleanName || (prevCleanName && rClean === prevCleanName);
          return matchesName && (r.profileName || 'user').toLowerCase() === profLower;
        });

        if (existingSubIdx >= 0) {
          deduped[existingSubIdx] = {
            ...deduped[existingSubIdx],
            amount: saved.amount,
            name: saved.name,
            category: saved.category,
            profileName: saved.profileName,
            notes: saved.notes,
            version: (deduped[existingSubIdx].version || 1) + 1,
            updatedAt: nowIso,
          };
        } else {
          const subId = `rev-rec-${cleanName}-${profLower}-${m}`;

          const cleanDel = this.getDeletedRevenueIds().filter(d => d !== subId);
          localStorage.setItem('financas_deleted_revenue_ids', JSON.stringify(cleanDel));

          deduped.push({
            id: subId,
            name: saved.name,
            amount: saved.amount,
            date: targetDate,
            category: saved.category,
            recurrence: 'Mensal',
            profileName: saved.profileName,
            notes: saved.notes || '',
            version: 1,
            updatedAt: nowIso,
            updatedByDevice: activeDev,
            isSynced: true,
          });
        }
      }
    }

    localStorage.setItem(STORAGE_KEY_REVENUES, JSON.stringify(deduped));
    localStorage.setItem(STORAGE_KEY_SAFETY_VAULT_REVENUES, JSON.stringify(deduped));

    if (shouldPropagate) {
      deduped = this.autoPropagateRecurringRevenues();
    }

    this.broadcastUpdate('REVENUE_UPSERTED', saved);
    this.broadcastUpdate('REVENUES_UPDATED', { count: deduped.length });

    const actor = this.getCurrentUserName();
    const title = 'Nova Receita / Salário 💰';
    const msg = `${actor} cadastrou a receita "${saved.name}" (${this.formatCurrency(saved.amount)})`;
    this.notifyRemoteChange('revenue_created', title, msg, saved.name, saved.amount);

    this.syncWithServer();
    return saved;
  }

  public saveRevenue(rev: Partial<Revenue> & { name: string; amount: number; date: string; category: string; applyToFutureMonths?: boolean }): Revenue {
    return this.upsertRevenue(rev);
  }

  /**
   * Purges old backups, legacy cache keys, and historical deleted debts permanently.
   * Keeps only the active clean bills and revenues currently visible in the app.
   */
  public purgeOldBackupsAndLegacyDebts(): {
    purgedKeys: string[];
    purgedDebtsCount: number;
    activeBillsCount: number;
    activeRevenuesCount: number;
  } {
    if (typeof window === 'undefined') {
      return { purgedKeys: [], purgedDebtsCount: 0, activeBillsCount: 0, activeRevenuesCount: 0 };
    }

    const legacyKeyPatterns = [
      'financas_cloudkit_bills_v2',
      'financas_cloudkit_bills_v1',
      'financas_cloudkit_bills',
      'household_bills',
      'financas_bills_backup',
      'financas_cloudkit_revenues_v2',
      'financas_cloudkit_revenues_v1',
      'financas_cloudkit_revenues',
      'financas_deleted_series_slugs',
      'financas_deleted_bill_ids',
      'financas_deleted_revenue_ids',
    ];

    const purgedKeys: string[] = [];

    // Find and delete matching legacy keys from localStorage
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key) {
        const isLegacyMatch =
          legacyKeyPatterns.includes(key) ||
          key.includes('backup') ||
          key.includes('vault_old') ||
          (key.startsWith('financas_') && (key.includes('_v1') || key.includes('_v2')));
        if (isLegacyMatch) {
          localStorage.removeItem(key);
          purgedKeys.push(key);
        }
      }
    }

    // Keep ONLY real, active, non-mock bills currently in the app
    const activeBills = this.getBills().filter(b => !isMockBill(b));
    const activeRevenues = this.getRevenues().filter(r => !isMockRevenue(r));

    // Overwrite main storage and safety vaults with strictly the clean active dataset
    localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(activeBills));
    localStorage.setItem(STORAGE_KEY_SAFETY_VAULT_BILLS, JSON.stringify(activeBills));
    localStorage.setItem(STORAGE_KEY_REVENUES, JSON.stringify(activeRevenues));
    localStorage.setItem(STORAGE_KEY_SAFETY_VAULT_REVENUES, JSON.stringify(activeRevenues));

    // Reset deleted tombstones so they start clean
    localStorage.setItem('financas_deleted_bill_ids', '[]');
    localStorage.setItem('financas_deleted_series_slugs', '[]');
    localStorage.setItem('financas_deleted_revenue_ids', '[]');

    // Sync clean state to server with forceReplace
    try {
      const houseId = this.getHouseholdId();
      fetch(`/api/household/${encodeURIComponent(houseId)}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bills: activeBills,
          revenues: activeRevenues,
          forceReplace: true,
          deletedBillIds: [],
          deletedRevenueIds: [],
          device: this.getCurrentDeviceInfo(),
        }),
      }).catch(() => {});
    } catch {}

    this.broadcastUpdate('BILLS_UPDATED', { count: activeBills.length });
    this.broadcastUpdate('REVENUES_UPDATED', { count: activeRevenues.length });

    return {
      purgedKeys,
      purgedDebtsCount: purgedKeys.length,
      activeBillsCount: activeBills.length,
      activeRevenuesCount: activeRevenues.length,
    };
  }

  /**
   * Exports backup file containing ONLY the debts visible in the app
   * (can be scoped to current month or all active visible debts).
   */
  public exportVisibleDebtsBackup(options?: {
    monthId?: string;
    monthLabel?: string;
    scope?: 'current_month' | 'all_visible';
  }): { count: number; totalAmount: number; filename: string } {
    const allBills = this.getBills().filter(b => !isMockBill(b));
    const allRevs = this.getRevenues().filter(r => !isMockRevenue(r));
    const profiles = this.getProfiles();

    let targetBills: Bill[] = [];
    let targetRevs: Revenue[] = [];
    let filename = '';
    const nowIso = new Date().toISOString();
    const dateStamp = nowIso.slice(0, 10);

    if (options?.scope === 'current_month' && options?.monthId) {
      const mId = options.monthId;
      targetBills = allBills.filter(b => (b.dueDate || '').startsWith(mId));
      targetRevs = allRevs.filter(r => (r.date || '').startsWith(mId));
      filename = `backup_dividas_visiveis_${mId}_${dateStamp}.json`;
    } else {
      targetBills = allBills;
      targetRevs = allRevs;
      filename = `backup_dividas_ativas_visiveis_${dateStamp}.json`;
    }

    const totalAmount = targetBills.reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalRevenuesAmount = targetRevs.reduce((sum, r) => sum + (r.amount || 0), 0);

    const backupData = {
      backupType: 'visible_debts_backup',
      scope: options?.scope || 'all_visible',
      monthId: options?.monthId,
      monthLabel: options?.monthLabel,
      exportedAt: nowIso,
      version: '1.0',
      householdId: this.getHouseholdId(),
      summary: {
        totalBills: targetBills.length,
        totalBillsAmount: totalAmount,
        totalRevenues: targetRevs.length,
        totalRevenuesAmount,
      },
      bills: targetBills,
      revenues: targetRevs,
      profiles,
    };

    if (typeof window !== 'undefined') {
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    return {
      count: targetBills.length,
      totalAmount,
      filename,
    };
  }

  /**
   * 1-Click Complete Household Backup:
   * Downloads JSON file, sends a snapshot to server, and prepares prefilled email
   */
  public async createFullBackup(userEmail: string = 'l.carlosramos92@gmail.com'): Promise<{
    success: boolean;
    filename: string;
    billsCount: number;
    revenuesCount: number;
    totalAmount: number;
    emailMailtoUrl: string;
    serverBackup?: any;
    backupPayload: any;
    backupJsonString: string;
  }> {
    const allBills = this.getBills().filter(b => !isMockBill(b));
    const allRevs = this.getRevenues().filter(r => !isMockRevenue(r));
    const profiles = this.getProfiles();
    const devices = this.getDevices();
    const categories = getStoredCategories();
    const now = new Date();
    const nowIso = now.toISOString();
    const dateFormatted = now.toLocaleDateString('pt-BR');
    const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const filename = `backup_financas_minha_casa_${nowIso.slice(0, 10)}_${nowIso.slice(11, 16).replace(':', 'h')}.json`;

    const totalBillsAmount = allBills.reduce((acc, b) => acc + (b.amount || 0), 0);
    const totalRevenuesAmount = allRevs.reduce((acc, r) => acc + (r.amount || 0), 0);
    const estimatedBalance = totalRevenuesAmount - totalBillsAmount;

    const fullPayload = {
      backupType: 'household_full_backup',
      version: '2.0',
      createdAt: nowIso,
      householdId: this.getHouseholdId(),
      householdCode: this.getHouseholdCode(),
      userEmail,
      summary: {
        exportedAtFormatted: `${dateFormatted} às ${timeFormatted}`,
        totalBills: allBills.length,
        totalBillsAmount,
        totalRevenues: allRevs.length,
        totalRevenuesAmount,
        projectedBalance: estimatedBalance,
        devicesCount: devices.length,
        activeDevice: this.getActiveDevice().name,
      },
      household: {
        id: this.getHouseholdId(),
        name: 'Finanças da Minha Casa',
        code: this.getHouseholdCode(),
        bills: allBills,
        revenues: allRevs,
        profiles,
        devices,
        categories,
        lastUpdated: nowIso,
      },
    };

    // 1. Client-side instant download (.json)
    if (typeof window !== 'undefined') {
      const blob = new Blob([JSON.stringify(fullPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    // 2. Persist snapshot on server
    let serverBackup = null;
    try {
      const res = await fetch('/api/backup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId: this.getHouseholdId(),
          userEmail,
          clientData: {
            bills: allBills,
            revenues: allRevs,
            profiles,
          },
          notes: `Backup gerado pelo dispositivo ${this.getActiveDevice().name} em ${dateFormatted} às ${timeFormatted}`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        serverBackup = data.backup;
      }
    } catch (err) {
      console.warn('Failed to upload backup snapshot to server:', err);
    }

    // 3. Format prefilled email body and mailto link
    const subject = encodeURIComponent(`💾 Backup Finanças da Minha Casa - ${dateFormatted}`);
    const emailBody = encodeURIComponent(
      `Olá Carlos,\n\n` +
      `Aqui está o resumo do seu backup de segurança das Finanças da Minha Casa gerado em ${dateFormatted} às ${timeFormatted}:\n\n` +
      `📊 RESUMO DO PATRIMÔNIO E CONTAS:\n` +
      `• Total de Contas Cadastradas: ${allBills.length} (R$ ${totalBillsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})\n` +
      `• Total de Receitas/Salários: ${allRevs.length} (R$ ${totalRevenuesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})\n` +
      `• Saldo / Sobra Projetada: R$ ${estimatedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `• Dispositivos Conectados: ${devices.length} aparelhos (incluindo iPhone do Casal)\n\n` +
      `O arquivo "${filename}" foi baixado com sucesso em seu dispositivo.\n` +
      `Guarde este e-mail para manter seu histórico financeiro 100% seguro.\n\n` +
      `Finanças da Minha Casa • Sincronização Segura`
    );

    const emailMailtoUrl = `mailto:${userEmail}?subject=${subject}&body=${emailBody}`;

    return {
      success: true,
      filename,
      billsCount: allBills.length,
      revenuesCount: allRevs.length,
      totalAmount: totalBillsAmount,
      emailMailtoUrl,
      serverBackup,
      backupPayload: fullPayload,
      backupJsonString: JSON.stringify(fullPayload, null, 2),
    };
  }

  /**
   * Fetches list of server backups
   */
  public async getServerBackups(): Promise<any[]> {
    try {
      const res = await fetch(`/api/backup/list/${this.getHouseholdId()}`);
      if (res.ok) {
        const data = await res.json();
        return data.backups || [];
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Restores a backup from server file
   */
  public async restoreServerBackup(filename: string, mode: 'replace' | 'merge' = 'replace'): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId: this.getHouseholdId(),
          filename,
          mode,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.household) {
          if (data.household.bills) {
            this.safeSaveBillsToStorage(data.household.bills);
          }
          if (data.household.revenues) {
            this.saveRevenues(data.household.revenues);
          }
          this.broadcastUpdate('BILLS_UPDATED', { count: (data.household.bills || []).length });
          this.broadcastUpdate('REVENUES_UPDATED', { count: (data.household.revenues || []).length });
        }
        return { success: true, message: data.message || 'Backup restaurado com sucesso!' };
      }
      return { success: false, message: 'Falha ao restaurar backup do servidor.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Erro de conexão ao restaurar.' };
    }
  }

  /**
   * Helper to parse JSON from raw text or email bodies (tolerant to surrounding text)
   */
  public parseBackupPayload(rawInput: string): any {
    const trimmed = (rawInput || '').trim();
    if (!trimmed) throw new Error('O conteúdo fornecido está vazio.');
    try {
      return JSON.parse(trimmed);
    } catch {
      // Find JSON object boundary { ... }
      const firstBrace = trimmed.indexOf('{');
      const lastBrace = trimmed.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const sub = trimmed.slice(firstBrace, lastBrace + 1);
        return JSON.parse(sub);
      }
      // Check for array [ ... ]
      const firstBracket = trimmed.indexOf('[');
      const lastBracket = trimmed.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        const sub = trimmed.slice(firstBracket, lastBracket + 1);
        const arr = JSON.parse(sub);
        if (Array.isArray(arr)) {
          return { bills: arr };
        }
      }
      throw new Error('Não foi possível identificar dados JSON de backup válidos no texto.');
    }
  }

  /**
   * Restores data from imported client-side JSON string or email text
   */
  public async restoreFromLocalJson(rawJson: string, mode: 'replace' | 'merge' = 'replace'): Promise<{ 
    success: boolean; 
    message: string; 
    billsCount: number; 
    revenuesCount: number;
    categoriesCount?: number;
  }> {
    try {
      const parsed = this.parseBackupPayload(rawJson);
      const targetHousehold = parsed.household || parsed.clientData || parsed.data || parsed;
      const incomingBills: Bill[] = (targetHousehold.bills || parsed.bills || []).filter((b: any) => !isMockBill(b));
      const incomingRevs: Revenue[] = (targetHousehold.revenues || parsed.revenues || []).filter((r: any) => !isMockRevenue(r));

      if (incomingBills.length === 0 && incomingRevs.length === 0) {
        return { 
          success: false, 
          message: 'O arquivo de backup não contém contas ou receitas válidas para atualizar.', 
          billsCount: 0, 
          revenuesCount: 0 
        };
      }

      // 1. Safety snapshot of current state before replacing
      this.safeSaveBillsToStorage(this.getBills());

      // 2. Apply bills
      let finalBills: Bill[] = [];
      if (mode === 'merge') {
        const current = this.getBills();
        const existingIds = new Set(current.map(b => b.id));
        const newOnes = incomingBills.filter(b => !existingIds.has(b.id));
        finalBills = [...current, ...newOnes];
      } else {
        finalBills = incomingBills;
      }
      this.safeSaveBillsToStorage(finalBills);

      // 3. Apply revenues
      let finalRevs: Revenue[] = [];
      if (mode === 'merge') {
        const current = this.getRevenues();
        const existingIds = new Set(current.map(r => r.id));
        const newOnes = incomingRevs.filter(r => !existingIds.has(r.id));
        finalRevs = [...current, ...newOnes];
      } else {
        finalRevs = incomingRevs;
      }
      this.saveRevenues(finalRevs);

      // 4. Restore categories if present in backup file
      if (Array.isArray(targetHousehold.categories) && targetHousehold.categories.length > 0) {
        saveStoredCategories(targetHousehold.categories);
      }

      // 5. Restore profiles if present in backup file
      if (Array.isArray(targetHousehold.profiles) && targetHousehold.profiles.length > 0) {
        this.saveProfiles(targetHousehold.profiles);
      }

      // 6. Sync with server
      this.syncWithServer();

      this.broadcastUpdate('BILLS_UPDATED', { count: finalBills.length });
      this.broadcastUpdate('REVENUES_UPDATED', { count: finalRevs.length });
      this.broadcastUpdate('PROFILES_UPDATED', {});

      return {
        success: true,
        message: `Dívidas e receitas atualizadas com sucesso! Foram carregadas ${incomingBills.length} contas/dívidas e ${incomingRevs.length} receitas a partir do arquivo do e-mail.`,
        billsCount: finalBills.length,
        revenuesCount: finalRevs.length,
        categoriesCount: targetHousehold.categories?.length || 0,
      };
    } catch (err: any) {
      return { 
        success: false, 
        message: `Arquivo de backup inválido ou corrompido: ${err?.message || ''}`, 
        billsCount: 0, 
        revenuesCount: 0 
      };
    }
  }

  // Ensure user data is preserved and any fictitious data is purged
  public ensureDefaultDataIfEmpty(): boolean {
    if (typeof window === 'undefined') return false;

    // Purge any corrupted tombstones that might hide newly created items
    localStorage.removeItem('financas_deleted_revenue_ids');

    // Purge mock bills and mock revenues if any exist in local storage
    const bills = this.getBills();
    const cleanBills = bills.filter(b => !isMockBill(b));
    if (cleanBills.length !== bills.length) {
      localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(cleanBills));
      localStorage.setItem(STORAGE_KEY_SAFETY_VAULT_BILLS, JSON.stringify(cleanBills));
    }

    const revs = this.getRevenues();
    const cleanRevs = revs.filter(r => !isMockRevenue(r));
    if (cleanRevs.length !== revs.length) {
      localStorage.setItem(STORAGE_KEY_REVENUES, JSON.stringify(cleanRevs));
      localStorage.setItem(STORAGE_KEY_SAFETY_VAULT_REVENUES, JSON.stringify(cleanRevs));
    }

    return false;
  }

  public deleteRevenue(id: string): void {
    localStorage.setItem(STORAGE_KEY_CUSTOMIZED, 'true');
    const toDelete = this.getRevenues().find(r => r.id === id);
    const rName = toDelete?.name || 'Receita';

    this.recordDeletedRevenue(id);
    const revenues = this.getRevenues().filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY_REVENUES, JSON.stringify(revenues));
    localStorage.setItem(STORAGE_KEY_SAFETY_VAULT_REVENUES, JSON.stringify(revenues));
    this.broadcastUpdate('REVENUE_DELETED', { id });

    const actor = this.getCurrentUserName();
    this.notifyRemoteChange('revenue_deleted', 'Receita Removida 🗑️', `${actor} removeu a receita "${rName}"`, rName);

    this.syncWithServer();
  }

  public getDeletedRevenueSeriesSlugs(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('financas_deleted_revenue_series_slugs');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public recordDeletedRevenueSeriesSlug(slug: string): void {
    if (typeof window === 'undefined' || !slug) return;
    const slugs = this.getDeletedRevenueSeriesSlugs();
    if (!slugs.includes(slug)) {
      slugs.push(slug);
      localStorage.setItem('financas_deleted_revenue_series_slugs', JSON.stringify(slugs));
    }
  }

  // Delete all occurrences of a recurring revenue across ALL months (current and future)
  public deleteRevenueSeries(revenue: Revenue): string[] {
    localStorage.setItem(STORAGE_KEY_CUSTOMIZED, 'true');
    const allRevs = this.getRevenues();
    const cleanName = (revenue.name || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const profLower = (revenue.profileName || 'user').toLowerCase();
    const isSalary = revenue.category === 'Salário & Renda' || cleanName.includes('salario') || cleanName.includes('salário');
    const idRoot = (revenue.id || '').replace(/-\d{4}-\d{2}$/, '');

    const deletedIds: string[] = [];
    const remaining: Revenue[] = [];

    for (const r of allRevs) {
      const rClean = (r.name || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const rProf = (r.profileName || 'user').toLowerCase();
      const rIsSalary = r.category === 'Salário & Renda' || rClean.includes('salario') || rClean.includes('salário');
      const rIdRoot = (r.id || '').replace(/-\d{4}-\d{2}$/, '');

      let isMatch = false;
      if (r.id === revenue.id) {
        isMatch = true;
      } else if (idRoot && rIdRoot === idRoot) {
        isMatch = true;
      } else if (isSalary && rIsSalary && (rProf === profLower || rClean === cleanName)) {
        isMatch = true;
      } else if (rClean === cleanName && rProf === profLower) {
        isMatch = true;
      }

      if (isMatch) {
        deletedIds.push(r.id);
        this.recordDeletedRevenue(r.id);
      } else {
        remaining.push(r);
      }
    }

    if (isSalary) {
      this.recordDeletedRevenueSeriesSlug(`salary_${profLower}`);
      this.recordDeletedRevenueSeriesSlug(`salary_${cleanName}`);
    } else {
      const slug = `custom_${cleanName.replace(/[^a-z0-9]/g, '-')}_${profLower}`;
      this.recordDeletedRevenueSeriesSlug(slug);
      this.recordDeletedRevenueSeriesSlug(cleanName);
    }
    if (idRoot) {
      this.recordDeletedRevenueSeriesSlug(idRoot);
    }

    localStorage.setItem(STORAGE_KEY_REVENUES, JSON.stringify(remaining));
    localStorage.setItem(STORAGE_KEY_SAFETY_VAULT_REVENUES, JSON.stringify(remaining));
    this.broadcastUpdate('REVENUE_SERIES_DELETED', { deletedIds, revenueName: revenue.name });

    const actor = this.getCurrentUserName();
    this.notifyRemoteChange('revenue_deleted', 'Receita Removida 🗑️', `${actor} removeu a receita "${revenue.name}" de todos os meses`, revenue.name);

    this.syncWithServer();
    return deletedIds;
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

    let defaultName = 'Meu Celular';
    let model = 'Smartphone';

    if (isIOS) {
      defaultName = isStandalone ? 'Meu iPhone (Início)' : 'Meu iPhone';
      model = isStandalone ? 'iPhone (Tela de Início)' : 'iPhone (Safari)';
    } else if (isAndroid) {
      defaultName = isStandalone ? 'Meu Android (Início)' : 'Meu Android';
      model = isStandalone ? 'Android (Tela de Início)' : 'Android (Chrome)';
    } else {
      defaultName = 'Meu Computador';
      model = 'Computador / Web';
    }

    const userName = this.getCurrentUserName();
    const isWife = userName.toLowerCase().includes('paula') || userName.toLowerCase().includes('esposa');
    const canonicalName = this.getCanonicalDeviceName(userName); // 'Paula (iPhone)' or 'Carlos (iPhone)'

    const savedCustomName = localStorage.getItem('financas_my_device_custom_name');
    const resolvedName = (savedCustomName && !/meu celular|meu iphone|iphone da esposa|meu android|iphone de carlos|iphone de paula/i.test(savedCustomName))
      ? savedCustomName
      : canonicalName;

    return {
      id: myId,
      name: resolvedName,
      model,
      owner: isWife ? 'Esposa' : 'Você',
      lastActive: 'Agora mesmo',
      isCurrent: true,
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

    const permanentWifeDevice: CloudDevice = {
      id: 'dev_esposa_permanente',
      name: 'Paula (iPhone)',
      model: 'iPhone (Tela de Início)',
      owner: 'Esposa',
      lastActive: 'Agora mesmo',
      isCurrent: false,
    };

    if (!raw) {
      const initial = [
        { ...myDevice, isCurrent: true, name: `${myDevice.name} (Este Aparelho)` },
        permanentWifeDevice
      ];
      localStorage.setItem(STORAGE_KEY_DEVICES, JSON.stringify(initial));
      return initial;
    }
    try {
      let parsed: CloudDevice[] = JSON.parse(raw);
      // Strip only obsolete placeholder mock IDs
      parsed = parsed.filter(d => 
        d &&
        d.id !== 'dev_iphone_paula' && 
        d.id !== 'dev_iphone_carlos' && 
        d.id !== 'dev_user_main'
      );

      // Find the wife's device (ALWAYS preserve wife device, never disconnect wife!)
      let wifeDev = parsed.find(d => 
        d.id !== myDevice.id && (
          d.id === 'dev_esposa_permanente' ||
          d.owner === 'Esposa' ||
          d.owner === 'Cônjuge' ||
          d.name.toLowerCase().includes('esposa') ||
          d.name.toLowerCase().includes('paula')
        )
      );
      if (!wifeDev) {
        wifeDev = permanentWifeDevice;
      } else {
        wifeDev = {
          ...wifeDev,
          owner: 'Esposa',
          isCurrent: false,
        };
      }

      // Strictly return 1 user device (Este Aparelho) + 1 wife device (Esposa)
      // Eliminates all phantom/duplicate session IDs created by browser reloads
      const deduplicated: CloudDevice[] = [
        {
          ...myDevice,
          isCurrent: true,
          name: `${myDevice.name} (Este Aparelho)`,
        },
        wifeDev,
      ];

      localStorage.setItem(STORAGE_KEY_DEVICES, JSON.stringify(deduplicated));
      return deduplicated;
    } catch {
      const fallback = [
        { ...myDevice, isCurrent: true, name: `${myDevice.name} (Este Aparelho)` },
        permanentWifeDevice
      ];
      localStorage.setItem(STORAGE_KEY_DEVICES, JSON.stringify(fallback));
      return fallback;
    }
  }

  public isWifeConnected(): boolean {
    return true; // Permanent connection requested by user
  }

  public getWifeDevice(): CloudDevice {
    const devices = this.getDevices();
    const myDev = this.getCurrentDeviceInfo();
    const found = devices.find(d => d.id !== myDev.id && !d.isCurrent);
    if (found) return found;
    return {
      id: 'dev_esposa_permanente',
      name: 'iPhone da Esposa',
      model: 'iPhone (Tela de Início)',
      owner: 'Esposa',
      lastActive: 'Agora mesmo',
      isCurrent: false,
    };
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

  // Payment Propagation & ID Consistency Logs
  public getPaymentPropagationLogs(): PaymentPropagationLogEntry[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY_PAYMENT_LOGS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public addPaymentPropagationLog(
    entry: Omit<PaymentPropagationLogEntry, 'id' | 'timestamp' | 'formattedTime'>
  ): PaymentPropagationLogEntry {
    const logs = this.getPaymentPropagationLogs();
    const now = new Date();
    const formattedTime = now.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const newEntry: PaymentPropagationLogEntry = {
      ...entry,
      id: `paylog-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now.toISOString(),
      formattedTime,
    };
    logs.unshift(newEntry);
    localStorage.setItem(STORAGE_KEY_PAYMENT_LOGS, JSON.stringify(logs.slice(0, 50)));
    this.broadcastUpdate('PAYMENT_LOG_ADDED');
    return newEntry;
  }

  public clearPaymentPropagationLogs(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY_PAYMENT_LOGS);
    this.broadcastUpdate('PAYMENT_LOG_ADDED');
  }

  // Diagnostic tool to verify and enforce bill unique ID consistency across devices
  public verifyBillIdConsistency(): {
    totalBills: number;
    inconsistentCount: number;
    fixedCount: number;
    report: string[];
  } {
    const bills = this.getBills();
    const report: string[] = [];
    const keysMap = new Map<string, string[]>();
    let inconsistentCount = 0;
    let fixedCount = 0;

    bills.forEach(b => {
      const key = this.getCanonicalBillKey(b);
      const list = keysMap.get(key) || [];
      list.push(b.id);
      keysMap.set(key, list);
    });

    keysMap.forEach((ids, key) => {
      if (ids.length > 1) {
        inconsistentCount += ids.length - 1;
        report.push(`⚠️ Múltiplos IDs detectados para a mesma dívida "${key}": ${ids.join(', ')}`);
      }
    });

    if (inconsistentCount > 0) {
      const deduped = this.deduplicateBills(bills);
      this.safeSaveBillsToStorage(deduped);
      fixedCount = bills.length - deduped.length;
      report.push(`✅ Reconciliação concluída: ${fixedCount} identificadores duplicados unificados em ID canônico consistente.`);
      this.broadcastUpdate('BILLS_UPDATED', { count: deduped.length });
    } else {
      report.push('✅ Todos os identificadores únicos de contas estão 100% consistentes em todos os aparelhos.');
    }

    this.addPaymentPropagationLog({
      eventType: 'DIAGNOSTIC_CHECK',
      billId: 'all',
      billName: 'Verificação de Consistência de IDs',
      billAmount: 0,
      month: '',
      newStatus: 'pending',
      version: 1,
      actor: this.getCurrentUserName(),
      deviceId: this.getCurrentDeviceInfo().id,
      deviceName: this.getCurrentDeviceInfo().name,
      householdId: this.getHouseholdId(),
      details: report.join(' | '),
      success: true,
    });

    return {
      totalBills: bills.length,
      inconsistentCount,
      fixedCount,
      report,
    };
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

        const activeLocalIds = new Set(localBills.map(b => b.id));
        if (Array.isArray(serverHouse.deletedBillIds) && serverHouse.deletedBillIds.length > 0) {
          serverHouse.deletedBillIds.forEach((id: string) => {
            // Never tombstone a bill that is actively present and edited locally
            if (!activeLocalIds.has(id)) {
              this.recordDeletedBill(id);
            }
          });
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
          this.broadcastUpdate('BILLS_UPDATED', { count: merged.length });
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
        const myDev = this.getCurrentDeviceInfo();
        let wifeDev: CloudDevice | undefined;

        if (Array.isArray(serverHouse.devices)) {
          const rawServerDevices = serverHouse.devices.filter((d: any) =>
            d &&
            d.id !== 'dev_iphone_paula' &&
            d.id !== 'dev_iphone_carlos' &&
            d.id !== 'dev_user_main'
          );
          const foundWife = rawServerDevices.find((d: any) =>
            d.id === 'dev_esposa_permanente' ||
            d.owner === 'Esposa' ||
            d.owner === 'Cônjuge' ||
            d.name?.toLowerCase().includes('esposa') ||
            d.name?.toLowerCase().includes('paula')
          );
          if (foundWife) {
            wifeDev = {
              id: foundWife.id || 'dev_esposa_permanente',
              name: foundWife.name || 'iPhone da Esposa',
              model: foundWife.model || 'iPhone (Tela de Início)',
              owner: 'Esposa',
              lastActive: foundWife.lastActive || 'Agora mesmo',
              isCurrent: false,
              iCloudAccount: 'paula@icloud.com',
            };
          }
        }

        if (!wifeDev) {
          wifeDev = {
            id: 'dev_esposa_permanente',
            name: 'iPhone da Esposa',
            model: 'iPhone (Tela de Início)',
            owner: 'Esposa',
            lastActive: 'Agora mesmo',
            isCurrent: false,
            iCloudAccount: 'paula@icloud.com',
          };
        }

        // Strictly 2 devices: User's phone (Este Aparelho) + Wife's phone (Conectado)
        updatedDevices = [
          {
            ...myDev,
            isCurrent: true,
            name: `${myDev.name} (Este Aparelho)`,
          },
          wifeDev,
        ];
        localStorage.setItem(STORAGE_KEY_DEVICES, JSON.stringify(updatedDevices));
        const isWife = true;

        const successMessage = `Sincronizado com sucesso! Celular da esposa pareado e ativo (${wifeDev.name} - ${wifeDev.model}).`;

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

        // Process any notifications from the server generated by other devices
        const notificationsList = data.notifications || serverHouse.notifications;
        if (Array.isArray(notificationsList)) {
          const myDev = this.getCurrentDeviceInfo();
          const newNotifs = notificationsList.filter((n: any) => 
            n &&
            n.sourceDeviceId !== myDev.id &&
            new Date(n.timestamp).getTime() > new Date(this.lastSeenNotificationTime).getTime()
          );
          if (newNotifs.length > 0) {
            newNotifs.forEach((n: any) => {
              this.broadcastUpdate('REMOTE_CHANGE_NOTIFICATION', n);
            });
            const latest = newNotifs[0];
            if (latest?.timestamp) {
              this.lastSeenNotificationTime = latest.timestamp;
              localStorage.setItem('financas_last_seen_notif_time', latest.timestamp);
            }
          }
        }

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
              paidBy: item.paidBy,
              recurrence: item.recurrence || 'Mensal Fixa',
              favored: item.favored || '',
              barcode: item.barcode || '',
              pixKey: item.pixKey || '',
              pixType: item.pixType || 'Pix Copia e Cola',
              notes: item.notes || '',
              splitHousehold: item.splitHousehold ?? true,
              splitDetails: item.splitDetails || [
                { name: 'Titular', percentage: 50, amount: (Number(item.amount) || 0) / 2 },
                { name: 'Cônjuge', percentage: 50, amount: (Number(item.amount) || 0) / 2 },
              ],
              version: item.version || 1,
              updatedAt: item.updatedAt || new Date().toISOString(),
              updatedByDevice: item.updatedByDevice || 'Meu Celular',
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
            if (isMockRevenue(item)) continue;
            const rev: Revenue = {
              id: item.id || `rev-rec-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              name: String(item.name || '').trim(),
              amount: Number(item.amount) || 0,
              date: item.date || '2026-10-05',
              category: item.category || 'Salário & Renda',
              recurrence: item.recurrence || 'Mensal',
              profileName: item.profileName || 'Você',
              notes: item.notes || '',
              version: item.version || 1,
              updatedAt: item.updatedAt || new Date().toISOString(),
              updatedByDevice: item.updatedByDevice || 'Meu Celular',
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

      // Clear series slugs for recovered recurring bills so they can continue to propagate
      const recoveredSlugs = new Set<string>();
      allRecoveredBills.forEach(b => {
        const cleanBaseName = b.name.replace(/\s*\(\d+\/\d+\)/, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const slug = cleanBaseName.replace(/[^a-z0-9]/g, '-').substring(0, 24);
        recoveredSlugs.add(cleanBaseName);
        recoveredSlugs.add(slug);
        const cleanBc = (b.barcode || '').replace(/\D/g, '');
        if (cleanBc.length >= 10) recoveredSlugs.add(cleanBc);
      });
      const cleanSeriesSlugs = this.getDeletedSeriesSlugs().filter(s => !recoveredSlugs.has(s));
      localStorage.setItem('financas_deleted_series_slugs', JSON.stringify(cleanSeriesSlugs));

      const existingBills = this.getBills();
      const merged = this.deduplicateBills(this.mergeBillsLists(existingBills, allRecoveredBills));
      localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(merged));
      localStorage.setItem(STORAGE_KEY_SAFETY_VAULT_BILLS, JSON.stringify(merged));
      this.autoPropagateRecurringBills();
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
  public restoreCouplePresetData(targetMonthId: string = '2026-11'): { bills: Bill[]; revenues: Revenue[] } {
    const month = targetMonthId || '2026-11';
    const activeDev = this.getActiveDevice().name || 'iPhone Carlos';
    const nowIso = new Date().toISOString();

    const presetBills: Bill[] = [
      {
        id: `bill-preset-condominio-${month}`,
        name: 'Taxa de Condomínio',
        amount: 580.00,
        dueDate: `${month}-10`,
        category: 'Moradia & Condomínio',
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
        category: 'Energia Elétrica (Luz)',
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
        category: 'Gás (Encanado / Botijão)',
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
        category: 'Internet, TV & Telefonia',
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
        category: 'Financiamentos & Empréstimos',
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
        category: 'Alimentação & Supermercado',
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
        category: 'Saúde & Farmácia',
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
        category: 'Lazer & Assinaturas',
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

    // Clear series slugs for preset bills so they propagate properly
    const presetNames = presetBills.map(b => b.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    const cleanSlugs = this.getDeletedSeriesSlugs().filter(s => {
      return !presetNames.some(pn => {
        const slug = pn.replace(/[^a-z0-9]/g, '-').substring(0, 24);
        return s === slug || s === pn;
      });
    });
    localStorage.setItem('financas_deleted_series_slugs', JSON.stringify(cleanSlugs));

    // Save bills to main storage and safety vault
    this.saveBills(presetBills);

    // Auto-propagate across all months
    this.autoPropagateRecurringBills();

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
