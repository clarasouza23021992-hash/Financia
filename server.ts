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

// Filter out only exact original dummy mock bills, never user bills
function isMockBillServer(b: any): boolean {
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

function loadHouseholds(): Record<string, HouseholdData> {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const store: Record<string, HouseholdData> = JSON.parse(raw);
      // Clean mock bills from all households
      let changed = false;
      Object.keys(store).forEach(k => {
        const h = store[k];
        if (h && Array.isArray(h.bills)) {
          const originalLen = h.bills.length;
          h.bills = h.bills.filter((b: any) => !isMockBillServer(b));
          if (h.bills.length !== originalLen) changed = true;
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

// Server-side revenue deduplication to eliminate duplicate salaries
function deduplicateRevenuesServer(revs: any[], deletedIds: string[] = []): any[] {
  if (!Array.isArray(revs)) return [];

  const map = new Map<string, any>();
  for (const r of revs) {
    if (!r || !r.id) continue;
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

      household.bills = Array.from(billMap.values()).filter((b: any) => !isMockBillServer(b));
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

  // Vite middleware setup
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
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
