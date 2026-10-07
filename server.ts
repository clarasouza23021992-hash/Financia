import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

interface CloudDeviceRecord {
  id: string;
  name: string;
  model: string;
  owner: string;
  lastActive: string;
  isCurrent?: boolean;
  ipAddress?: string;
  userAgent?: string;
  connectedAt?: string;
}

export interface ChangeNotification {
  id: string;
  householdId: string;
  sourceDeviceId: string;
  sourceDeviceName: string;
  sourceUserName: string;
  actionType: string;
  title: string;
  message: string;
  targetItemName?: string;
  amount?: number;
  timestamp: string;
}

interface HouseholdData {
  id: string;
  name: string;
  code: string;
  bills: any[];
  revenues: any[];
  profiles: any[];
  devices: CloudDeviceRecord[];
  isWifeConnected?: boolean;
  lastUpdated: string;
  deletedBillIds?: string[];
  deletedRevenueIds?: string[];
  notifications?: ChangeNotification[];
}

const portArgIndex = process.argv.indexOf('--port');
const cliPort = portArgIndex !== -1 && process.argv[portArgIndex + 1] ? parseInt(process.argv[portArgIndex + 1], 10) : undefined;
const PORT = cliPort || 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'households.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

// Ensure data folder and backups folder exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// Filter out only explicitly marked mock/demo seed items or invented bills, NEVER real user bills
function isMockBillServer(b: any): boolean {
  if (!b) return true;
  if (b.isMockSeed === true || b.isDemoPlaceholder === true) return true;
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
  // Remove any bills migrated from revenue and salary items so salaries never count towards debts!
  if (id.startsWith('bill-migrated-') || (b.notes && b.notes.includes('Transferido automaticamente para Dívidas'))) {
    return true;
  }
  if (b.category === 'Salário & Renda') return true;
  const lowerName = String(b.name || '').toLowerCase();
  if (lowerName.includes('salário') || lowerName.includes('salario')) return true;
  return false;
}

// Filter out only explicitly marked mock/demo seed revenues
function isMockRevenueServer(r: any): boolean {
  if (!r) return true;
  if (r.isMockSeed === true || r.isDemoPlaceholder === true) return true;
  const id = String(r.id || '');
  if (id.startsWith('rev-mock-') || id.startsWith('rev-sample-')) {
    return true;
  }
  return false;
}

function loadHouseholds(): Record<string, HouseholdData> {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const store: Record<string, HouseholdData> = JSON.parse(raw);
      // Clean mock bills and mock revenues from all households
      let changed = false;
      Object.keys(store).forEach(k => {
        const h = store[k];
        if (h && Array.isArray(h.bills)) {
          const originalLen = h.bills.length;
          h.bills = h.bills.filter((b: any) => !isMockBillServer(b));
          if (h.bills.length !== originalLen) changed = true;
        }
        if (h && Array.isArray(h.revenues)) {
          const originalRevLen = h.revenues.length;
          h.revenues = h.revenues.filter((r: any) => !isMockRevenueServer(r));
          if (h.revenues.length !== originalRevLen) changed = true;
        }
      });
      if (changed) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
      }
      return store;
    }
  } catch (err) {
    console.error('Error reading households file:', err);
  }
  return {};
}

function saveHouseholds(data: Record<string, HouseholdData>) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving households file:', err);
  }
}

function normalizeBillTitleServer(name: string): string {
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
}

function parseInstallmentDetailsServer(name: string, b?: any): { baseName: string; instNum?: number; totalInst?: number } {
  const norm = normalizeBillTitleServer(name);

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
}

