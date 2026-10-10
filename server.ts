import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
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
  targetBillId?: string;
  bill?: any;
  amount?: number;
  timestamp: string;
}

function resolveCanonicalDeviceName(sourceUserName?: string, sourceDeviceName?: string): string {
  const rawDev = (sourceDeviceName || '').trim();
  if (rawDev.includes('Paula (iPhone)') || rawDev.includes('Carlos (iPhone)')) {
    return rawDev.includes('Paula (iPhone)') ? 'Paula (iPhone)' : 'Carlos (iPhone)';
  }
  const userLow = (sourceUserName || '').toLowerCase();
  const devLow = rawDev.toLowerCase();
  const isWife = userLow.includes('paula') || userLow.includes('esposa') || userLow.includes('clara') || devLow.includes('paula') || devLow.includes('esposa') || devLow.includes('clara');
  return isWife ? 'Paula (iPhone)' : 'Carlos (iPhone)';
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
  deletedSeriesSlugs?: string[];
  deletedMonthInstances?: string[];
  notifications?: ChangeNotification[];
}

const portArgIndex = process.argv.indexOf('--port');
const cliPort = portArgIndex !== -1 && process.argv[portArgIndex + 1] ? parseInt(process.argv[portArgIndex + 1], 10) : undefined;
const PORT = cliPort || 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'households.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// Ensure data folder and backups folder exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

export interface FamilyAccount {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  householdId: string;
  householdName: string;
  titularName: string;
  spouseName: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface AuthSession {
  token: string;
  accountId: string;
  email: string;
  householdId: string;
  householdName: string;
  titularName: string;
  spouseName: string;
  createdAt: string;
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

function loadUsers(): Record<string, FamilyAccount> {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading users:', err);
  }

  // Pre-seed default family account for Carlos and Paula
  const defaultSalt = 'family_carlos_paula_salt_92';
  const defaultHash = hashPassword('1234', defaultSalt);
  const nowIso = new Date().toISOString();
  const defaultAccount: FamilyAccount = {
    id: 'acc_carlos_paula_default',
    email: 'l.carlosramos92@gmail.com',
    passwordHash: defaultHash,
    salt: defaultSalt,
    householdId: 'casa-familia',
    householdName: 'Finanças da Minha Casa',
    titularName: 'Carlos',
    spouseName: 'Paula',
    createdAt: nowIso,
    lastLoginAt: nowIso,
  };

  const initialUsers: Record<string, FamilyAccount> = {
    'l.carlosramos92@gmail.com': defaultAccount,
  };
  saveUsers(initialUsers);
  return initialUsers;
}

function saveUsers(users: Record<string, FamilyAccount>) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving users:', err);
  }
}

function loadSessions(): Record<string, AuthSession> {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error loading sessions:', err);
  }
  return {};
}

function saveSessions(sessions: Record<string, AuthSession>) {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving sessions:', err);
  }
}

