import fs from 'fs';
import path from 'path';
import { generateCoupleData } from '../src/utils/couplePresetData.js';

const DATA_FILE = path.join(process.cwd(), 'data', 'households.json');
const BACKUPS_DIR = path.join(process.cwd(), 'data', 'backups');

const { bills, revenues } = generateCoupleData();

const profiles = [
  {
    id: 'p1',
    name: 'Carlos',
    role: 'Administrador da Casa',
    splitShare: 50,
    splitPercentage: 50,
    color: '#3B82F6',
    avatar: '👤',
    phone: '',
  },
  {
    id: 'p2',
    name: 'Paula',
    role: 'Administradora da Casa',
    splitShare: 50,
    splitPercentage: 50,
    color: '#EC4899',
    avatar: '👩🏻',
    phone: '',
  },
];

const devices = [
  {
    id: 'dev_user_main',
    name: 'Carlos (iPhone)',
    model: 'iPhone (Tela de Início)',
    owner: 'Você',
    lastActive: new Date().toISOString(),
    connectedAt: '2026-10-10T14:36:14.945Z',
  },
  {
    id: 'dev_esposa_paula',
    name: 'Paula (iPhone)',
    model: 'iPhone 15 Pro',
    owner: 'Esposa',
    lastActive: new Date().toISOString(),
    connectedAt: '2026-10-10T14:36:14.945Z',
  },
];

const notifications = [
  {
    id: 'notif-1791499592140-c7a28',
    householdId: 'casa-familia',
    sourceDeviceId: 'dev_esposa_paula',
    sourceDeviceName: 'Paula (iPhone)',
    sourceUserName: 'Paula',
    actionType: 'bill_paid',
    title: 'Conta Paga! ✅',
    message: 'Paula marcou "Teste Luz" como PAGA',
    targetItemName: 'Teste Luz',
    amount: 150,
    timestamp: '2026-10-08T22:46:32.140Z',
  },
  {
    id: 'notif-streaming-carlos',
    householdId: 'casa-familia',
    sourceDeviceId: 'dev_user_main',
    sourceDeviceName: 'Carlos (iPhone)',
    sourceUserName: 'Carlos',
    actionType: 'bill_paid',
    title: 'Conta Paga! ✅',
    message: 'Carlos marcou "Streaming & Assinaturas" como PAGA',
    targetItemName: 'Streaming & Assinaturas',
    amount: 69.9,
    timestamp: '2026-10-05T12:00:00.000Z',
  },
];

const nowIso = new Date().toISOString();

const casaFamilia = {
  id: 'casa-familia',
  name: 'Minha Casa',
  code: 'CASA-FAMILIA',
  bills,
  revenues,
  profiles,
  devices,
  isWifeConnected: true,
  lastUpdated: nowIso,
  deletedBillIds: [],
  deletedRevenueIds: [],
  deletedSeriesSlugs: [],
  deletedMonthInstances: [],
  notifications,
};

const minhaCasa = {
  id: 'minha-casa',
  name: 'Minha Casa',
  code: 'MINHA-CASA',
  bills,
  revenues,
  profiles,
  devices,
  isWifeConnected: true,
  lastUpdated: nowIso,
  deletedBillIds: [],
  deletedRevenueIds: [],
  deletedSeriesSlugs: [],
  deletedMonthInstances: [],
  notifications,
};

const data = {
  'casa-familia': casaFamilia,
  'minha-casa': minhaCasa,
};

if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');

const backupFile = path.join(BACKUPS_DIR, `backup_restored_couple_${Date.now()}.json`);
fs.writeFileSync(backupFile, JSON.stringify({ household: casaFamilia }, null, 2), 'utf-8');

console.log(`Restored successfully: ${bills.length} bills, ${revenues.length} revenues!`);