// Server-side bill deduplication to eliminate duplicate bills and phantom 0.00 records
function deduplicateBillsServer(bills: any[], deletedIds: string[] = []): { bills: any[]; deletedIds: string[] } {
  if (!Array.isArray(bills)) return { bills: [], deletedIds };
  const deletedSet = new Set(deletedIds);
  const map = new Map<string, any>();
  const extraDeleted: string[] = [];

  // Pre-pass: sanitize false 'paid' statuses, clear corrupted paymentMonth, and distribute collided installments
  let preProcessed = bills.filter(b => b && b.id && !isMockBillServer(b) && !deletedSet.has(b.id)).map(b => {
    const isAutoMigrated = b.id.startsWith('bill-migrated-') || (b.notes && b.notes.includes('Transferido automaticamente para Dívidas'));
    const isPreset = b.id.startsWith('bill-preset-') || b.id.startsWith('bill-streaming-') || b.id === 'bill-gas-pago' || b.id.startsWith('bill-condo-');
    let status = b.status;
    let paidAt = b.paidAt;
    let paidBy = b.paidBy;

    // Reset false paid status if debt has no receipt and was marked by Carlos/Paula or seed/preset
    const isMockPaid = paidBy === 'Carlos' || paidBy === 'Paula' || isPreset || isAutoMigrated;
    if ((isMockPaid || !b.receiptUrl) && status === 'paid' && (!paidAt || isMockPaid)) {
      status = 'pending';
      paidAt = undefined;
      paidBy = undefined;
    }

    const dueMonth = (b.dueDate || '').substring(0, 7);
    const { instNum, totalInst } = parseInstallmentDetailsServer(b.name, b);
    const isInstallment = b.recurrence === 'Parcelada' || Boolean(instNum && instNum > 0) || (totalInst && totalInst > 1);
    const isPropagated = Boolean(b.parentRecurringId || (b.id && b.id.startsWith('rec_')));
    let paymentMonth = b.paymentMonth;

    // Installments MUST strictly belong to their own due date month
    if (isInstallment || isPropagated) {
      paymentMonth = undefined;
    } else if (paymentMonth && paymentMonth === dueMonth) {
      paymentMonth = undefined;
    }

    return {
      ...b,
      status,
      paidAt,
      paidBy,
      paymentMonth,
    };
  });

  // Spread collided installments across consecutive months
  const installmentGroups = new Map<string, any[]>();
  preProcessed.forEach(b => {
    const { baseName, instNum, totalInst } = parseInstallmentDetailsServer(b.name, b);
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
        const numA = a.installmentNumber || parseInstallmentDetailsServer(a.name, a).instNum || 1;
        const numB = b.installmentNumber || parseInstallmentDetailsServer(b.name, b).instNum || 1;
        return numA - numB;
      });

      const firstBill = groupBills[0];
      const firstDue = firstBill.dueDate || '2026-10-10';
      const [baseYearStr, baseMonthStr, baseDayStr] = firstDue.split('-');
      const baseYear = parseInt(baseYearStr, 10) || 2026;
      const baseMonth = parseInt(baseMonthStr, 10) || 10;
      const baseDay = parseInt(baseDayStr, 10) || 10;
      const firstInstNum = firstBill.installmentNumber || parseInstallmentDetailsServer(firstBill.name, firstBill).instNum || 1;

      groupBills.forEach(b => {
        const instNum = b.installmentNumber || parseInstallmentDetailsServer(b.name, b).instNum || 1;
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

  for (const b of preProcessed) {
    if (!b || !b.id || deletedSet.has(b.id)) continue;

    const month = (b.dueDate || '').substring(0, 7) || '2026-10';
    const cleanBarcode = (b.barcode || '').replace(/\D/g, '');
    const { baseName, instNum } = parseInstallmentDetailsServer(b.name, b);
    const isInstallment = b.recurrence === 'Parcelada' || Boolean(instNum) || Boolean(b.installmentNumber);

    let key: string;
    if (cleanBarcode.length >= 10) {
      key = `barcode_${month}_${cleanBarcode}`;
    } else if (isInstallment) {
      const num = instNum || b.installmentNumber || 1;
      key = `inst_${month}_${baseName}_${num}`;
    } else {
      key = `name_${month}_${baseName}`;
    }

    if (map.has(key)) {
      const existing = map.get(key);
      let keepIncoming = false;

      const isMigratedB = b.id.startsWith('bill-migrated-') || (b.notes && b.notes.includes('Transferido automaticamente'));
      const isMigratedE = existing.id.startsWith('bill-migrated-') || (existing.notes && existing.notes.includes('Transferido automaticamente'));

      if (isMigratedB && !isMigratedE) {
        keepIncoming = false;
      } else if (!isMigratedB && isMigratedE) {
        keepIncoming = true;
      } else if (b.receiptUrl && !existing.receiptUrl) {
        keepIncoming = true;
      } else if (existing.receiptUrl && !b.receiptUrl) {
        keepIncoming = false;
      } else if (b.status === 'paid' && existing.status !== 'paid' && b.receiptUrl) {
        // Only prioritize paid status if verified by attached receipt proof
        keepIncoming = true;
      } else if (existing.status === 'paid' && b.status !== 'paid' && !existing.receiptUrl) {
        // Revert unverified paid status in favor of user's pending bill
        keepIncoming = true;
      } else if (b.isProjected && !existing.isProjected) {
        keepIncoming = false;
      } else if (!b.isProjected && existing.isProjected) {
        keepIncoming = true;
      } else if (b.id.startsWith('bill-rec-') && !existing.id.startsWith('bill-rec-')) {
        keepIncoming = false;
      } else if (!b.id.startsWith('bill-rec-') && existing.id.startsWith('bill-rec-')) {
        keepIncoming = true;
      } else if ((b.amount || 0) > 0 && (existing.amount || 0) === 0) {
        keepIncoming = true;
      } else if ((existing.amount || 0) > 0 && (b.amount || 0) === 0) {
        keepIncoming = false;
      } else {
        const bVer = b.version || 1;
        const eVer = existing.version || 1;
        if (bVer > eVer) {
          keepIncoming = true;
        } else {
          const bTime = new Date(b.updatedAt || 0).getTime();
          const eTime = new Date(existing.updatedAt || 0).getTime();
          if (bTime > eTime) keepIncoming = true;
        }
      }

      if (keepIncoming) {
        extraDeleted.push(existing.id);
        deletedSet.add(existing.id);
        map.set(key, b);
      } else {
        extraDeleted.push(b.id);
        deletedSet.add(b.id);
      }
    } else {
      map.set(key, b);
    }
  }

  // Cross-month cleanup: only for moved/rescheduled one-time pontual bills
  const list = Array.from(map.values());
  const finalList: any[] = [];
  
  for (const b of list) {
    // CRITICAL: Recurring bills ('Mensal Fixa') and installment bills ('Parcelada') legitimately exist in multiple months!
    if (b.recurrence === 'Mensal Fixa' || b.recurrence === 'Parcelada' || b.fixedValueType) {
      finalList.push(b);
      continue;
    }

    const bMonth = (b.paymentMonth && /^\d{4}-\d{2}$/.test(b.paymentMonth)) ? b.paymentMonth : (b.dueDate || '').substring(0, 7);
    const bName = normalizeBillTitleServer(b.name);
    const bBarcode = (b.barcode || '').replace(/\D/g, '');

    // Check if there is a newer scheduled version of this single pontual bill in a later month
    const hasLaterMonthVersion = list.some(other => {
      if (other.id === b.id) return false;
      if (other.recurrence === 'Mensal Fixa' || other.recurrence === 'Parcelada' || other.fixedValueType) return false;
      const otherMonth = (other.paymentMonth && /^\d{4}-\d{2}$/.test(other.paymentMonth)) ? other.paymentMonth : (other.dueDate || '').substring(0, 7);
      if (otherMonth <= bMonth) return false;
      const otherBarcode = (other.barcode || '').replace(/\D/g, '');
      if (bBarcode.length >= 10 && otherBarcode === bBarcode) return true;
      return normalizeBillTitleServer(other.name) === bName && (b.id.startsWith('bill-carried-') || b.isCarriedOver);
    });

    if (hasLaterMonthVersion) {
      extraDeleted.push(b.id);
      deletedSet.add(b.id);
    } else {
      finalList.push(b);
    }
  }

  return { bills: finalList, deletedIds: Array.from(deletedSet) };
}

// Server-side revenue deduplication to eliminate duplicate salaries
function deduplicateRevenuesServer(revs: any[], deletedIds: string[] = []): any[] {
  if (!Array.isArray(revs)) return [];

  const map = new Map<string, any>();
  for (const r of revs) {
    if (!r || !r.id || isMockRevenueServer(r)) continue;
    if (deletedIds.includes(r.id)) continue;

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
      const incVersion = r.version || 0;
      const curVersion = existing.version || 0;
      const incUpdated = new Date(r.updatedAt || 0).getTime();
      const curUpdated = new Date(existing.updatedAt || 0).getTime();

      let keepIncoming = false;
      if ((r.amount || 0) > 0 && (existing.amount || 0) === 0) {
        keepIncoming = true;
      } else if ((existing.amount || 0) > 0 && (r.amount || 0) === 0) {
        keepIncoming = false;
      } else if (incVersion > curVersion || incUpdated >= curUpdated) {
        keepIncoming = true;
      }

      if (keepIncoming) {
        map.set(key, r);
      }
    }
  }

  return Array.from(map.values());
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  interface WebSocketClient {
    ws: WebSocket;
    householdId: string;
    deviceId: string;
    deviceName: string;
    userName: string;
    isAlive: boolean;
  }

  const wsClients = new Set<WebSocketClient>();

  const broadcastChangeNotification = (householdId: string, notif: ChangeNotification) => {
    const cleanHouseId = householdId.trim().toLowerCase();
    const payload = JSON.stringify({
      type: 'CHANGE_NOTIFICATION',
      notification: notif,
    });

    wsClients.forEach((client) => {
      if (
        client.ws.readyState === WebSocket.OPEN &&
        client.householdId === cleanHouseId &&
        client.deviceId !== notif.sourceDeviceId
      ) {
        try {
          client.ws.send(payload);
        } catch (err) {
          console.error('Error sending WS notification to client:', err);
        }
      }
    });
  };

  const recordChangeNotification = (householdId: string, params: {
    sourceDeviceId: string;
    sourceDeviceName?: string;
    sourceUserName?: string;
    actionType: string;
    title: string;
    message: string;
    targetItemName?: string;
    amount?: number;
  }): ChangeNotification => {
    const store = loadHouseholds();
    const cleanId = householdId.trim().toLowerCase();
    let household = store[cleanId];
    if (!household) {
      household = {
        id: cleanId,
        name: 'Minha Casa',
        code: cleanId.toUpperCase(),
        bills: [],
        revenues: [],
        profiles: [],
        devices: [],
        notifications: [],
        lastUpdated: new Date().toISOString(),
      };
    }
    if (!Array.isArray(household.notifications)) {
      household.notifications = [];
    }

    const notif: ChangeNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      householdId: cleanId,
      sourceDeviceId: params.sourceDeviceId,
      sourceDeviceName: params.sourceDeviceName || 'Smartphone',
      sourceUserName: params.sourceUserName || 'Morador',
      actionType: params.actionType,
      title: params.title,
      message: params.message,
      targetItemName: params.targetItemName,
      amount: params.amount,
      timestamp: new Date().toISOString(),
    };

    household.notifications.unshift(notif);
    if (household.notifications.length > 50) {
      household.notifications = household.notifications.slice(0, 50);
    }
    household.lastUpdated = notif.timestamp;
    store[cleanId] = household;
    saveHouseholds(store);
    return notif;
  };

  // WebSocket connection handler
  wss.on('connection', (ws) => {
    const clientState: WebSocketClient = {
      ws,
      householdId: 'casa-familia',
      deviceId: '',
      deviceName: '',
      userName: '',
      isAlive: true,
    };
    wsClients.add(clientState);

    ws.on('pong', () => {
      clientState.isAlive = true;
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'JOIN') {
          clientState.householdId = (msg.householdId || 'casa-familia').trim().toLowerCase();
          clientState.deviceId = msg.deviceId || '';
          clientState.deviceName = msg.deviceName || 'Smartphone';
          clientState.userName = msg.userName || 'Morador';

          ws.send(JSON.stringify({
            type: 'JOINED',
            householdId: clientState.householdId,
            timestamp: new Date().toISOString(),
          }));
        } else if (msg.type === 'NOTIFY_CHANGE') {
          const houseId = (msg.householdId || clientState.householdId).trim().toLowerCase();
          const notif = recordChangeNotification(houseId, {
            sourceDeviceId: msg.deviceId || clientState.deviceId,
            sourceDeviceName: msg.deviceName || clientState.deviceName,
            sourceUserName: msg.userName || clientState.userName,
            actionType: msg.actionType,
            title: msg.title,
            message: msg.message,
            targetItemName: msg.targetItemName,
            amount: msg.amount,
          });
          broadcastChangeNotification(houseId, notif);
        }
      } catch (err) {
        console.error('WS message error:', err);
      }
    });

    ws.on('close', () => {
      wsClients.delete(clientState);
    });

    ws.on('error', () => {
      wsClients.delete(clientState);
    });
  });

  const pingInterval = setInterval(() => {
    wsClients.forEach((client) => {
      if (!client.isAlive) {
        client.ws.terminate();
        wsClients.delete(client);
        return;
      }
      client.isAlive = false;
      client.ws.ping();
    });
  }, 25000);

  wss.on('close', () => {
    clearInterval(pingInterval);
  });

  app.use(express.json({ limit: '25mb' }));

  // API Health Check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Helper to deduplicate devices so ghost sessions don't pile up, while permanently keeping wife connected
  const deduplicateDevicesServer = (devices: CloudDeviceRecord[] = [], callerDevice?: any): CloudDeviceRecord[] => {
    const list = Array.isArray(devices) ? devices : [];
    const valid = list.filter(
      (d) =>
        d &&
        d.id !== 'dev_iphone_paula' &&
        d.id !== 'dev_iphone_carlos' &&
        d.id !== 'dev_user_main'
    );

    // Wife device (permanent connection)
    let wifeDev = valid.find(
      (d) =>
        d.id === 'dev_esposa_permanente' ||
        d.owner === 'Esposa' ||
        d.owner === 'Cônjuge' ||
        d.name?.toLowerCase().includes('esposa') ||
        d.name?.toLowerCase().includes('paula')
    );
    if (!wifeDev) {
      wifeDev = {
        id: 'dev_esposa_permanente',
        name: 'iPhone da Esposa',
        model: 'iPhone (Tela de Início)',
        owner: 'Esposa',
        lastActive: 'Agora mesmo',
        connectedAt: '2026-09-25T12:00:00.000Z',
      };
    }

    // User device: choose caller device or the most recent user device
    const userDevices = valid.filter((d) => d.id !== wifeDev!.id && d.owner !== 'Esposa' && !d.name?.toLowerCase().includes('esposa'));
    let activeUserDev: CloudDeviceRecord;
    if (callerDevice && callerDevice.id) {
      activeUserDev = {
        id: callerDevice.id,
        name: callerDevice.name || 'Meu iPhone (Início)',
        model: callerDevice.model || 'iPhone (Tela de Início)',
        owner: 'Você',
        lastActive: 'Agora mesmo',
        connectedAt: callerDevice.connectedAt || new Date().toISOString(),
      };
    } else if (userDevices.length > 0) {
      activeUserDev = userDevices[userDevices.length - 1];
    } else {
      activeUserDev = {
        id: 'dev_1790686586282_fecb4',
        name: 'Meu iPhone (Início)',
        model: 'iPhone (Tela de Início)',
        owner: 'Você',
        lastActive: 'Agora mesmo',
        connectedAt: new Date().toISOString(),
      };
    }

    return [activeUserDev, wifeDev];
  };

  // Helper to ensure wife device is permanently connected on any household
  const ensureWifeConnectedRecord = (household: HouseholdData) => {
    household.isWifeConnected = true;
    household.devices = deduplicateDevicesServer(household.devices);
  };

  // Get Household Data
  app.get('/api/household/:id', (req, res) => {
    const { id } = req.params;
    const cleanId = id.trim().toLowerCase();
    const store = loadHouseholds();
    const household = store[cleanId];

    if (!household) {
      return res.status(404).json({ error: 'Casa não encontrada' });
    }

    ensureWifeConnectedRecord(household);
    saveHouseholds(store);

    res.json({
      success: true,
      household,
      serverTime: new Date().toISOString(),
    });
  });

  // Sync Household (Push local changes and merge server data)
  app.post('/api/household/:id/sync', (req, res) => {
    const { id } = req.params;
    const cleanId = id.trim().toLowerCase();
    const { bills, revenues, profiles, device, clientTimestamp } = req.body;

    const store = loadHouseholds();
    let household = store[cleanId];

    const nowIso = new Date().toISOString();

    if (!household) {
      household = {
        id: cleanId,
        name: 'Minha Casa',
        code: cleanId.toUpperCase(),
        bills: Array.isArray(bills) ? bills : [],
        revenues: Array.isArray(revenues) ? revenues : [],
        profiles: Array.isArray(profiles) ? profiles : [],
        devices: [],
        lastUpdated: nowIso,
      };
    }

    // If forceReplace is requested (e.g. user purged old backups and debts), reset server store directly
    if (req.body.forceReplace === true) {
      household.bills = Array.isArray(bills) ? bills.filter((b: any) => !isMockBillServer(b)) : [];
      household.revenues = Array.isArray(revenues) ? revenues : [];
      household.deletedBillIds = [];
      household.deletedRevenueIds = [];
      household.lastUpdated = nowIso;
      saveHouseholds(store);
      return res.json({ success: true, household, timestamp: nowIso });
    }

    // Deduplicate devices: Keep strictly caller's active phone and permanently preserve wife's phone
    household.devices = deduplicateDevicesServer(household.devices, device);
    household.isWifeConnected = true;

    // Process deleted bills
    const { deletedBillIds, deletedRevenueIds } = req.body;
    if (!household.deletedBillIds) {
      household.deletedBillIds = [];
    }
    if (Array.isArray(deletedBillIds) && deletedBillIds.length > 0) {
      household.deletedBillIds = Array.from(new Set([...household.deletedBillIds, ...deletedBillIds]));
      household.bills = (household.bills || []).filter(
        (b: any) => !household.deletedBillIds?.includes(b.id)
      );
    }

    // Process deleted revenues
    if (!household.deletedRevenueIds) {
      household.deletedRevenueIds = [];
    }
    if (Array.isArray(deletedRevenueIds) && deletedRevenueIds.length > 0) {
      household.deletedRevenueIds = Array.from(new Set([...household.deletedRevenueIds, ...deletedRevenueIds]));
      household.revenues = (household.revenues || []).filter(
        (r: any) => !household.deletedRevenueIds?.includes(r.id)
      );
    }

    // Merge Bills (Take incoming or higher version/updatedAt)
    if (Array.isArray(bills) && bills.length > 0) {
      const billMap = new Map<string, any>();
      (household.bills || []).forEach((b: any) => {
        if (b && b.id) billMap.set(b.id, b);
      });

      bills.forEach((incoming: any) => {
        if (!incoming || !incoming.id) return;
        if (household.deletedBillIds && household.deletedBillIds.includes(incoming.id)) return;
        const current = billMap.get(incoming.id);
        if (!current) {
          billMap.set(incoming.id, incoming);
        } else {
          const incVersion = incoming.version || 0;
          const curVersion = current.version || 0;
          const incUpdated = new Date(incoming.updatedAt || 0).getTime();
          const curUpdated = new Date(current.updatedAt || 0).getTime();

          if (incVersion > curVersion || incUpdated >= curUpdated) {
            billMap.set(incoming.id, incoming);
          }
        }
      });

      const rawMerged = Array.from(billMap.values()).filter((b: any) => !isMockBillServer(b));
      const dedupResult = deduplicateBillsServer(rawMerged, household.deletedBillIds);
      household.bills = dedupResult.bills;
      household.deletedBillIds = dedupResult.deletedIds;
    } else if (Array.isArray(household.bills) && household.bills.length > 0) {
      const dedupResult = deduplicateBillsServer(household.bills, household.deletedBillIds);
      household.bills = dedupResult.bills;
      household.deletedBillIds = dedupResult.deletedIds;
    }

    // Merge Revenues
    if (Array.isArray(revenues) && revenues.length > 0) {
      // If user is actively sending a revenue, un-delete it so saving is never blocked
      const incomingIds = new Set(revenues.map((r: any) => r && r.id).filter(Boolean));
      if (household.deletedRevenueIds) {
        household.deletedRevenueIds = household.deletedRevenueIds.filter((id: string) => !incomingIds.has(id));
      }

      const revMap = new Map<string, any>();
      (household.revenues || []).forEach((r: any) => {
        if (r && r.id && !household.deletedRevenueIds?.includes(r.id)) {
          revMap.set(r.id, r);
        }
      });

      revenues.forEach((incoming: any) => {
        if (!incoming || !incoming.id) return;
        if (household.deletedRevenueIds && household.deletedRevenueIds.includes(incoming.id)) return;
        const current = revMap.get(incoming.id);
        if (!current) {
          revMap.set(incoming.id, incoming);
        } else {
          const incVersion = incoming.version || 0;
          const curVersion = current.version || 0;
          const incUpdated = new Date(incoming.updatedAt || 0).getTime();
          const curUpdated = new Date(current.updatedAt || 0).getTime();

          if ((incoming.amount || 0) > 0 && (current.amount || 0) === 0) {
            revMap.set(incoming.id, incoming);
          } else if (incVersion > curVersion || incUpdated >= curUpdated) {
            revMap.set(incoming.id, incoming);
          }
        }
      });

      const mergedList = Array.from(revMap.values());
      household.revenues = deduplicateRevenuesServer(mergedList, household.deletedRevenueIds);
    } else if (Array.isArray(household.revenues) && household.revenues.length > 0) {
      household.revenues = deduplicateRevenuesServer(household.revenues, household.deletedRevenueIds);
    }

    // Update Profiles if provided
    if (Array.isArray(profiles) && profiles.length > 0) {
      household.profiles = profiles;
    }

    ensureWifeConnectedRecord(household);

    if (req.body.changeEvent) {
      const ce = req.body.changeEvent;
      const notif = recordChangeNotification(cleanId, {
        sourceDeviceId: (device && device.id) || ce.deviceId || 'unknown_dev',
        sourceDeviceName: (device && device.name) || ce.deviceName || 'Smartphone',
        sourceUserName: (device && device.owner) || ce.userName || 'Morador',
        actionType: ce.actionType,
        title: ce.title,
        message: ce.message,
        targetItemName: ce.targetItemName,
        amount: ce.amount,
      });
      broadcastChangeNotification(cleanId, notif);
    }

    household.lastUpdated = nowIso;
    store[cleanId] = household;
    saveHouseholds(store);

    res.json({
      success: true,
      household,
      notifications: household.notifications || [],
      serverTime: nowIso,
    });
  });

  // Send a change notification directly via REST
  app.post('/api/household/:id/notify-change', (req, res) => {
    const { id } = req.params;
    const { deviceId, deviceName, userName, actionType, title, message, targetItemName, amount } = req.body;
    if (!actionType || !title) {
      return res.status(400).json({ error: 'Dados insuficientes para notificação' });
    }
    const cleanId = id.trim().toLowerCase();
    const notif = recordChangeNotification(cleanId, {
      sourceDeviceId: deviceId || 'unknown_dev',
      sourceDeviceName: deviceName || 'Smartphone',
      sourceUserName: userName || 'Morador',
      actionType,
      title,
      message: message || '',
      targetItemName,
      amount,
    });
    broadcastChangeNotification(cleanId, notif);
    res.json({ success: true, notification: notif });
  });

  // Get notifications for household
  app.get('/api/household/:id/notifications', (req, res) => {
    const { id } = req.params;
    const { since, excludeDeviceId } = req.query;
    const store = loadHouseholds();
    const cleanId = id.trim().toLowerCase();
    const household = store[cleanId];
    if (!household) {
      return res.json({ success: true, notifications: [] });
    }
    let notifs = household.notifications || [];
    if (excludeDeviceId) {
      notifs = notifs.filter((n) => n.sourceDeviceId !== excludeDeviceId);
    }
    if (since) {
      const sinceTime = new Date(String(since)).getTime();
      notifs = notifs.filter((n) => new Date(n.timestamp).getTime() > sinceTime);
    }
    res.json({ success: true, notifications: notifs });
  });

  // Remove a device from household
  app.post('/api/household/:id/devices/remove', (req, res) => {
    const { id } = req.params;
    const { deviceId } = req.body;
    const cleanId = id.trim().toLowerCase();

    const store = loadHouseholds();
    const household = store[cleanId];

    if (!household) {
      return res.status(404).json({ error: 'Casa não encontrada' });
    }

    if (deviceId) {
      household.devices = (household.devices || []).filter((d) => d.id !== deviceId);
      household.lastUpdated = new Date().toISOString();
      store[cleanId] = household;
      saveHouseholds(store);
    }

    res.json({ success: true, devices: household.devices });
  });

  // ==========================================
  // BACKUP & RESTORE API ENDPOINTS
  // ==========================================

  // 1. Create a full backup snapshot
  app.post('/api/backup/create', (req, res) => {
    try {
      const { householdId, userEmail, clientData, notes } = req.body;
      const cleanHouseId = (householdId || 'default').trim().toLowerCase();
      const store = loadHouseholds();
      const household = store[cleanHouseId] || {
        id: cleanHouseId,
        name: 'Minha Casa',
        bills: [],
        revenues: [],
        profiles: [],
        devices: [],
        lastUpdated: new Date().toISOString(),
      };

      const realBills = (clientData?.bills || household.bills || []).filter((b: any) => !isMockBillServer(b));
      const realRevs = (clientData?.revenues || household.revenues || []).filter((r: any) => !isMockRevenueServer(r));

      const backupPayload = {
        backupType: 'household_full_backup',
        version: '2.0',
        createdAt: new Date().toISOString(),
        householdId: cleanHouseId,
        userEmail: userEmail || 'l.carlosramos92@gmail.com',
        notes: notes || 'Backup gerado pelo usuário',
        summary: {
          billsCount: realBills.length,
          revenuesCount: realRevs.length,
          devicesCount: (household.devices || []).length,
          profilesCount: (clientData?.profiles || household.profiles || []).length,
          totalBillsAmount: realBills.reduce((acc: number, b: any) => acc + (b.amount || 0), 0),
          totalRevenuesAmount: realRevs.reduce((acc: number, r: any) => acc + (r.amount || 0), 0),
        },
        household: {
          ...household,
          bills: realBills,
          revenues: realRevs,
          profiles: clientData?.profiles || household.profiles || [],
        },
      };

      const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup_${cleanHouseId}_${timestampStr}.json`;
      const filePath = path.join(BACKUPS_DIR, filename);

      fs.writeFileSync(filePath, JSON.stringify(backupPayload, null, 2), 'utf-8');
      const stat = fs.statSync(filePath);
      const sizeKb = Math.round(stat.size / 1024);

      console.log(`[BACKUP] Snapshot created: ${filename} (${sizeKb} KB) for ${cleanHouseId}`);

      res.json({
        success: true,
        backup: {
          filename,
          createdAt: backupPayload.createdAt,
          sizeKb,
          sizeFormatted: sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`,
          billsCount: backupPayload.summary.billsCount,
          revenuesCount: backupPayload.summary.revenuesCount,
          totalBillsAmount: backupPayload.summary.totalBillsAmount,
          totalRevenuesAmount: backupPayload.summary.totalRevenuesAmount,
          downloadUrl: `/api/backup/download/${filename}`,
        },
        backupPayload,
      });
    } catch (err: any) {
      console.error('[BACKUP] Error creating backup:', err);
      res.status(500).json({ error: 'Erro ao gerar backup', details: err?.message });
    }
  });

  // 2. List available backup snapshots for household
  app.get('/api/backup/list/:householdId', (req, res) => {
    try {
      const { householdId } = req.params;
      const cleanHouseId = (householdId || 'default').trim().toLowerCase();

      if (!fs.existsSync(BACKUPS_DIR)) {
        return res.json({ success: true, backups: [] });
      }

      const files = fs.readdirSync(BACKUPS_DIR);
      const backups = files
        .filter((f) => f.endsWith('.json') && f.includes(cleanHouseId))
        .map((f) => {
          const filePath = path.join(BACKUPS_DIR, f);
          const stat = fs.statSync(filePath);
          const sizeKb = Math.max(1, Math.round(stat.size / 1024));
          let meta: any = {};
          try {
            const raw = fs.readFileSync(filePath, 'utf-8');
            meta = JSON.parse(raw);
          } catch {}
          return {
            filename: f,
            createdAt: meta.createdAt || stat.mtime.toISOString(),
            sizeKb,
            sizeFormatted: sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`,
            billsCount: meta.summary?.billsCount || (meta.household?.bills || []).length || 0,
            revenuesCount: meta.summary?.revenuesCount || (meta.household?.revenues || []).length || 0,
            totalBillsAmount: meta.summary?.totalBillsAmount,
            userEmail: meta.userEmail || 'l.carlosramos92@gmail.com',
            notes: meta.notes || '',
            downloadUrl: `/api/backup/download/${f}`,
          };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json({ success: true, backups });
    } catch (err: any) {
      console.error('[BACKUP] Error listing backups:', err);
      res.json({ success: true, backups: [] });
    }
  });

  // 3. Download a backup file
  app.get('/api/backup/download/:filename', (req, res) => {
    const { filename } = req.params;
    const sanitized = path.basename(filename);
    const filePath = path.join(BACKUPS_DIR, sanitized);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Arquivo de backup não encontrado');
    }
    res.download(filePath, sanitized);
  });

  // 4. Restore from backup
  app.post('/api/backup/restore', (req, res) => {
    try {
      const { householdId, filename, backupData, mode = 'replace' } = req.body;
      const cleanHouseId = (householdId || 'default').trim().toLowerCase();
      const store = loadHouseholds();
      let household = store[cleanHouseId];

      let dataToRestore = backupData;
      if (!dataToRestore && filename) {
        const sanitized = path.basename(filename);
        const filePath = path.join(BACKUPS_DIR, sanitized);
        if (fs.existsSync(filePath)) {
          dataToRestore = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
      }

      if (!dataToRestore) {
        return res.status(400).json({ error: 'Nenhum dado válido para restaurar' });
      }

      const targetHousehold = dataToRestore.household || dataToRestore;
      const incomingBills = (targetHousehold.bills || []).filter((b: any) => !isMockBillServer(b));
      const incomingRevs = (targetHousehold.revenues || []).filter((r: any) => !isMockRevenueServer(r));

      // Safety snapshot before restore
      if (household) {
        const safetyFile = `safety_before_restore_${cleanHouseId}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        fs.writeFileSync(path.join(BACKUPS_DIR, safetyFile), JSON.stringify({ household }, null, 2), 'utf-8');
      }

      if (!household) {
        household = {
          id: cleanHouseId,
          name: targetHousehold.name || 'Minha Casa',
          code: (targetHousehold.code || cleanHouseId).toUpperCase(),
          bills: incomingBills,
          revenues: incomingRevs,
          profiles: targetHousehold.profiles || [],
          devices: targetHousehold.devices || [],
          notifications: [],
          lastUpdated: new Date().toISOString(),
          isWifeConnected: true,
        };
      } else {
        if (mode === 'merge') {
          const existingIds = new Set((household.bills || []).map((b) => b.id));
          const toAdd = incomingBills.filter((b: any) => !existingIds.has(b.id));
          household.bills = [...(household.bills || []), ...toAdd];

          const existingRevIds = new Set((household.revenues || []).map((r) => r.id));
          const toAddRevs = incomingRevs.filter((r: any) => !existingRevIds.has(r.id));
          household.revenues = [...(household.revenues || []), ...toAddRevs];
        } else {
          household.bills = incomingBills;
          household.revenues = incomingRevs;
          if (targetHousehold.profiles) household.profiles = targetHousehold.profiles;
        }
        household.lastUpdated = new Date().toISOString();
        household.isWifeConnected = true;
      }

      store[cleanHouseId] = household;
      saveHouseholds(store);

      const notif = recordChangeNotification(cleanHouseId, {
        sourceDeviceId: 'system_backup',
        sourceDeviceName: 'Backup Manager',
        sourceUserName: 'Sistema de Backup',
        actionType: 'backup_restored',
        title: 'Backup Restaurado 💾',
        message: `Restauração concluída: ${incomingBills.length} contas e ${incomingRevs.length} receitas restauradas com sucesso!`,
      });
      broadcastChangeNotification(cleanHouseId, notif);

      console.log(`[BACKUP] Restore completed for ${cleanHouseId}: ${incomingBills.length} bills, ${incomingRevs.length} revenues`);

      res.json({
        success: true,
        message: `Backup restaurado com sucesso! ${incomingBills.length} contas e ${incomingRevs.length} receitas sincronizadas.`,
        household,
      });
    } catch (err: any) {
      console.error('[BACKUP] Error restoring backup:', err);
      res.status(500).json({ error: 'Erro ao restaurar backup', details: err?.message });
    }
  });

  // Helper to parse bank push/SMS notification text
  function parseBankPushText(text: string): {
    totalAmount: number;
    installments: number;
    installmentAmount?: number;
    description: string;
    cardName: string;
    cardLast4?: string;
  } {
    const raw = String(text || '').trim();

    // 1. Amount extraction: e.g. R$ 1.500,00 or R$150,00 or 1.200,50
    let totalAmount = 0;
    const amountMatch = raw.match(/(?:R\$\s*|valor\s*(?:de)?\s*R\$\s*|de\s*R\$\s*)([0-9]{1,3}(?:\.[0-9]{3})*|\d+)(?:,(\d{2}))?/i) ||
                        raw.match(/\b([0-9]{1,3}(?:\.[0-9]{3})*,\d{2})\b/);
    if (amountMatch) {
      if (amountMatch[2] !== undefined) {
        const whole = amountMatch[1].replace(/\./g, '');
        const cents = amountMatch[2];
        totalAmount = parseFloat(`${whole}.${cents}`);
      } else {
        totalAmount = parseFloat(amountMatch[1].replace(/\./g, '').replace(',', '.'));
      }
    }

    // 2. Installments: e.g. "em 10x", "10x de", "parcelado em 3x", "12 parcelas"
    let installments = 1;
    let installmentAmount: number | undefined;

    const instMatch = raw.match(/(\d{1,2})\s*x\s*(?:de\s*(?:R\$\s*)?([0-9.,]+))?/i) ||
                      raw.match(/(?:parcelad[oa]\s*em\s*|em\s*)(\d{1,2})\s*(?:vezes|parcelas)/i);
    if (instMatch) {
      installments = Math.max(1, parseInt(instMatch[1], 10));
      if (instMatch[2]) {
        installmentAmount = parseFloat(instMatch[2].replace(/\./g, '').replace(',', '.'));
      }
    }

    // 3. Card brand/bank detection
    let cardName = 'Cartão de Crédito';
    const lower = raw.toLowerCase();
    if (lower.includes('nubank')) cardName = 'Nubank';
    else if (lower.includes('itau') || lower.includes('itaucard')) cardName = 'Banco Itaú';
    else if (lower.includes('bradesco')) cardName = 'Banco Bradesco';
    else if (lower.includes('santander')) cardName = 'Banco Santander';
    else if (lower.includes('ourocard') || lower.includes('banco do brasil') || lower.includes('bb')) cardName = 'Banco do Brasil';
    else if (lower.includes('c6')) cardName = 'C6 Bank';
    else if (lower.includes('inter')) cardName = 'Banco Inter';
    else if (lower.includes('caixa')) cardName = 'Caixa Econômica';
    else if (lower.includes('xp')) cardName = 'XP Investimentos';
    else if (lower.includes('btg')) cardName = 'BTG Pactual';

    // 4. Last 4 digits
    let cardLast4: string | undefined;
    const last4Match = raw.match(/(?:final|cart[aã]o\s*final)\s*([0-9]{4})/i);
    if (last4Match) {
      cardLast4 = last4Match[1];
    }

    // 5. Merchant / Description
    let description = 'Compra no Cartão';
    const atMatch = raw.match(/(?:na|no|em)\s+([A-Za-z0-9À-ÿ\s&.-]{3,35})(?:\s+aprovada|\s+no\s+valor|\s+de\s+R|\.|$)/i);
    if (atMatch && atMatch[1] && !atMatch[1].toLowerCase().includes('cart') && !atMatch[1].toLowerCase().includes('aprovad')) {
      description = atMatch[1].trim();
    } else {
      const genericMatch = raw.match(/compra(?:\s+aprovada)?\s+(?:de\s+R\$[0-9.,]+\s+)?(?:no\s+seu\s+[A-Za-z0-9]+\s+)?(?:na|no|em)\s+([A-Za-z0-9À-ÿ\s&.-]{3,30})/i);
      if (genericMatch && genericMatch[1]) {
        description = genericMatch[1].trim();
      }
    }

    return {
      totalAmount,
      installments,
      installmentAmount,
      description,
      cardName,
      cardLast4,
    };
  }

  // Generate installment bills for a credit card purchase
  function generateCardPurchaseBills(reqData: {
    description: string;
    totalAmount: number;
    installments: number;
    installmentAmount?: number;
    purchaseDate?: string;
    dueDay?: number;
    closingDay?: number;
    cardName?: string;
    cardLast4?: string;
    cardHolder?: string;
    category?: string;
    splitHousehold?: boolean;
    notes?: string;
  }): any[] {
    const totalAmount = Number(reqData.totalAmount) || 0;
    const installments = Math.max(1, Number(reqData.installments) || 1);
    const purchaseDate = reqData.purchaseDate || new Date().toISOString().slice(0, 10);
    const dueDay = reqData.dueDay || 15;
    const closingDay = reqData.closingDay || 5;
    const cardName = reqData.cardName || 'Cartão de Crédito';
    const cardLast4 = reqData.cardLast4 || '0000';
    const cardHolder = reqData.cardHolder || 'Paula';
    const cleanDesc = reqData.description?.trim() || 'Compra no Cartão';

    const calcInstallmentAmount = reqData.installmentAmount && reqData.installmentAmount > 0
      ? Number(reqData.installmentAmount)
      : Number((totalAmount / installments).toFixed(2));

    const [pYStr, pMStr, pDStr] = purchaseDate.split('-');
    const pYear = parseInt(pYStr, 10) || new Date().getFullYear();
    const pMonth = parseInt(pMStr, 10) || (new Date().getMonth() + 1);
    const pDay = parseInt(pDStr, 10) || new Date().getDate();

    // Determine initial invoice month based on closingDay
    let invoiceYear = pYear;
    let invoiceMonth = pMonth;

    if (pDay > closingDay) {
      invoiceMonth += 1;
      if (invoiceMonth > 12) {
        invoiceMonth = 1;
        invoiceYear += 1;
      }
    }

    if (dueDay < closingDay) {
      invoiceMonth += 1;
      if (invoiceMonth > 12) {
        invoiceMonth = 1;
        invoiceYear += 1;
      }
    }

    const parentGroupId = `inst-card-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const nowIso = new Date().toISOString();
    const bills: any[] = [];

    for (let i = 1; i <= installments; i++) {
      const monthOffset = i - 1;
      const targetMonthIndex = invoiceMonth + monthOffset;
      const targetYear = invoiceYear + Math.floor((targetMonthIndex - 1) / 12);
      const targetMonthNum = ((targetMonthIndex - 1) % 12) + 1;

      const maxDaysInTarget = new Date(targetYear, targetMonthNum, 0).getDate();
      const validDay = Math.min(dueDay, maxDaysInTarget);
      const installmentDueDate = `${targetYear}-${String(targetMonthNum).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`;

      // Adjust last installment cents so sum is exact
      let instVal = calcInstallmentAmount;
      if (i === installments && installments > 1) {
        const previousSum = calcInstallmentAmount * (installments - 1);
        const remainder = Number((totalAmount - previousSum).toFixed(2));
        if (remainder > 0) instVal = remainder;
      }

      bills.push({
        id: `bill-card-${parentGroupId}-${i}`,
        name: installments > 1 ? `${cleanDesc} (${i}/${installments})` : cleanDesc,
        amount: instVal,
        dueDate: installmentDueDate,
        category: reqData.category || 'Cartão & Compras',
        favored: `${cardName} •••• ${cardLast4}`,
        barcode: '',
        pixKey: '',
        pixType: 'Pix Copia e Cola',
        recurrence: installments > 1 ? 'Parcelada' : 'Única / Pontual',
        installmentNumber: i,
        totalInstallments: installments,
        parentInstallmentId: parentGroupId,
        splitHousehold: reqData.splitHousehold !== false,
        splitDetails: [],
        notes: `💳 Cartão: ${cardName} (${cardHolder}) •••• ${cardLast4} | Total: R$ ${totalAmount.toFixed(2).replace('.', ',')} em ${installments}x de R$ ${instVal.toFixed(2).replace('.', ',')}${reqData.notes ? ' | ' + reqData.notes : ''}`,
        status: 'pending',
        version: 1,
        updatedAt: nowIso,
        updatedByDevice: 'Open Finance Real-Time Card Sync',
        isSynced: true,
      });
    }

    return bills;
  }

  // POST /api/cards/purchase - Publish a card purchase into a household
  app.post('/api/cards/purchase', (req, res) => {
    const houseId = (req.body.house || req.query.house || 'minha-casa').toString().trim().toLowerCase();
    const purchase = req.body.purchase || req.body;

    if (!purchase || !purchase.totalAmount) {
      return res.status(400).json({ error: 'Dados da compra incompletos (totalAmount obrigatório)' });
    }

    const generatedBills = generateCardPurchaseBills(purchase);

    const store = loadHouseholds();
    let household = store[houseId];
    const nowIso = new Date().toISOString();

    if (!household) {
      household = {
        id: houseId,
        name: 'Minha Casa',
        code: houseId.toUpperCase(),
        bills: [],
        revenues: [],
        profiles: [],
        devices: [],
        lastUpdated: nowIso,
      };
    }

    if (!Array.isArray(household.bills)) {
      household.bills = [];
    }

    // Merge generated bills
    household.bills.push(...generatedBills);
    household.lastUpdated = nowIso;
    store[houseId] = household;
    saveHouseholds(store);

    res.json({
      success: true,
      count: generatedBills.length,
      totalAmount: purchase.totalAmount,
      installments: purchase.installments || 1,
      bills: generatedBills,
      householdLastUpdated: nowIso,
    });
  });

  // POST /api/cards/webhook - Live Open Finance & Webhook Receiver (Supports iOS Shortcuts / Android / Zapier / Pluggy)
  app.post('/api/cards/webhook', (req, res) => {
    const houseId = (req.body.house || req.query.house || 'minha-casa').toString().trim().toLowerCase();
    const rawText = req.body.text || req.body.message || req.body.notification || req.body.body;

    let purchaseData: any;

    if (rawText && typeof rawText === 'string') {
      const parsed = parseBankPushText(rawText);
      purchaseData = {
        ...parsed,
        purchaseDate: req.body.date || new Date().toISOString().slice(0, 10),
        dueDay: req.body.dueDay ? parseInt(req.body.dueDay, 10) : 15,
        closingDay: req.body.closingDay ? parseInt(req.body.closingDay, 10) : 5,
        cardHolder: req.body.cardHolder || 'Paula',
      };
    } else {
      purchaseData = {
        description: req.body.description || req.body.title || 'Compra no Cartão',
        totalAmount: parseFloat(req.body.totalAmount || req.body.amount || '0'),
        installments: parseInt(req.body.installments || req.body.installmentsCount || '1', 10),
        installmentAmount: req.body.installmentAmount ? parseFloat(req.body.installmentAmount) : undefined,
        purchaseDate: req.body.purchaseDate || new Date().toISOString().slice(0, 10),
        dueDay: req.body.dueDay ? parseInt(req.body.dueDay, 10) : 15,
        closingDay: req.body.closingDay ? parseInt(req.body.closingDay, 10) : 5,
        cardName: req.body.cardName || req.body.institution || 'Cartão de Crédito',
        cardLast4: req.body.cardLast4 || req.body.last4 || '0000',
        cardHolder: req.body.cardHolder || 'Paula',
        category: req.body.category,
      };
    }

    if (!purchaseData.totalAmount || purchaseData.totalAmount <= 0) {
      return res.status(400).json({
        error: 'Valor da compra não identificado',
        parsedData: purchaseData,
      });
    }

    const generatedBills = generateCardPurchaseBills(purchaseData);

    const store = loadHouseholds();
    let household = store[houseId];
    const nowIso = new Date().toISOString();

    if (!household) {
      household = {
        id: houseId,
        name: 'Minha Casa',
        code: houseId.toUpperCase(),
        bills: [],
        revenues: [],
        profiles: [],
        devices: [],
        lastUpdated: nowIso,
      };
    }

    if (!Array.isArray(household.bills)) {
      household.bills = [];
    }

    household.bills.push(...generatedBills);
    household.lastUpdated = nowIso;
    store[houseId] = household;
    saveHouseholds(store);

    res.json({
      success: true,
      message: `Compra de R$ ${purchaseData.totalAmount.toFixed(2).replace('.', ',')} em ${purchaseData.installments}x sincronizada com sucesso no app!`,
      count: generatedBills.length,
      purchase: purchaseData,
      bills: generatedBills,
    });
  });
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    (typeof __filename !== 'undefined' && __filename.endsWith('server.cjs'));

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Ensure index.html and root are never cached by Safari/PWA
    app.use((req, res, next) => {
      if (req.path === '/' || req.path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      next();
    });
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${PORT} is in use, retrying in 500ms...`);
      setTimeout(() => {
        try { server.close(); } catch {}
        server.listen(PORT, '0.0.0.0');
      }, 500);
    } else {
      console.error('Server error:', err);
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server with WebSockets running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal error starting server:', err);
});