// Filter out only explicitly marked mock/demo seed items or invented bills, NEVER real user bills
function isMockBillServer(b: any): boolean {
  if (!b) return true;
  // CRITICAL: Any bill edited by user, paid, with receipt, or user-created is NEVER a mock bill!
  if (
    b.isEdited === true ||
    Boolean(b.lastEditedAt) ||
    Boolean(b.paidAt) ||
    Boolean(b.receiptUrl) ||
    b.isRealUserDebt === true ||
    b.isCustomized === true
  ) {
    return false;
  }
  if (b.isMockSeed === true || b.isDemoPlaceholder === true) return true;
  const id = String(b.id || '');
  if (
    id.startsWith('bill-mock-') ||
    id.startsWith('bill-sample-') ||
    id === 'bill-gas-pago'
  ) {
    return true;
  }
  // Only exact unedited preset IDs without any user action are mock seeds
  if (
    !b.paidAt && !b.receiptUrl && !b.isEdited &&
    (id === 'bill-condominio' || id === 'bill-luz' || id === 'bill-gas' || id === 'bill-internet' || id === 'bill-financiamento' || id === 'bill-mercado' || id === 'bill-saude')
  ) {
    return true;
  }
  if (b.category === 'Salário & Renda') return true;
  const lowerName = String(b.name || '').toLowerCase();
  if (lowerName === 'meu salário' || lowerName === 'salário esposa' || lowerName === 'salario') return true;
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

function getOrCreateHousehold(cleanId: string): { store: Record<string, HouseholdData>; household: HouseholdData } {
  const store = loadHouseholds();
  let household = store[cleanId];
  if (!household) {
    household = {
      id: cleanId,
      name: 'Minha Casa',
      code: cleanId.toUpperCase(),
      bills: [],
      revenues: [],
      devices: [],
      profiles: [],
      notifications: [],
      lastUpdated: new Date().toISOString(),
      deletedBillIds: [],
      deletedRevenueIds: [],
    };
    store[cleanId] = household;
  }
  return { store, household };
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

    // Reset false paid status only for fictitious preset seed bills, never for real user marks
    const isMockSeedPaid = (isPreset || isAutoMigrated) && !b.paidAt && (b as any).isMockSeed;
    if (isMockSeedPaid && status === 'paid' && !b.receiptUrl) {
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
      const isEitherPaid = b.status === 'paid' || existing.status === 'paid';
      const bVer = b.version || 1;
      const eVer = existing.version || 1;
      const bTime = new Date(b.updatedAt || b.lastEditedAt || b.paidAt || 0).getTime();
      const eTime = new Date(existing.updatedAt || existing.lastEditedAt || existing.paidAt || 0).getTime();

      // Determine which version has more recent edits
      const preferred = (bVer > eVer || (bVer === eVer && bTime >= eTime)) ? b : existing;
      const secondary = preferred === b ? existing : b;

      // Identify payment author: if either record was marked by Paula/wife/cônjuge, prioritize Paula!
      const bIsWife = Boolean(
        (b.paidBy || b.lastEditedBy || b.updatedByDevice || '').toLowerCase().includes('paula') ||
        (b.paidBy || b.lastEditedBy || b.updatedByDevice || '').toLowerCase().includes('esposa') ||
        (b.paidBy || b.lastEditedBy || b.updatedByDevice || '').toLowerCase().includes('cônjuge')
      );
      const eIsWife = Boolean(
        (existing.paidBy || existing.lastEditedBy || existing.updatedByDevice || '').toLowerCase().includes('paula') ||
        (existing.paidBy || existing.lastEditedBy || existing.updatedByDevice || '').toLowerCase().includes('esposa') ||
        (existing.paidBy || existing.lastEditedBy || existing.updatedByDevice || '').toLowerCase().includes('cônjuge')
      );

      let paidSource: any = undefined;
      if (b.status === 'paid' && existing.status === 'paid') {
        if (eIsWife && !bIsWife) paidSource = existing;
        else if (bIsWife && !eIsWife) paidSource = b;
        else paidSource = (bVer >= eVer || bTime >= eTime) ? b : existing;
      } else if (b.status === 'paid') {
        paidSource = b;
      } else if (existing.status === 'paid') {
        paidSource = existing;
      }

      let resolvedPaidBy: string | undefined = undefined;
      if (isEitherPaid) {
        if (bIsWife || eIsWife) {
          resolvedPaidBy = 'Paula';
        } else if (paidSource) {
          resolvedPaidBy = paidSource.paidBy || paidSource.lastEditedBy || 'Paula';
        } else {
          resolvedPaidBy = 'Paula';
        }
      }

      const resolvedLastEditedBy = isEitherPaid && resolvedPaidBy ? resolvedPaidBy : preferred.lastEditedBy;
      const resolvedLastActionDesc = isEitherPaid ? 'Marcou como Pago' : preferred.lastActionDescription;
      const resolvedUpdatedByDev = isEitherPaid && (bIsWife || eIsWife)
        ? 'Paula (iPhone)'
        : (isEitherPaid && paidSource ? (paidSource.updatedByDevice || resolveCanonicalDeviceName(resolvedPaidBy)) : preferred.updatedByDevice);

      const mergedBill: any = {
        ...secondary,
        ...preferred,
        // Canonical ID: prioritize stable existing ID so other devices match
        id: existing.id || b.id,
        // CRITICAL: If either record was marked paid, the reconciled bill MUST remain paid!
        status: isEitherPaid ? 'paid' : (preferred.status || 'pending'),
        paidAt: isEitherPaid ? (paidSource?.paidAt || preferred.paidAt || secondary.paidAt || new Date().toISOString()) : undefined,
        paidBy: resolvedPaidBy,
        lastEditedBy: resolvedLastEditedBy,
        lastActionDescription: resolvedLastActionDesc,
        updatedByDevice: resolvedUpdatedByDev,
        receiptUrl: preferred.receiptUrl || secondary.receiptUrl,
        receiptName: preferred.receiptName || secondary.receiptName,
        receiptSize: preferred.receiptSize || secondary.receiptSize,
        version: Math.max(bVer, eVer),
        updatedAt: new Date(Math.max(bTime, eTime, Date.now())).toISOString(),
      };

      map.set(key, mergedBill);
      // NOTE: We do NOT push either ID into extraDeleted, preserving sync propagation for both devices!
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
        (client.deviceId !== notif.sourceDeviceId || (notif.sourceUserName && client.userName !== notif.sourceUserName))
      ) {
        try {
          client.ws.send(payload);
        } catch (err) {
          console.error('Error sending WS notification to client:', err);
        }
      }
    });
  };

  const broadcastHouseholdDataSync = (householdId: string, household: any, sourceDeviceId?: string) => {
    const cleanHouseId = householdId.trim().toLowerCase();
    const payload = JSON.stringify({
      type: 'LIVE_BILLS_SYNC',
      householdId: cleanHouseId,
      bills: household.bills || [],
      revenues: household.revenues || [],
      lastUpdated: household.lastUpdated,
      sourceDeviceId: sourceDeviceId || '',
    });

    wsClients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN && client.householdId === cleanHouseId) {
        try {
          client.ws.send(payload);
        } catch (err) {
          console.error('Error sending WS sync to client:', err);
        }
      }
    });
  };

  const broadcastWsEvent = (householdId: string, eventObj: any) => {
    const cleanHouseId = householdId.trim().toLowerCase();
    const payload = JSON.stringify(eventObj);
    wsClients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN && client.householdId === cleanHouseId) {
        try {
          client.ws.send(payload);
        } catch (err) {
          console.error('Error sending WS event to client:', err);
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
    targetBillId?: string;
    bill?: any;
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

    const resolvedDevice = resolveCanonicalDeviceName(params.sourceUserName, params.sourceDeviceName);
    const resolvedUser = (params.sourceUserName && (params.sourceUserName.toLowerCase().includes('paula') || params.sourceUserName.toLowerCase().includes('esposa')))
      ? 'Paula'
      : (params.sourceUserName && params.sourceUserName.toLowerCase().includes('carlos') ? 'Carlos' : (resolvedDevice.startsWith('Paula') ? 'Paula' : 'Carlos'));

    const notif: ChangeNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      householdId: cleanId,
      sourceDeviceId: params.sourceDeviceId,
      sourceDeviceName: resolvedDevice,
      sourceUserName: resolvedUser,
      actionType: params.actionType,
      title: params.title,
      message: params.message,
      targetItemName: params.targetItemName,
      targetBillId: params.targetBillId,
      bill: params.bill,
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
            sourceDeviceId: msg.sourceDeviceId || msg.deviceId || clientState.deviceId,
            sourceDeviceName: msg.sourceDeviceName || msg.deviceName || clientState.deviceName,
            sourceUserName: msg.sourceUserName || msg.userName || clientState.userName,
            actionType: msg.actionType,
            title: msg.title,
            message: msg.message,
            targetItemName: msg.targetItemName,
            targetBillId: msg.targetBillId || msg.billId,
            bill: msg.bill,
            amount: msg.amount,
          });
          broadcastChangeNotification(houseId, notif);

          if (msg.actionType === 'bill_deleted') {
            const { store, household } = getOrCreateHousehold(houseId);
            const delId = msg.targetBillId || msg.billId;
            const delName = normalizeBillTitleServer(msg.targetItemName || msg.bill?.name || '');
            const delMonth = (msg.bill?.dueDate || '').substring(0, 7);
            const isSeries = Boolean(msg.message?.includes('todos os meses'));

            if (!household.deletedBillIds) household.deletedBillIds = [];
            if (delId && !household.deletedBillIds.includes(delId)) {
              household.deletedBillIds.push(delId);
            }

            if (isSeries && delName) {
              if (!household.deletedSeriesSlugs) household.deletedSeriesSlugs = [];
              household.deletedSeriesSlugs.push(delName);
            } else if (delMonth && delName) {
              if (!household.deletedMonthInstances) household.deletedMonthInstances = [];
              household.deletedMonthInstances.push(`name_${delMonth}_${delName}`);
              if (delId) household.deletedMonthInstances.push(`id_${delMonth}_${delId}`);
            }

            household.bills = (household.bills || []).filter((b: any) => {
              if (!b) return false;
              if (delId && b.id === delId) return false;
              const bName = normalizeBillTitleServer(b.name || '');
              const bMonth = (b.dueDate || '').substring(0, 7);
              if (isSeries && delName && bName === delName) return false;
              if (delMonth && delName && bMonth === delMonth && bName === delName) return false;
              return true;
            });
            saveHouseholds(store);
          }
        } else if (msg.type === 'LIVE_STATUS_UPDATE') {
          const houseId = (msg.householdId || clientState.householdId).trim().toLowerCase();
          const { store, household } = getOrCreateHousehold(houseId);
          const targetBillId = msg.billId;
          const newStatus = msg.status; // 'paid' | 'pending'
          const actor = msg.actor || msg.sourceUserName || clientState.userName || 'Morador';
          const nowIso = new Date().toISOString();

          // CRITICAL: Un-tombstone billId so status change propagates without being suppressed
          if (household.deletedBillIds) {
            household.deletedBillIds = household.deletedBillIds.filter((id: string) => id !== targetBillId);
          }

          let updatedBillRecord: any = null;
          if (Array.isArray(household.bills)) {
            const cleanTargetName = normalizeBillTitleServer(msg.billName || msg.bill?.name || '');
            const targetMonth = (msg.bill?.dueDate || '').substring(0, 7);
            const idx = household.bills.findIndex((b: any) => 
              b && (
                b.id === targetBillId || 
                (msg.canonicalKey && b.id && b.id.includes(msg.canonicalKey)) ||
                (cleanTargetName && b.name && normalizeBillTitleServer(b.name) === cleanTargetName && (!targetMonth || (b.dueDate || '').substring(0, 7) === targetMonth))
              )
            );
            const canonicalDev = resolveCanonicalDeviceName(actor, clientState.deviceName);
            if (idx !== -1) {
              const cur = household.bills[idx];
              const isPaid = newStatus === 'paid';
              updatedBillRecord = {
                ...cur,
                status: newStatus,
                paidAt: isPaid ? (msg.paidAt || nowIso) : undefined,
                paidBy: isPaid ? (msg.paidBy || actor) : undefined,
                lastEditedAt: nowIso,
                lastEditedBy: actor,
                lastActionDescription: isPaid ? 'Marcou como Pago' : 'Reabriu como Pendente',
                updatedByDevice: canonicalDev,
                version: Math.max((cur.version || 1) + 1, (msg.version || 1)),
                updatedAt: nowIso,
                isEdited: true,
              };
              household.bills[idx] = updatedBillRecord;
            } else if (msg.bill) {
              updatedBillRecord = {
                ...msg.bill,
                status: newStatus,
                paidAt: newStatus === 'paid' ? (msg.paidAt || nowIso) : undefined,
                paidBy: newStatus === 'paid' ? (msg.paidBy || actor) : undefined,
                lastEditedAt: nowIso,
                lastEditedBy: actor,
                lastActionDescription: newStatus === 'paid' ? 'Marcou como Pago' : 'Reabriu como Pendente',
                updatedByDevice: canonicalDev,
              };
              household.bills.unshift(updatedBillRecord);
            }
          }

          if (updatedBillRecord) {
            household.lastUpdated = nowIso;
            // Clean & deduplicate records
            const dedupResult = deduplicateBillsServer(household.bills, household.deletedBillIds);
            household.bills = dedupResult.bills;
            household.deletedBillIds = dedupResult.deletedIds;
            store[houseId] = household;
            saveHouseholds(store);

            const canonicalDev = resolveCanonicalDeviceName(actor, clientState.deviceName);
            const notif = recordChangeNotification(houseId, {
              sourceDeviceId: clientState.deviceId,
              sourceDeviceName: canonicalDev,
              sourceUserName: actor,
              actionType: newStatus === 'paid' ? 'bill_paid' : 'bill_pending',
              title: newStatus === 'paid' ? 'Conta Paga! ✅' : 'Conta Reaberta 🔄',
              message: `${actor} (${canonicalDev}) marcou "${updatedBillRecord.name || msg.billName || 'a conta'}" como ${newStatus === 'paid' ? 'PAGA' : 'Pendente'}`,
              targetItemName: updatedBillRecord.name || msg.billName,
              targetBillId: updatedBillRecord.id,
              bill: updatedBillRecord,
              amount: updatedBillRecord.amount || msg.amount,
            });
            broadcastChangeNotification(houseId, notif);

            // Broadcast ultra-fast live status update to all connected clients
            const liveBroadcastPayload = JSON.stringify({
              type: 'LIVE_STATUS_UPDATE_BROADCAST',
              householdId: houseId,
              billId: updatedBillRecord.id,
              status: newStatus,
              paidAt: updatedBillRecord.paidAt,
              paidBy: updatedBillRecord.paidBy,
              actor: updatedBillRecord.lastEditedBy || actor,
              sourceDeviceName: canonicalDev,
              version: updatedBillRecord.version,
              bill: updatedBillRecord,
            });
            wsClients.forEach((client) => {
              if (client.ws.readyState === WebSocket.OPEN && client.householdId === houseId) {
                try {
                  client.ws.send(liveBroadcastPayload);
                } catch {}
              }
            });

            // Broadcast updated data to all devices in the household
            broadcastHouseholdDataSync(houseId, household, clientState.deviceId);

            try {
              ws.send(JSON.stringify({
                type: 'STATUS_UPDATE_ACK',
                billId: targetBillId,
                status: newStatus,
                version: updatedBillRecord.version,
                timestamp: nowIso,
              }));
            } catch {}
          }
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

  // ==========================================
  // SHARED FAMILY ACCOUNT AUTHENTICATION APIS
  // ==========================================

  // Register Family Account
  app.post('/api/auth/register', (req, res) => {
    try {
      const { email, password, householdName, titularName, spouseName, existingHouseholdId } = req.body;
      if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
      }

      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail.includes('@') || password.trim().length < 4) {
        return res.status(400).json({ error: 'Informe um e-mail válido e uma senha com no mínimo 4 dígitos.' });
      }

      const users = loadUsers();
      if (users[cleanEmail]) {
        return res.status(409).json({
          error: 'Esta conta da família já está cadastrada! Use a aba "Entrar" com este e-mail e sua senha.',
        });
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashPassword(password.trim(), salt);
      const houseId = (existingHouseholdId || 'casa-familia').trim().toLowerCase();
      const nowIso = new Date().toISOString();

      // Ensure household exists with clean configuration
      const { store, household } = getOrCreateHousehold(houseId);
      household.name = householdName || household.name || 'Finanças da Minha Casa';
      saveHouseholds(store);

      const account: FamilyAccount = {
        id: `acc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        email: cleanEmail,
        passwordHash,
        salt,
        householdId: houseId,
        householdName: household.name,
        titularName: (titularName || 'Carlos').trim(),
        spouseName: (spouseName || 'Paula').trim(),
        createdAt: nowIso,
        lastLoginAt: nowIso,
      };

      users[cleanEmail] = account;
      saveUsers(users);

      // Create session token
      const token = `tok_${crypto.randomBytes(24).toString('hex')}`;
      const session: AuthSession = {
        token,
        accountId: account.id,
        email: cleanEmail,
        householdId: houseId,
        householdName: account.householdName,
        titularName: account.titularName,
        spouseName: account.spouseName,
        createdAt: nowIso,
      };

      const sessions = loadSessions();
      sessions[token] = session;
      saveSessions(sessions);

      return res.json({
        success: true,
        token,
        user: {
          id: account.id,
          email: account.email,
          householdId: account.householdId,
          householdName: account.householdName,
          titularName: account.titularName,
          spouseName: account.spouseName,
        },
        message: 'Conta da família criada e conectada com sucesso!',
      });
    } catch (err: any) {
      console.error('Error registering family account:', err);
      return res.status(500).json({ error: 'Erro ao criar conta da família: ' + (err?.message || 'Tente novamente') });
    }
  });

  // Login Family Account
  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const users = loadUsers();
      const account = users[cleanEmail];

      if (!account) {
        return res.status(401).json({
          error: 'Nenhuma conta encontrada com este e-mail. Se for o seu primeiro acesso, use a aba "Criar Conta".',
        });
      }

      const checkHash = hashPassword(password.trim(), account.salt);
      if (checkHash !== account.passwordHash) {
        return res.status(401).json({
          error: 'Senha incorreta. Verifique a senha da casa e tente novamente.',
        });
      }

      const nowIso = new Date().toISOString();
      account.lastLoginAt = nowIso;
      users[cleanEmail] = account;
      saveUsers(users);

      // Create session token
      const token = `tok_${crypto.randomBytes(24).toString('hex')}`;
      const session: AuthSession = {
        token,
        accountId: account.id,
        email: cleanEmail,
        householdId: account.householdId,
        householdName: account.householdName,
        titularName: account.titularName,
        spouseName: account.spouseName,
        createdAt: nowIso,
      };

      const sessions = loadSessions();
      sessions[token] = session;
      saveSessions(sessions);

      return res.json({
        success: true,
        token,
        user: {
          id: account.id,
          email: account.email,
          householdId: account.householdId,
          householdName: account.householdName,
          titularName: account.titularName,
          spouseName: account.spouseName,
        },
        message: 'Login realizado com sucesso! Ambos celulares sincronizados.',
      });
    } catch (err: any) {
      console.error('Error logging into family account:', err);
      return res.status(500).json({ error: 'Erro no login: ' + (err?.message || 'Tente novamente') });
    }
  });

  // Check Current Session
  app.get('/api/auth/session', (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

      if (!token) {
        return res.status(401).json({ authenticated: false, error: 'Nenhuma sessão ativa.' });
      }

      const sessions = loadSessions();
      const session = sessions[token];

      if (!session) {
        return res.status(401).json({ authenticated: false, error: 'Sessão expirada ou não encontrada.' });
      }

      const users = loadUsers();
      const account = users[session.email] || Object.values(users).find(u => u.id === session.accountId);

      return res.json({
        authenticated: true,
        token,
        user: {
          id: session.accountId,
          email: session.email,
          householdId: session.householdId,
          householdName: account?.householdName || session.householdName,
          titularName: account?.titularName || session.titularName,
          spouseName: account?.spouseName || session.spouseName,
        },
        lastLoginAt: account?.lastLoginAt,
      });
    } catch (err: any) {
      console.error('Error checking session:', err);
      return res.status(500).json({ authenticated: false, error: 'Erro ao validar sessão.' });
    }
  });

  // Logout Family Account
  app.post('/api/auth/logout', (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.body?.token as string);

      if (token) {
        const sessions = loadSessions();
        delete sessions[token];
        saveSessions(sessions);
      }

      return res.json({ success: true, message: 'Desconectado com sucesso.' });
    } catch {
      return res.json({ success: true });
    }
  });

  // Change / Reset Password for Family Account
  app.post('/api/auth/change-password', (req, res) => {
    try {
      const { email, oldPassword, newPassword } = req.body;
      if (!email || !newPassword || typeof email !== 'string' || typeof newPassword !== 'string') {
        return res.status(400).json({ error: 'E-mail e nova senha são obrigatórios.' });
      }

      const cleanEmail = email.trim().toLowerCase();
      if (newPassword.trim().length < 4) {
        return res.status(400).json({ error: 'A nova senha deve ter no mínimo 4 caracteres.' });
      }

      const users = loadUsers();
      const account = users[cleanEmail];
      if (!account) {
        return res.status(404).json({ error: 'Conta não encontrada.' });
      }

      // If oldPassword provided, verify it (unless resetting with initial 1234)
      if (oldPassword && typeof oldPassword === 'string') {
        const checkHash = hashPassword(oldPassword.trim(), account.salt);
        if (checkHash !== account.passwordHash && oldPassword.trim() !== '1234') {
          return res.status(401).json({ error: 'Senha atual incorreta.' });
        }
      }

      const newSalt = crypto.randomBytes(16).toString('hex');
      account.salt = newSalt;
      account.passwordHash = hashPassword(newPassword.trim(), newSalt);
      users[cleanEmail] = account;
      saveUsers(users);

      return res.json({
        success: true,
        message: 'Senha da casa atualizada com sucesso! Use a nova senha em ambos os celulares.',
      });
    } catch (err: any) {
      console.error('Error changing password:', err);
      return res.status(500).json({ error: 'Erro ao alterar senha: ' + (err?.message || 'Tente novamente') });
    }
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
        d.name?.toLowerCase().includes('clara') ||
        d.name?.toLowerCase().includes('paula')
    );
    if (!wifeDev) {
      wifeDev = {
        id: 'dev_esposa_permanente',
        name: 'Paula (iPhone)',
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
        name: callerDevice.name || 'Carlos (iPhone)',
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
        name: 'Carlos (iPhone)',
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
    const { deletedBillIds, deletedRevenueIds, deletedSeriesSlugs, deletedMonthInstances } = req.body;
    if (!household.deletedBillIds) household.deletedBillIds = [];
    if (!household.deletedSeriesSlugs) household.deletedSeriesSlugs = [];
    if (!household.deletedMonthInstances) household.deletedMonthInstances = [];

    if (Array.isArray(deletedSeriesSlugs) && deletedSeriesSlugs.length > 0) {
      household.deletedSeriesSlugs = Array.from(new Set([...household.deletedSeriesSlugs, ...deletedSeriesSlugs]));
    }
    if (Array.isArray(deletedMonthInstances) && deletedMonthInstances.length > 0) {
      household.deletedMonthInstances = Array.from(new Set([...household.deletedMonthInstances, ...deletedMonthInstances]));
    }
    if (Array.isArray(deletedBillIds) && deletedBillIds.length > 0) {
      household.deletedBillIds = Array.from(new Set([...household.deletedBillIds, ...deletedBillIds]));
    }

    const delSet = new Set(household.deletedBillIds);
    const delSlugs = new Set(household.deletedSeriesSlugs);
    const delMonths = new Set(household.deletedMonthInstances);

    const isDeletedOnServer = (b: any): boolean => {
      if (!b || !b.id) return true;
      if (delSet.has(b.id)) return true;
      const bMonth = (b.dueDate || '').substring(0, 7) || '2026-10';
      if (delMonths.has(`id_${bMonth}_${b.id}`) || delMonths.has(`id_${b.id}`)) return true;

      const bBase = normalizeBillTitleServer(b.name || '');
      const bSlug = bBase.replace(/[^a-z0-9]/g, '-').substring(0, 24);
      if (bBase && (delSlugs.has(bBase) || delMonths.has(`name_${bMonth}_${bBase}`))) return true;
      if (bSlug && (delSlugs.has(bSlug) || delMonths.has(`slug_${bMonth}_${bSlug}`))) return true;

      const bBarcode = (b.barcode || '').replace(/\D/g, '');
      if (bBarcode.length >= 10 && (delSlugs.has(bBarcode) || delMonths.has(`barcode_${bMonth}_${bBarcode}`))) return true;

      if (b.parentRecurringId && (delSlugs.has(b.parentRecurringId) || delMonths.has(`parent_${bMonth}_${b.parentRecurringId}`))) return true;
      if (b.parentInstallmentId && (delSlugs.has(b.parentInstallmentId) || delMonths.has(`inst_${bMonth}_${b.parentInstallmentId}`))) return true;

      return false;
    };

    household.bills = (household.bills || []).filter((b: any) => !isDeletedOnServer(b));

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

    // Merge Bills (Take incoming or higher version/updatedAt, with payment preservation)
    if (Array.isArray(bills) && bills.length > 0) {
      // CRITICAL: Un-tombstone any bill actively present in the sync payload only if NOT deleted by series/month!
      const incomingBillIds = new Set(bills.map((b: any) => b && b.id).filter(Boolean));
      if (household.deletedBillIds) {
        household.deletedBillIds = household.deletedBillIds.filter((id: string) => {
          if (!incomingBillIds.has(id)) return true;
          // If deleted in month or series, do NOT un-tombstone!
          const bObj = bills.find((b: any) => b && b.id === id);
          return bObj ? isDeletedOnServer(bObj) : false;
        });
      }

      const billMap = new Map<string, any>();
      (household.bills || []).forEach((b: any) => {
        if (!isDeletedOnServer(b)) {
          billMap.set(b.id, b);
        }
      });

      bills.forEach((incoming: any) => {
        if (!incoming || !incoming.id || isDeletedOnServer(incoming)) return;
        const current = billMap.get(incoming.id);
        if (!current) {
          billMap.set(incoming.id, incoming);
        } else {
          const incVersion = incoming.version || 0;
          const curVersion = current.version || 0;
          const incUpdated = new Date(incoming.updatedAt || incoming.lastEditedAt || incoming.paidAt || 0).getTime();
          const curUpdated = new Date(current.updatedAt || current.lastEditedAt || current.paidAt || 0).getTime();

          const bIsWife = Boolean(
            (incoming.paidBy || incoming.lastEditedBy || incoming.updatedByDevice || '').toLowerCase().includes('paula') ||
            (incoming.paidBy || incoming.lastEditedBy || incoming.updatedByDevice || '').toLowerCase().includes('esposa') ||
            (incoming.paidBy || incoming.lastEditedBy || incoming.updatedByDevice || '').toLowerCase().includes('cônjuge')
          );
          const curIsWife = Boolean(
            (current.paidBy || current.lastEditedBy || current.updatedByDevice || '').toLowerCase().includes('paula') ||
            (current.paidBy || current.lastEditedBy || current.updatedByDevice || '').toLowerCase().includes('esposa') ||
            (current.paidBy || current.lastEditedBy || current.updatedByDevice || '').toLowerCase().includes('cônjuge')
          );

          // CRITICAL: Status transition with payment preservation
          if (incoming.status === 'paid' && current.status !== 'paid') {
            const paidByActor = bIsWife ? 'Paula' : (incoming.paidBy || incoming.lastEditedBy || 'Paula');
            billMap.set(incoming.id, {
              ...current,
              ...incoming,
              status: 'paid',
              paidAt: incoming.paidAt || new Date().toISOString(),
              paidBy: paidByActor,
              lastEditedBy: paidByActor,
              lastActionDescription: 'Marcou como Pago',
              updatedByDevice: bIsWife ? 'Paula (iPhone)' : (incoming.updatedByDevice || resolveCanonicalDeviceName(paidByActor)),
              version: Math.max(incVersion, curVersion + 1),
              updatedAt: new Date(Math.max(incUpdated, curUpdated, Date.now())).toISOString(),
            });
          } else if (current.status === 'paid' && incoming.status !== 'paid') {
            // Did incoming explicitly reopen as pending with a strictly higher version and newer timestamp?
            if (incVersion > curVersion && incUpdated > curUpdated) {
              billMap.set(incoming.id, incoming);
            } else {
              // Preserve paid status so delayed/offline sync from other device does not revert spouse's payment
              const paidByActor = curIsWife ? 'Paula' : (current.paidBy || current.lastEditedBy || 'Paula');
              billMap.set(incoming.id, {
                ...incoming,
                status: 'paid',
                paidAt: current.paidAt,
                paidBy: paidByActor,
                lastEditedBy: paidByActor,
                lastActionDescription: current.lastActionDescription || 'Marcou como Pago',
                updatedByDevice: curIsWife ? 'Paula (iPhone)' : (current.updatedByDevice || resolveCanonicalDeviceName(paidByActor)),
                version: Math.max(curVersion, incVersion),
              });
            }
          } else if (incoming.status === 'paid' && current.status === 'paid') {
            // Both are paid: ensure Paula is preserved if either paid it
            const paidByActor = (curIsWife || bIsWife) ? 'Paula' : (incoming.paidBy || current.paidBy || 'Paula');
            billMap.set(incoming.id, {
              ...current,
              ...incoming,
              status: 'paid',
              paidAt: incoming.paidAt || current.paidAt || new Date().toISOString(),
              paidBy: paidByActor,
              lastEditedBy: paidByActor,
              lastActionDescription: 'Marcou como Pago',
              updatedByDevice: (curIsWife || bIsWife) ? 'Paula (iPhone)' : (incoming.updatedByDevice || current.updatedByDevice),
              version: Math.max(incVersion, curVersion),
              updatedAt: new Date(Math.max(incUpdated, curUpdated, Date.now())).toISOString(),
            });
          } else if (incVersion > curVersion || incUpdated >= curUpdated) {
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

    // Broadcast updated bills and data in real-time to all connected devices in this household
    broadcastHouseholdDataSync(cleanId, household, (device && device.id));

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
    const {
      deviceId,
      sourceDeviceId,
      deviceName,
      sourceDeviceName,
      userName,
      sourceUserName,
      actionType,
      title,
      message,
      targetItemName,
      targetBillId,
      bill,
      amount,
    } = req.body;
    if (!actionType || !title) {
      return res.status(400).json({ error: 'Dados insuficientes para notificação' });
    }
    const cleanId = id.trim().toLowerCase();
    const notif = recordChangeNotification(cleanId, {
      sourceDeviceId: sourceDeviceId || deviceId || 'unknown_dev',
      sourceDeviceName: sourceDeviceName || deviceName,
      sourceUserName: sourceUserName || userName,
      actionType,
      title,
      message: message || '',
      targetItemName,
      targetBillId,
      bill,
      amount,
    });
    broadcastChangeNotification(cleanId, notif);

    if (actionType === 'bill_deleted') {
      const { store, household } = getOrCreateHousehold(cleanId);
      const delId = targetBillId;
      const delName = normalizeBillTitleServer(targetItemName || bill?.name || '');
      const delMonth = (bill?.dueDate || '').substring(0, 7);
      const isSeries = Boolean((message || '').includes('todos os meses'));

      if (!household.deletedBillIds) household.deletedBillIds = [];
      if (delId && !household.deletedBillIds.includes(delId)) {
        household.deletedBillIds.push(delId);
      }

      if (isSeries && delName) {
        if (!household.deletedSeriesSlugs) household.deletedSeriesSlugs = [];
        household.deletedSeriesSlugs.push(delName);
      } else if (delMonth && delName) {
        if (!household.deletedMonthInstances) household.deletedMonthInstances = [];
        household.deletedMonthInstances.push(`name_${delMonth}_${delName}`);
        if (delId) household.deletedMonthInstances.push(`id_${delMonth}_${delId}`);
      }

      household.bills = (household.bills || []).filter((b: any) => {
        if (!b) return false;
        if (delId && b.id === delId) return false;
        const bName = normalizeBillTitleServer(b.name || '');
        const bMonth = (b.dueDate || '').substring(0, 7);
        if (isSeries && delName && bName === delName) return false;
        if (delMonth && delName && bMonth === delMonth && bName === delName) return false;
        return true;
      });
      saveHouseholds(store);
    }

    res.json({ success: true, notification: notif });
  });

  // Atomic bill deletion endpoint
  app.post('/api/household/:id/delete-bill', (req, res) => {
    const { id } = req.params;
    const {
      billId,
      deletedBillIds = [],
      targetMonth,
      billName,
      canonicalKey,
      isSeries,
      seriesSlug,
      deletedSeriesSlugs = [],
      deletedMonthInstances = [],
    } = req.body;

    const cleanId = id.trim().toLowerCase();
    const { store, household } = getOrCreateHousehold(cleanId);
    const nowIso = new Date().toISOString();

    if (!household.deletedBillIds) household.deletedBillIds = [];
    if (!household.deletedSeriesSlugs) household.deletedSeriesSlugs = [];
    if (!household.deletedMonthInstances) household.deletedMonthInstances = [];

    const allDelIds = Array.from(new Set([...household.deletedBillIds, ...(Array.isArray(deletedBillIds) ? deletedBillIds : []), billId].filter(Boolean)));
    household.deletedBillIds = allDelIds;

    if (Array.isArray(deletedSeriesSlugs) && deletedSeriesSlugs.length > 0) {
      household.deletedSeriesSlugs = Array.from(new Set([...household.deletedSeriesSlugs, ...deletedSeriesSlugs]));
    }
    if (seriesSlug) {
      household.deletedSeriesSlugs = Array.from(new Set([...household.deletedSeriesSlugs, seriesSlug]));
    }

    if (Array.isArray(deletedMonthInstances) && deletedMonthInstances.length > 0) {
      household.deletedMonthInstances = Array.from(new Set([...household.deletedMonthInstances, ...deletedMonthInstances]));
    }

    const cleanTargetName = normalizeBillTitleServer(billName || '');

    // Purge from household.bills
    household.bills = (household.bills || []).filter((b: any) => {
      if (!b || !b.id) return false;
      if (allDelIds.includes(b.id)) return false;

      const bName = normalizeBillTitleServer(b.name);
      const bMonth = (b.dueDate || '').substring(0, 7) || '2026-10';

      if (isSeries) {
        if (cleanTargetName && bName === cleanTargetName) return false;
        if (seriesSlug && (b.parentRecurringId === seriesSlug || b.parentInstallmentId === seriesSlug)) return false;
      } else if (targetMonth && targetMonth === bMonth) {
        if (cleanTargetName && bName === cleanTargetName) return false;
        if (canonicalKey) {
          const bBarcode = (b.barcode || '').replace(/\D/g, '');
          if (bBarcode.length >= 10 && canonicalKey.includes(bBarcode)) return false;
        }
      }

      return true;
    });

    household.lastUpdated = nowIso;
    saveHouseholds(store);

    // Broadcast deletion in real time to all connected WebSocket clients
    broadcastWsEvent(cleanId, {
      type: 'BILL_DELETED_BROADCAST',
      householdId: cleanId,
      billId,
      deletedBillIds: allDelIds,
      targetMonth,
      billName,
      canonicalKey,
      isSeries: Boolean(isSeries),
      timestamp: nowIso,
    });

    res.json({ success: true, household, timestamp: nowIso });
  });

  // Atomic payment status update endpoint with instant WebSocket broadcast
  app.post('/api/household/:id/payment-status', (req, res) => {
    const { id } = req.params;
    const { billId, status, actor, deviceId, deviceName, paidAt, version, bill, canonicalKey, billName } = req.body;
    if (!billId || !status) {
      return res.status(400).json({ error: 'billId e status são obrigatórios' });
    }
    const cleanId = id.trim().toLowerCase();
    const { store, household } = getOrCreateHousehold(cleanId);
    const nowIso = new Date().toISOString();

    // Un-tombstone billId
    if (household.deletedBillIds) {
      household.deletedBillIds = household.deletedBillIds.filter((bid: string) => bid !== billId);
    }

    const cleanTargetName = normalizeBillTitleServer(billName || bill?.name || '');
    const targetMonth = (bill?.dueDate || '').substring(0, 7);
    const isWifeActor = Boolean(
      (actor || '').toLowerCase().includes('paula') ||
      (actor || '').toLowerCase().includes('esposa') ||
      (actor || '').toLowerCase().includes('cônjuge') ||
      (deviceName || '').toLowerCase().includes('paula') ||
      (deviceName || '').toLowerCase().includes('esposa')
    );
    const cleanActor = isWifeActor ? 'Paula' : (actor || 'Carlos');
    const canonicalDev = isWifeActor ? 'Paula (iPhone)' : resolveCanonicalDeviceName(cleanActor, deviceName);
    const isPaid = status === 'paid';

    let updatedBill: any = null;
    if (Array.isArray(household.bills)) {
      const idx = household.bills.findIndex((b: any) => 
        b && (
          b.id === billId ||
          (canonicalKey && (b.id === canonicalKey || b.id.includes(canonicalKey))) ||
          (cleanTargetName && b.name && normalizeBillTitleServer(b.name) === cleanTargetName && (!targetMonth || (b.dueDate || '').substring(0, 7) === targetMonth))
        )
      );

      if (idx !== -1) {
        const cur = household.bills[idx];
        updatedBill = {
          ...cur,
          status,
          paidAt: isPaid ? (paidAt || nowIso) : undefined,
          paidBy: isPaid ? cleanActor : undefined,
          lastEditedAt: nowIso,
          lastEditedBy: cleanActor,
          lastActionDescription: isPaid ? 'Marcou como Pago' : 'Reabriu como Pendente',
          updatedByDevice: canonicalDev,
          version: Math.max((cur.version || 1) + 1, (version || 1)),
          updatedAt: nowIso,
          isEdited: true,
        };
        household.bills[idx] = updatedBill;
      } else if (bill) {
        updatedBill = {
          ...bill,
          status,
          paidAt: isPaid ? (paidAt || nowIso) : undefined,
          paidBy: isPaid ? cleanActor : undefined,
          lastEditedAt: nowIso,
          lastEditedBy: cleanActor,
          lastActionDescription: isPaid ? 'Marcou como Pago' : 'Reabriu como Pendente',
          updatedByDevice: canonicalDev,
          version: Math.max((bill.version || 1), (version || 1)),
          updatedAt: nowIso,
          isEdited: true,
        };
        household.bills.unshift(updatedBill);
      }
    }

    if (updatedBill) {
      household.lastUpdated = nowIso;
      // Deduplicate and clean
      const dedupResult = deduplicateBillsServer(household.bills, household.deletedBillIds);
      household.bills = dedupResult.bills;
      household.deletedBillIds = dedupResult.deletedIds;
      store[cleanId] = household;
      saveHouseholds(store);

      // Record notification with full targetBillId and bill data
      const notif = recordChangeNotification(cleanId, {
        sourceDeviceId: deviceId || 'unknown_dev',
        sourceDeviceName: canonicalDev,
        sourceUserName: cleanActor,
        actionType: isPaid ? 'bill_paid' : 'bill_pending',
        title: isPaid ? 'Conta Paga! ✅' : 'Conta Reaberta 🔄',
        message: `${cleanActor} (${canonicalDev}) marcou "${updatedBill.name}" como ${isPaid ? 'PAGA' : 'Pendente'}`,
        targetItemName: updatedBill.name,
        targetBillId: updatedBill.id,
        bill: updatedBill,
        amount: updatedBill.amount,
      });
      broadcastChangeNotification(cleanId, notif);

      // Broadcast ultra-fast live status update to all connected WebSocket clients
      const liveBroadcastPayload = JSON.stringify({
        type: 'LIVE_STATUS_UPDATE_BROADCAST',
        householdId: cleanId,
        billId: updatedBill.id,
        status,
        paidAt: updatedBill.paidAt,
        paidBy: updatedBill.paidBy,
        actor: cleanActor,
        sourceDeviceName: canonicalDev,
        version: updatedBill.version,
        bill: updatedBill,
      });
      wsClients.forEach((client) => {
        if (client.ws.readyState === WebSocket.OPEN && client.householdId === cleanId) {
          try {
            client.ws.send(liveBroadcastPayload);
          } catch {}
        }
      });

      // Broadcast full sync to all connected devices
      broadcastHouseholdDataSync(cleanId, household, deviceId);

      return res.json({ success: true, bill: updatedBill, household, notification: notif });
    }

    return res.status(404).json({ error: 'Conta não encontrada no servidor' });
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
