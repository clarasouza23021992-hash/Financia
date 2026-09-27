import express from 'express';
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

interface HouseholdData {
  id: string;
  name: string;
  code: string;
  bills: any[];
  revenues: any[];
  profiles: any[];
  devices: CloudDeviceRecord[];
  lastUpdated: string;
  deletedBillIds?: string[];
  deletedRevenueIds?: string[];
}

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'households.json');

// Ensure data folder and file exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Filter out only explicitly marked mock/demo seed items, NEVER real user bills
function isMockBillServer(b: any): boolean {
  if (!b) return false;
  return b.isMockSeed === true || b.isDemoPlaceholder === true;
}

// Filter out only explicitly marked mock/demo seed revenues
function isMockRevenueServer(r: any): boolean {
  if (!r) return false;
  return r.isMockSeed === true || r.isDemoPlaceholder === true;
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

// Server-side bill deduplication to eliminate duplicate bills and phantom 0.00 records
function deduplicateBillsServer(bills: any[], deletedIds: string[] = []): { bills: any[]; deletedIds: string[] } {
  if (!Array.isArray(bills)) return { bills: [], deletedIds };
  const deletedSet = new Set(deletedIds);
  const map = new Map<string, any>();
  const extraDeleted: string[] = [];

  for (const b of bills) {
    if (!b || !b.id || isMockBillServer(b) || deletedSet.has(b.id)) {
      if (b?.id && !deletedSet.has(b.id) && isMockBillServer(b)) {
        deletedSet.add(b.id);
        extraDeleted.push(b.id);
      }
      continue;
    }

    const month = (b.dueDate || '').substring(0, 7);
    const cleanName = (b.name || '').trim().toLowerCase();
    const cleanBarcode = (b.barcode || '').replace(/\D/g, '');
    const key = cleanBarcode.length >= 10 ? `barcode_${month}_${cleanBarcode}` : `name_${month}_${cleanName}`;

    if (map.has(key)) {
      const existing = map.get(key);
      let keepIncoming = false;
      if (b.status === 'paid' && existing.status !== 'paid') {
        keepIncoming = true;
      } else if (existing.status === 'paid' && b.status !== 'paid') {
        keepIncoming = false;
      } else if (b.receiptUrl && !existing.receiptUrl) {
        keepIncoming = true;
      } else if (existing.receiptUrl && !b.receiptUrl) {
        keepIncoming = false;
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
    if (b.recurrence === 'Mensal Fixa' || b.recurrence === 'Parcelada' || b.fixedValueType || b.isProjected) {
      finalList.push(b);
      continue;
    }

    const bMonth = (b.dueDate || '').substring(0, 7);
    const bName = (b.name || '').trim().toLowerCase();
    const bBarcode = (b.barcode || '').replace(/\D/g, '');

    // Check if there is a newer scheduled version of this single pontual bill in a later month
    const hasLaterMonthVersion = list.some(other => {
      if (other.id === b.id) return false;
      if (other.recurrence === 'Mensal Fixa' || other.recurrence === 'Parcelada' || other.fixedValueType) return false;
      const otherMonth = (other.dueDate || '').substring(0, 7);
      if (otherMonth <= bMonth) return false;
      const otherBarcode = (other.barcode || '').replace(/\D/g, '');
      if (bBarcode.length >= 10 && otherBarcode === bBarcode) return true;
      return other.name.trim().toLowerCase() === bName && (b.id.startsWith('bill-carried-') || b.isCarriedOver);
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

    const existing = map.get(r.id);
    if (!existing) {
      map.set(r.id, r);
    } else {
      const incVersion = r.version || 0;
      const curVersion = existing.version || 0;
      const incUpdated = new Date(r.updatedAt || 0).getTime();
      const curUpdated = new Date(existing.updatedAt || 0).getTime();

      if (incVersion > curVersion || incUpdated >= curUpdated) {
        map.set(r.id, r);
      }
    }
  }

  return Array.from(map.values());
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '25mb' }));

  // API Health Check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Get Household Data
  app.get('/api/household/:id', (req, res) => {
    const { id } = req.params;
    const cleanId = id.trim().toLowerCase();
    const store = loadHouseholds();
    const household = store[cleanId];

    if (!household) {
      return res.status(404).json({ error: 'Casa não encontrada' });
    }

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

    // Filter out only obsolete mock static placeholder IDs, preserving all real user phones
    household.devices = (household.devices || []).filter(
      (d) =>
        d.id !== 'dev_iphone_paula' &&
        d.id !== 'dev_iphone_carlos' &&
        d.id !== 'dev_user_main'
    );

    // Update devices list with caller
    if (device && device.id) {
      const existingDevIdx = household.devices.findIndex((d) => d.id === device.id);
      const updatedDev: CloudDeviceRecord = {
        id: device.id,
        name: device.name || 'Celular Conectado',
        model: device.model || 'Smartphone',
        owner: device.owner || 'Morador',
        lastActive: 'Agora mesmo',
        connectedAt: existingDevIdx >= 0 ? household.devices[existingDevIdx].connectedAt : nowIso,
        userAgent: req.headers['user-agent']?.slice(0, 120),
      };

      if (existingDevIdx >= 0) {
        household.devices[existingDevIdx] = updatedDev;
      } else {
        household.devices.push(updatedDev);
      }
    }

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

          if (incVersion > curVersion || incUpdated >= curUpdated) {
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

    household.lastUpdated = nowIso;
    store[cleanId] = household;
    saveHouseholds(store);

    res.json({
      success: true,
      household,
      serverTime: nowIso,
    });
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
