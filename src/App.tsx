import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Filter, Plus, FileText, TrendingUp, 
  Cloud, Users, Bell, AlertTriangle, CheckCircle2, ChevronRight,
  ShieldCheck, Share2, Sparkles, SlidersHorizontal,
  RefreshCw, ScanLine, Calculator
} from 'lucide-react';
import { Bill, Revenue, CloudDevice, UserProfile, NotificationSetting, SyncConflictLog } from './types/finance';
import { cloudkit, isMockBill } from './services/cloudkitSync';
import { Header } from './components/Header';
import { KpiCards } from './components/KpiCards';
import { BillCard } from './components/BillCard';
import { BillModal } from './components/BillModal';
import { RevenueModal } from './components/RevenueModal';
import { CashFlowReport } from './components/CashFlowReport';
import { CloudKitSyncDrawer } from './components/CloudKitSyncDrawer';
import { BoletoScannerModal } from './components/BoletoScannerModal';
import { ProfilesModal } from './components/ProfilesModal';
import { ReceiptViewerModal } from './components/ReceiptViewerModal';
import { MonthSelector, MonthOption, INITIAL_SUBSEQUENT_MONTHS } from './components/MonthSelector';
import { CoupleRevenueCard } from './components/CoupleRevenueCard';
import { EditCoupleSalariesModal } from './components/EditCoupleSalariesModal';
import { WifeConnectionModal } from './components/WifeConnectionModal';
import { PullToRefresh } from './components/PullToRefresh';
import { CalculatorModal } from './components/CalculatorModal';
import { DeleteBillModal } from './components/DeleteBillModal';
import { parseScannedBoletoOrPix } from './utils/pixParser';

export default function App() {
  // Core State backed by CloudKit Sync Engine
  const [bills, setBills] = useState<Bill[]>(() => cloudkit.getBills());
  const [revenues, setRevenues] = useState<Revenue[]>(() => cloudkit.getRevenues());
  const [devices, setDevices] = useState<CloudDevice[]>(() => cloudkit.getDevices());
  const [activeDeviceId, setActiveDeviceId] = useState<string>(() => cloudkit.getActiveDevice().id);
  const [conflictLogs, setConflictLogs] = useState<SyncConflictLog[]>(() => cloudkit.getConflictLogs());
  const [isOffline, setIsOffline] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [billToDelete, setBillToDelete] = useState<Bill | null>(null);

  // Wife Connection State
  const [isWifeConnectModalOpen, setIsWifeConnectModalOpen] = useState(false);

  const isWifeConnected = useMemo(() => {
    return devices.some(d => !d.isCurrent && d.id !== activeDeviceId);
  }, [devices, activeDeviceId]);

  const wifeDevice = useMemo(() => {
    return devices.find(d => !d.isCurrent && d.id !== activeDeviceId) || null;
  }, [devices, activeDeviceId]);

  // App Navigation, Months & Filters
  const [currentTab, setCurrentTab] = useState<'bills' | 'cashflow'>('bills');
  const [selectedMonth, setSelectedMonth] = useState<MonthOption>({
    id: '2026-10',
    label: 'Outubro de 2026',
    shortLabel: 'Out 2026',
    isCurrent: true,
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todas');

  // Dark Mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('financas_dark_mode') === 'true';
    }
    return false;
  });

  // Modals
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState<Revenue | null>(null);

  const [isEditSalariesModalOpen, setIsEditSalariesModalOpen] = useState(false);

  const [isCloudDrawerOpen, setIsCloudDrawerOpen] = useState(false);
  const [isBoletoScannerOpen, setIsBoletoScannerOpen] = useState(false);
  const [isProfilesModalOpen, setIsProfilesModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [viewingReceiptBill, setViewingReceiptBill] = useState<Bill | null>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  // In-App Due Date Notification Alert Banner
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // Map other months that contain bills (in case bills are in a different month)
  const otherMonthsWithBills = useMemo(() => {
    const map = new Map<string, number>();
    bills.forEach(b => {
      const m = (b.dueDate || '').slice(0, 7);
      if (m && m !== selectedMonth.id) {
        map.set(m, (map.get(m) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([monthId, count]) => ({ monthId, count }));
  }, [bills, selectedMonth.id]);

  // Profiles and Notifications
  const [profiles, setProfiles] = useState<UserProfile[]>(() => cloudkit.getProfiles());

  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    { id: 'notif-1', title: 'Avisar 3 dias antes do vencimento', daysBeforeDue: 3, enabled: true },
    { id: 'notif-2', title: 'Avisar no dia do vencimento às 09:00', daysBeforeDue: 0, enabled: true },
    { id: 'notif-3', title: 'Alerta vermelho para contas atrasadas', daysBeforeDue: -1, enabled: true },
    { id: 'notif-4', title: 'Notificar quando o cônjuge/morador anexar comprovante', daysBeforeDue: 0, enabled: true },
  ]);

  // Automatic check to ensure bills & revenues are safe, recurring bills and revenues auto-populate subsequent months, and debts are not in revenues
  useEffect(() => {
    // Thorough deduplication to remove any repeating debts and restore clean originals
    cloudkit.cleanupAndDeduplicateAllBills();
    cloudkit.ensureDefaultDataIfEmpty();
    cloudkit.sanitizeAndMigrateMismatchedRevenues();
    const updatedBills = cloudkit.cleanupAndDeduplicateAllBills();
    const updatedRevs = cloudkit.autoPropagateRecurringRevenues();
    setBills(updatedBills);
    setRevenues(updatedRevs);
  }, []);

  // When selected month changes, ensure all recurring and installment bills & revenues are populated
  useEffect(() => {
    const updatedBills = cloudkit.ensureRecurringBillsForMonth(selectedMonth.id);
    setBills(updatedBills);
    const updatedRevs = cloudkit.ensureRecurringRevenuesForMonth(selectedMonth.id);
    setRevenues(updatedRevs);
  }, [selectedMonth.id]);

  // Sync with CloudKit Real-Time BroadcastChannel
  useEffect(() => {
    const unsubscribe = cloudkit.onSync((event) => {
      if (event.type === 'BILLS_UPDATED' || event.type === 'BILL_UPSERTED' || event.type === 'BILL_DELETED') {
        setBills(cloudkit.getBills());
        setConflictLogs(cloudkit.getConflictLogs());
      } else if (event.type === 'REVENUES_UPDATED' || event.type === 'REVENUE_UPSERTED' || event.type === 'REVENUE_DELETED') {
        setRevenues(cloudkit.getRevenues());
      } else if (event.type === 'DEVICES_UPDATED') {
        setDevices(cloudkit.getDevices());
      } else if (event.type === 'PROFILES_UPDATED') {
        setProfiles(cloudkit.getProfiles());
      } else if (event.type === 'SYNC_COMPLETED') {
        setBills(cloudkit.getBills());
        setRevenues(cloudkit.getRevenues());
        setProfiles(cloudkit.getProfiles());
        setDevices(cloudkit.getDevices());
      }
    });

    return () => unsubscribe();
  }, []);

  // Check for upcoming bills in current selected month to notify automatically
  useEffect(() => {
    const currentMonthPrefix = selectedMonth.id;
    const monthBills = bills.filter(b => (b.dueDate || '').startsWith(currentMonthPrefix));
    const overdue = monthBills.find(b => b.status === 'overdue');
    if (overdue) {
      setToastNotification(`⚠️ Lembrete de Conta Atrasada: ${overdue.name} (R$ ${Number(overdue.amount || 0).toFixed(2)})`);
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      const dueSoon = monthBills.find(b => b.status === 'pending' && (b.dueDate || '') >= todayStr);
      if (dueSoon) {
        setToastNotification(`⏰ Próximo Vencimento: ${dueSoon.name} vence em breve (R$ ${Number(dueSoon.amount || 0).toFixed(2)})`);
      }
    }
  }, [bills, selectedMonth.id]);

  const showTemporaryToast = (msg: string) => {
    setToastNotification(msg);
    setTimeout(() => {
      setToastNotification(null);
    }, 4500);
  };

  // Manual refresh / pull to refresh handler (pull-down gesture and button)
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await cloudkit.syncWithServer();
      setBills(cloudkit.getBills());
      setRevenues(cloudkit.getRevenues());
      setDevices(cloudkit.getDevices());
      setProfiles(cloudkit.getProfiles());
      showTemporaryToast(res.message || 'Sincronizado com sucesso!');
    } catch {
      setBills(cloudkit.getBills());
      setRevenues(cloudkit.getRevenues());
      showTemporaryToast('Atualizado localmente com sucesso.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Hard reload and cache busting for iPhone / PWA
  const handleForceAppReload = async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
      }
    } catch {}
    const url = new URL(window.location.href);
    url.searchParams.set('reload', String(Date.now()));
    window.location.href = url.toString();
  };

  const handleToggleDarkMode = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('financas_dark_mode', String(next));
      return next;
    });
  };

  const activeDevice = useMemo(() => {
    return devices.find(d => d.id === activeDeviceId) || devices[0];
  }, [devices, activeDeviceId]);

  // Month-aware Bills: returns actual saved bills for the selected month
  const currentMonthBills = useMemo(() => {
    return bills.filter(b => (b.dueDate || '').startsWith(selectedMonth.id));
  }, [bills, selectedMonth.id]);

  // Month-aware Revenues: returns actual saved revenues for the selected month
  const currentMonthRevenues = useMemo(() => {
    return revenues.filter(r => (r.date || '').startsWith(selectedMonth.id));
  }, [revenues, selectedMonth.id]);

  // Check if initial sample mock bills are present in current bills
  const hasMockBills = useMemo(() => {
    return bills.some(b => isMockBill(b));
  }, [bills]);

  // Salaries of Resident 1 and Resident 2 (Editable by user)
  const carlosCurrentSalary = useMemo(() => {
    const userPName = profiles[0]?.name || 'Carlos';
    const r = currentMonthRevenues.find(x => 
      x.profileName === userPName || 
      x.profileName === 'Carlos' || 
      x.name.toLowerCase().includes(userPName.toLowerCase())
    );
    return r ? r.amount : 0;
  }, [currentMonthRevenues, profiles]);

  const paulaCurrentSalary = useMemo(() => {
    const spousePName = profiles[1]?.name || 'Paula';
    const r = currentMonthRevenues.find(x => 
      x.profileName === spousePName || 
      x.profileName === 'Paula' || 
      x.profileName === 'Esposa' || 
      x.name.toLowerCase().includes(spousePName.toLowerCase())
    );
    return r ? r.amount : 0;
  }, [currentMonthRevenues, profiles]);

  // Total Combined Revenue of the Household for the selected month
  const totalGrandRevenue = useMemo(() => {
    return currentMonthRevenues.reduce((sum, r) => sum + r.amount, 0);
  }, [currentMonthRevenues]);

  // Handler to edit and save Carlos & Paula salaries
  const handleSaveCoupleSalaries = (carlosAmount: number, paulaAmount: number) => {
    cloudkit.updateCoupleSalaries(carlosAmount, paulaAmount, selectedMonth.id);
    setRevenues(cloudkit.getRevenues());
    showTemporaryToast(`Salários atualizados: Carlos (R$ ${carlosAmount.toFixed(2)}) e Paula (R$ ${paulaAmount.toFixed(2)})`);
  };

  // Handler to clear fictitious demo bills so user sees only real data
  const handleClearMockBills = () => {
    if (confirm('Deseja remover as contas de demonstração e manter apenas os seus lançamentos reais?')) {
      const remaining = cloudkit.clearMockBills();
      setBills(remaining);
      showTemporaryToast('Contas de exemplo removidas. Apenas seus lançamentos reais permanecem salvos!');
    }
  };

  // Filtered Bills sorted alphabetically (A-Z) based on status, search, and category
  const filteredBills = useMemo(() => {
    const list = currentMonthBills.filter(bill => {
      // Status Filter
      if (statusFilter === 'pending' && bill.status !== 'pending') return false;
      if (statusFilter === 'paid' && bill.status !== 'paid') return false;
      if (statusFilter === 'overdue' && bill.status !== 'overdue') return false;

      // Category Filter
      if (categoryFilter !== 'Todas' && bill.category !== categoryFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = (bill.name || '').toLowerCase().includes(query);
        const matchesFavored = (bill.favored || '').toLowerCase().includes(query);
        const matchesCategory = (bill.category || '').toLowerCase().includes(query);
        const matchesBarcode = (bill.barcode || '').includes(query);
        if (!matchesName && !matchesFavored && !matchesCategory && !matchesBarcode) return false;
      }

      return true;
    });

    // Ordenação alfabética de A a Z solicitada pelo usuário
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }));
  }, [currentMonthBills, statusFilter, categoryFilter, searchQuery]);

  // Categories list for filter chips
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    currentMonthBills.forEach(b => set.add(b.category));
    return ['Todas', ...Array.from(set)];
  }, [currentMonthBills]);

  // Handlers for Bill operations
  const handleSaveBill = (
    billData: Partial<Bill> & { applyToFutureMonths?: boolean; previousName?: string },
    installmentConfig?: {
      totalInstallments: number;
      currentInstallment: number;
      valueIsPerInstallment: boolean;
    }
  ) => {
    // 1. Ensure existing bill's unique ID is properly referenced instead of triggering an insert
    let targetId = billData.id || editingBill?.id;

    if (!targetId) {
      const allBills = cloudkit.getBills();
      const cleanBarcode = (billData.barcode || '').replace(/\D/g, '');
      const cleanName = (billData.name || '').trim().toLowerCase();
      const targetMonth = (billData.dueDate || '').substring(0, 7);

      const matchedExisting = allBills.find(b => {
        const bBarcode = (b.barcode || '').replace(/\D/g, '');
        if (cleanBarcode.length >= 10 && bBarcode === cleanBarcode) return true;
        const bMonth = (b.dueDate || '').substring(0, 7);
        const bName = b.name.trim().toLowerCase();
        return (bMonth === targetMonth || bMonth === selectedMonth.id) && bName === cleanName;
      });

      if (matchedExisting) {
        targetId = matchedExisting.id;
      }
    }

    const finalBillData: Partial<Bill> & { applyToFutureMonths?: boolean; previousName?: string } = {
      ...(editingBill || {}),
      ...billData,
      id: targetId,
      applyToFutureMonths: billData.applyToFutureMonths,
      previousName: billData.previousName || editingBill?.name,
    };

    if (finalBillData.recurrence === 'Parcelada' && installmentConfig && installmentConfig.totalInstallments > 1) {
      cloudkit.saveBillWithInstallments(finalBillData, installmentConfig);
    } else {
      cloudkit.saveBill(finalBillData);
    }
    setBills(cloudkit.getBills());
    setConflictLogs(cloudkit.getConflictLogs());
    setEditingBill(null);

    const billMonth = (finalBillData.dueDate || '').substring(0, 7);
    const monthNames: Record<string, string> = {
      '2026-08': 'Agosto/2026',
      '2026-09': 'Setembro/2026',
      '2026-10': 'Outubro/2026',
      '2026-11': 'Novembro/2026',
      '2026-12': 'Dezembro/2026',
      '2027-01': 'Janeiro/2027',
      '2027-02': 'Fevereiro/2027',
      '2027-03': 'Março/2027',
    };
    const targetLabel = monthNames[billMonth] || billMonth;

    if (finalBillData.recurrence === 'Parcelada' && installmentConfig && installmentConfig.totalInstallments > 1) {
      showTemporaryToast(`✅ Dívida parcelada em ${installmentConfig.totalInstallments}x salva e lançada nos próximos meses!`);
    } else if (billMonth && billMonth !== selectedMonth.id) {
      const targetMonthOption = INITIAL_SUBSEQUENT_MONTHS.find(m => m.id === billMonth) || {
        id: billMonth,
        label: targetLabel,
        shortLabel: billMonth,
      };
      setSelectedMonth(targetMonthOption);
      showTemporaryToast(`✅ Conta salva com vencimento em ${targetLabel}!`);
    } else {
      showTemporaryToast(targetId ? 'Conta atualizada com sucesso!' : 'Nova conta cadastrada e sincronizada!');
    }
  };

  const handleMoveBillMonth = (bill: Bill, targetMonthId: string) => {
    const currentDay = (bill.dueDate.split('-')[2] || '10').padStart(2, '0');
    const [y, m] = targetMonthId.split('-').map(Number);
    const maxDays = new Date(y, m, 0).getDate();
    const safeDay = String(Math.min(parseInt(currentDay, 10), maxDays)).padStart(2, '0');
    const newDueDate = `${targetMonthId}-${safeDay}`;

    cloudkit.saveBill({
      ...bill,
      dueDate: newDueDate,
    });
    setBills(cloudkit.getBills());
    setConflictLogs(cloudkit.getConflictLogs());

    const monthNames: Record<string, string> = {
      '2026-08': 'Agosto/2026',
      '2026-09': 'Setembro/2026',
      '2026-10': 'Outubro/2026',
      '2026-11': 'Novembro/2026',
      '2026-12': 'Dezembro/2026',
      '2027-01': 'Janeiro/2027',
      '2027-02': 'Fevereiro/2027',
      '2027-03': 'Março/2027',
    };
    const targetLabel = monthNames[targetMonthId] || targetMonthId;
    const targetMonthOption = INITIAL_SUBSEQUENT_MONTHS.find(m => m.id === targetMonthId) || {
      id: targetMonthId,
      label: targetLabel,
      shortLabel: targetMonthId,
    };
    setSelectedMonth(targetMonthOption);
    showTemporaryToast(`✅ Dívida "${bill.name}" movida para ${targetLabel}!`);
  };

  const handleDeleteBill = (bill: Bill) => {
    setBillToDelete(bill);
  };

  const handleDeleteSingleMonth = (bill: Bill) => {
    cloudkit.deleteBill(bill.id);
    setBills(cloudkit.getBills());
    setBillToDelete(null);
    showTemporaryToast(`Conta "${bill.name}" excluída de ${selectedMonth.label}.`);
  };

  const handleDeleteAllMonths = (bill: Bill) => {
    const deletedIds = cloudkit.deleteBillSeries(bill);
    setBills(cloudkit.getBills());
    setBillToDelete(null);
    showTemporaryToast(`🗑️ Dívida "${bill.name}" removida de todos os meses (${deletedIds.length} ocorrências)!`);
  };

  const handleTogglePaid = (bill: Bill) => {
    const newStatus = bill.status === 'paid' ? 'pending' : 'paid';
    cloudkit.toggleBillStatus(bill.id, newStatus);
    setBills(cloudkit.getBills());
    showTemporaryToast(newStatus === 'paid' ? `Conta "${bill.name}" marcada como Paga!` : 'Status revertido para Pendente.');
  };

  // Handlers for Revenue operations
  const handleSaveRevenue = (revData: Partial<Revenue> & { name: string; amount: number; date: string; category: string }) => {
    // If user saved a bill/debt in revenue form, intercept it, save as Bill, and do not save as Revenue!
    if (cloudkit.isDebtExpense(revData)) {
      const billData: Partial<Bill> = {
        name: revData.name,
        amount: revData.amount,
        dueDate: revData.date,
        category: cloudkit.guessCategoryFromName(revData.name),
        favored: revData.name.replace(/^Conta\s*[-:]\s*/i, '').replace(/^Conta\s*de\s*/i, '').trim() || revData.name,
        status: 'paid',
        recurrence: 'Mensal Fixa',
        fixedValueType: revData.amount > 0 ? 'fixed_value' : 'variable_value',
        splitHousehold: true,
      };
      cloudkit.saveBill(billData);
      setBills(cloudkit.getBills());
      setRevenues(cloudkit.getRevenues());
      showTemporaryToast(`Conta "${revData.name}" direcionada com sucesso para Dívidas do Lar!`);
      return;
    }

    cloudkit.saveRevenue(revData);
    setRevenues(cloudkit.getRevenues());
    showTemporaryToast('Receita adicionada ao Fluxo de Caixa!');
  };

  const handleDeleteRevenue = (id: string) => {
    cloudkit.deleteRevenue(id);
    setRevenues(cloudkit.getRevenues());
    showTemporaryToast('Receita removida.');
  };

  // Handlers for Receipt viewing & attaching
  const handleViewReceipt = (bill: Bill) => {
    setViewingReceiptBill(bill);
    setIsReceiptModalOpen(true);
  };

  const handleAttachReceipt = (bill: Bill) => {
    setEditingBill(bill);
    setIsBillModalOpen(true);
  };

  // Open WhatsApp Share with all pending bills
  const handleShareWhatsApp = () => {
    const pending = currentMonthBills.filter(b => b.status === 'pending' || b.status === 'overdue');
    const total = pending.reduce((sum, b) => sum + b.amount, 0);
    const half = total / 2;

    let text = `*Resumo de Contas do Lar - Finanças da Minha Casa*\n`;
    text += `📅 Mês: ${selectedMonth.label}\n`;
    text += `💰 Total Pendente: R$ ${total.toFixed(2).replace('.', ',')}\n`;
    text += `👥 Divisão: R$ ${half.toFixed(2).replace('.', ',')} para cada (Carlos & Paula)\n\n`;
    text += `*Contas a pagar:*\n`;
    pending.forEach((b, i) => {
      text += `${i + 1}. ${b.name} - R$ ${b.amount.toFixed(2).replace('.', ',')} (Vence: ${b.dueDate})\n`;
      if (b.pixKey) text += `   Pix: ${b.pixKey}\n`;
    });

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Device switch
  const handleSwitchDevice = (deviceId: string) => {
    cloudkit.switchActiveDevice(deviceId);
    setActiveDeviceId(deviceId);
    const updatedDevices = cloudkit.getDevices();
    setDevices(updatedDevices);
    const targetDev = updatedDevices.find(d => d.id === deviceId);
    showTemporaryToast(`Dispositivo ativo: ${targetDev?.name || 'Aparelho Selecionado'}`);
  };

  // Force CloudKit sync
  const handleForceSync = async () => {
    await cloudkit.forceSyncWithCloud();
    setBills(cloudkit.getBills());
    setRevenues(cloudkit.getRevenues());
    setConflictLogs(cloudkit.getConflictLogs());
    setDevices(cloudkit.getDevices());
  };

  // Remove Device from household
  const handleRemoveDevice = async (deviceId: string) => {
    await cloudkit.removeDevice(deviceId);
    setDevices(cloudkit.getDevices());
    showTemporaryToast('Aparelho desconectado com sucesso.');
  };

  // Update Device name / model
  const handleUpdateDevice = (deviceId: string, updates: Partial<CloudDevice>) => {
    cloudkit.updateDevice(deviceId, updates);
    setDevices(cloudkit.getDevices());
    setActiveDeviceId(deviceId);
    showTemporaryToast('Nome do aparelho atualizado com sucesso!');
  };

  // Update user / resident profiles
  const handleUpdateProfiles = (newProfiles: UserProfile[]) => {
    setProfiles(newProfiles);
    cloudkit.saveProfiles(newProfiles);
    showTemporaryToast('Nome de usuário e moradores atualizados com sucesso!');
  };

  // Boleto / Pix AI Scanner completed
  const handleBoletoScanned = (scannedData: Partial<Bill>) => {
    const processed = parseScannedBoletoOrPix(scannedData, selectedMonth.id);
    const allBills = cloudkit.getBills();
    const cleanBarcode = (processed.barcode || '').replace(/\D/g, '');
    const cleanName = (processed.name || '').trim().toLowerCase();
    const cleanFavored = (processed.favored || '').trim().toLowerCase();

    const existingMatch = allBills.find(b => {
      const bBarcode = (b.barcode || '').replace(/\D/g, '');
      if (cleanBarcode.length >= 10 && bBarcode === cleanBarcode) return true;
      const bName = b.name.trim().toLowerCase();
      const bFavored = (b.favored || '').trim().toLowerCase();
      return bName === cleanName || (cleanFavored.length > 3 && bFavored === cleanFavored);
    });

    const billToEdit: Partial<Bill> = {
      ...(existingMatch || {}),
      ...processed,
      pixType: processed.pixType as any,
      recurrence: (processed.recurrence as any) || 'Mensal Fixa',
      id: scannedData.id || processed.id || existingMatch?.id,
    };

    setEditingBill(billToEdit as Bill);
    setIsBillModalOpen(true);
    const dueDateDisplay = billToEdit.dueDate ? billToEdit.dueDate.split('-').reverse().join('/') : '';
    showTemporaryToast(
      `✨ Boleto/Pix processado: Favorecido "${billToEdit.favored || billToEdit.name}" e Vencimento (${dueDateDisplay}) preenchidos automaticamente!`
    );
  };

  return (
    <div className={`h-full min-h-0 flex flex-col font-sans transition-colors duration-300 w-full overflow-hidden ${
      isDarkMode ? 'dark bg-[#080D1E] text-white' : 'bg-[#F4F6F9] text-slate-900'
    }`}>
      {/* Native App Header */}
      <Header
        activeDevice={activeDevice}
        onOpenNewBill={() => {
          setEditingBill(null);
          setIsBillModalOpen(true);
        }}
        onOpenNewRevenue={() => {
          setEditingRevenue(null);
          setIsRevenueModalOpen(true);
        }}
        onOpenCloudSync={() => setIsCloudDrawerOpen(true)}
        onOpenCalculator={() => setIsCalculatorOpen(true)}
        onOpenWifeConnect={() => setIsWifeConnectModalOpen(true)}
        onOpenBoletoScanner={() => setIsBoletoScannerOpen(true)}
        onOpenProfiles={() => setIsProfilesModalOpen(true)}
        onQuickPayFilter={() => setStatusFilter('pending')}
        onShareWhatsApp={handleShareWhatsApp}
        onManualRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
        isOffline={isOffline}
        isWifeConnected={isWifeConnected}
      />

      {/* Intelligent Due Date Notification Toast Banner */}
      {toastNotification && (
        <div className="max-w-xl md:max-w-2xl lg:max-w-3xl w-full mx-auto px-4 mt-2.5 flex-shrink-0">
          <div className="bg-slate-900 dark:bg-slate-800 text-white px-4 py-2.5 rounded-2xl shadow-lg border border-slate-700/80 flex items-center justify-between gap-2 animate-fade-in text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Bell className="w-4 h-4 text-[#FFD166] flex-shrink-0 animate-pulse" />
              <span className="font-semibold truncate">{toastNotification}</span>
            </div>
            <button
              onClick={() => setToastNotification(null)}
              className="text-slate-400 hover:text-white text-[11px] font-bold px-1.5 py-0.5 flex-shrink-0"
            >
              Dispensar
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area with Pull-To-Refresh Support */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden w-full min-h-0 pb-8">
        <div className="max-w-xl md:max-w-2xl lg:max-w-3xl w-full mx-auto min-h-full">
          <PullToRefresh onRefresh={handleManualRefresh} isRefreshing={isRefreshing}>
        {currentTab === 'bills' && (
          <div className="space-y-1">
            {/* 1. Month Selector with Subsequent Months starting October 2026 */}
            <MonthSelector
              selectedMonthId={selectedMonth.id}
              onSelectMonth={(month) => {
                setSelectedMonth(month);
                const updated = cloudkit.autoPropagateRecurringBills([month.id]);
                setBills(updated);
              }}
              bills={bills}
            />

            {/* Quick Pull / Manual Refresh Toolbar Bar */}
            <div className="mx-4 my-1 px-3 py-1.5 bg-white dark:bg-[#131D38] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between text-xs shadow-xs">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium text-[11px] truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                <span className="truncate">Puxe a tela para baixo</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  id="btn-sync-now"
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-1 font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 active:scale-95 transition-all px-2.5 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 text-[11px]"
                  title="Sincronizar dados com os outros celulares da casa"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'Atualizando...' : 'Atualizar Agora'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleForceAppReload}
                  className="flex items-center gap-1 font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 active:scale-95 transition-all px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px]"
                  title="Forçar recarregamento do app limpando o cache do iPhone / navegador"
                >
                  <span>Recarregar</span>
                </button>
              </div>
            </div>

            {/* 2. Couple Revenue Summary */}
            <CoupleRevenueCard
              revenues={currentMonthRevenues}
              bills={currentMonthBills}
              selectedMonth={selectedMonth.label}
              onOpenNewRevenue={() => {
                setEditingRevenue(null);
                setIsRevenueModalOpen(true);
              }}
              onOpenRevenueList={() => setCurrentTab('cashflow')}
              onEditSalaries={() => setIsEditSalariesModalOpen(true)}
              isWifeConnected={isWifeConnected}
              userProfileName={profiles[0]?.name || 'Você'}
              spouseProfileName={profiles[1]?.name || 'Esposa'}
            />

            {/* Banner to clear mock demo data if user desires only their real bills */}
            {hasMockBills && (
              <div className="mx-4 my-1 p-2.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl flex items-center justify-between gap-2 text-xs">
                <div className="text-blue-900 dark:text-blue-200 flex items-center gap-1.5 text-[11px] leading-tight">
                  <span className="text-sm">💡</span>
                  <span>Existem contas demonstrativas no app. Você pode removê-las com 1 clique.</span>
                </div>
                <button
                  onClick={handleClearMockBills}
                  className="flex-shrink-0 px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] rounded-lg active-press transition-colors"
                  title="Apagar dados fictícios e manter apenas contas cadastradas por você"
                >
                  Limpar Dados Fictícios
                </button>
              </div>
            )}

            {/* 3. 2x2 KPI Cards matching screenshot for the selected month */}
            <KpiCards
              bills={currentMonthBills}
              totalRevenue={totalGrandRevenue}
              onSelectFilter={(status) => setStatusFilter(status)}
            />

            {/* Filter Tabs Row */}
            <div className="px-4 py-2">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {[
                  { id: 'all', label: `Todas deste mês (${currentMonthBills.length})` },
                  { id: 'paid', label: `Pagas (${currentMonthBills.filter(b => b.status === 'paid').length})` },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setStatusFilter(f.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all active-press ${
                      statusFilter === f.id
                        ? 'bg-[#0A1128] dark:bg-teal-500 text-white dark:text-[#0A1128] shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="px-4 py-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setIsCalculatorOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-teal-500/15 to-emerald-500/20 hover:from-teal-500/25 hover:to-emerald-500/30 text-teal-800 dark:text-[#00E5B5] font-bold text-xs border border-teal-500/30 active-press whitespace-nowrap transition-all shadow-2xs"
              >
                <Calculator className="w-3.5 h-3.5 text-teal-600 dark:text-[#00E5B5]" />
                <span>Calculadora</span>
              </button>

              <button
                type="button"
                onClick={() => setIsBoletoScannerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-800 dark:text-teal-200 font-bold text-xs border border-teal-200 dark:border-teal-800 active-press whitespace-nowrap transition-all shadow-2xs"
              >
                <ScanLine className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Escanear Boleto / Pix com IA</span>
              </button>
            </div>

            {/* Search & Category Filter Bar */}
            <div className="px-4 py-1.5">
              <div className="flex items-center gap-2 bg-white dark:bg-[#131D38] p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-2 flex-1 px-2.5">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por conta, favorecido ou código..."
                    className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      ×
                    </button>
                  )}
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-200 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none max-w-[130px]"
                >
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* List of Bill Cards */}
            <div className="px-4 py-2 space-y-3">
              {filteredBills.length === 0 ? (
                <div className="bg-white dark:bg-[#131D38] p-6 sm:p-7 rounded-3xl text-center border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {currentMonthBills.length === 0
                      ? `Nenhuma conta em ${selectedMonth.label}`
                      : 'Nenhuma conta encontrada nos filtros'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                    {currentMonthBills.length === 0
                      ? `Você ainda não visualiza contas em ${selectedMonth.label}. Se você já havia cadastrado ou se suas informações sumiram, use o Recuperador de Dados abaixo ou veja se suas contas estão em outro mês.`
                      : 'Nenhuma despesa corresponde aos filtros selecionados.'}
                  </p>

                  {/* Indicator if bills are present in another month */}
                  {currentMonthBills.length === 0 && otherMonthsWithBills.length > 0 && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-300/80 dark:border-amber-700/60 text-xs text-amber-900 dark:text-amber-200 text-left space-y-2">
                      <div className="font-bold flex items-center gap-1.5 text-xs">
                        <span>💡 Suas contas cadastradas foram localizadas em outro mês:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {otherMonthsWithBills.map(({ monthId, count }) => (
                          <button
                            key={monthId}
                            type="button"
                            onClick={() => {
                              const found = INITIAL_SUBSEQUENT_MONTHS.find(m => m.id === monthId) || {
                                id: monthId,
                                label: monthId,
                                shortLabel: monthId,
                              };
                              setSelectedMonth(found);
                            }}
                            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-100 font-bold rounded-xl border border-amber-400/40 flex items-center gap-1 active-press text-[11px]"
                          >
                            <span>Ver {count} conta(s) em {monthId}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBill(null);
                        setIsBillModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#00C49F] hover:bg-[#00B290] text-[#0A1128] font-bold text-xs rounded-xl shadow-xs active-press"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Cadastrar Nova Conta</span>
                    </button>
                  </div>
                </div>
              ) : (
                filteredBills.map(bill => (
                  <BillCard
                    key={bill.id}
                    bill={bill}
                    onEdit={(b) => {
                      setEditingBill(b);
                      setIsBillModalOpen(true);
                    }}
                    onDelete={handleDeleteBill}
                    onTogglePaid={handleTogglePaid}
                    onViewReceipt={handleViewReceipt}
                    onAttachReceipt={handleAttachReceipt}
                    onMoveMonth={handleMoveBillMonth}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Monthly Cash Flow Report */}
        {currentTab === 'cashflow' && (
          <CashFlowReport
            bills={currentMonthBills}
            revenues={currentMonthRevenues}
            selectedMonth={selectedMonth.label}
            onOpenNewRevenue={() => {
              setEditingRevenue(null);
              setIsRevenueModalOpen(true);
            }}
            onDeleteRevenue={handleDeleteRevenue}
          />
        )}
          </PullToRefresh>
        </div>
      </main>

      {/* Native Bottom Tab Bar Navigation */}
      <nav className="flex-shrink-0 z-40 w-full bg-white/95 dark:bg-[#0A1128]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-2 sm:px-6 py-1 sm:py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg">
        <div className="max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto flex items-center justify-around gap-1 sm:gap-2">
          {/* Tab 1: Contas / Dívidas */}
          <button
            onClick={() => setCurrentTab('bills')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 sm:px-5 rounded-xl transition-all active-press ${
              currentTab === 'bills'
                ? 'text-[#00A884] dark:text-[#00E5B5] font-bold scale-105'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className="relative">
              <FileText className="w-5 h-5" />
              {currentMonthBills.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-amber-500 text-white text-[9px] font-black min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
                  {currentMonthBills.length}
                </span>
              )}
            </div>
            <span className="text-[10px] sm:text-xs tracking-tight whitespace-nowrap">Dívidas</span>
          </button>

          {/* Tab 2: Fluxo de Caixa */}
          <button
            onClick={() => setCurrentTab('cashflow')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 sm:px-5 rounded-xl transition-all active-press ${
              currentTab === 'cashflow'
                ? 'text-[#00A884] dark:text-[#00E5B5] font-bold scale-105'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-[10px] sm:text-xs tracking-tight whitespace-nowrap">Fluxo</span>
          </button>

          {/* Tab 3: CloudKit Sync Drawer */}
          <button
            onClick={() => setIsCloudDrawerOpen(true)}
            className="flex flex-col items-center gap-0.5 py-1 px-3 sm:px-5 rounded-xl text-slate-400 hover:text-slate-600 active-press"
          >
            <div className="relative">
              <Cloud className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <span className="text-[10px] sm:text-xs tracking-tight whitespace-nowrap">iCloud Sync</span>
          </button>

          {/* Tab 4: Moradores & Configurações */}
          <button
            onClick={() => setIsProfilesModalOpen(true)}
            className="flex flex-col items-center gap-0.5 py-1 px-3 sm:px-5 rounded-xl text-slate-400 hover:text-slate-600 active-press"
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] sm:text-xs tracking-tight whitespace-nowrap">Moradores</span>
          </button>
        </div>
      </nav>

      {/* Modals */}
      <BillModal
        isOpen={isBillModalOpen}
        onClose={() => {
          setIsBillModalOpen(false);
          setEditingBill(null);
        }}
        onSave={handleSaveBill}
        initialBill={editingBill}
        defaultMonth={selectedMonth.id}
      />

      <RevenueModal
        isOpen={isRevenueModalOpen}
        onClose={() => {
          setIsRevenueModalOpen(false);
          setEditingRevenue(null);
        }}
        onSave={handleSaveRevenue}
        profiles={profiles}
        initialRevenue={editingRevenue}
        defaultMonth={selectedMonth.id}
        onSwitchToBill={(name, amount) => {
          setEditingBill({
            name: name || '',
            amount: parseFloat((amount || '').replace(',', '.')) || 0,
            dueDate: `${selectedMonth.id}-10`,
            category: cloudkit.guessCategoryFromName(name || ''),
            recurrence: 'Mensal Fixa',
            fixedValueType: parseFloat(amount || '') > 0 ? 'fixed_value' : 'variable_value',
            splitHousehold: true,
          } as any);
          setIsBillModalOpen(true);
        }}
      />

      <EditCoupleSalariesModal
        isOpen={isEditSalariesModalOpen}
        onClose={() => setIsEditSalariesModalOpen(false)}
        carlosCurrentSalary={carlosCurrentSalary}
        paulaCurrentSalary={paulaCurrentSalary}
        selectedMonth={selectedMonth.label}
        onSaveSalaries={handleSaveCoupleSalaries}
        userLabel={`Meu Salário (${profiles[0]?.name || 'Você'})`}
        spouseLabel={`Salário de ${profiles[1]?.name || 'Esposa'}`}
      />

      <CloudKitSyncDrawer
        isOpen={isCloudDrawerOpen}
        onClose={() => setIsCloudDrawerOpen(false)}
        devices={devices}
        activeDevice={activeDevice}
        onSwitchDevice={handleSwitchDevice}
        isOffline={isOffline}
        onToggleOffline={() => setIsOffline(!isOffline)}
        conflictLogs={conflictLogs}
        onForceSync={handleForceSync}
        onUpdateDevice={handleUpdateDevice}
        onRemoveDevice={handleRemoveDevice}
      />

      <BoletoScannerModal
        isOpen={isBoletoScannerOpen}
        onClose={() => setIsBoletoScannerOpen(false)}
        onBoletoScanned={handleBoletoScanned}
        fallbackMonth={selectedMonth.id}
      />

      <ProfilesModal
        isOpen={isProfilesModalOpen}
        onClose={() => setIsProfilesModalOpen(false)}
        profiles={profiles}
        onUpdateProfiles={handleUpdateProfiles}
        notificationSettings={notifications}
        onUpdateNotifications={setNotifications}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        isWifeConnected={isWifeConnected}
        wifeDevice={wifeDevice}
        onOpenWifeConnect={() => {
          setIsProfilesModalOpen(false);
          setIsWifeConnectModalOpen(true);
        }}
      />

      <WifeConnectionModal
        isOpen={isWifeConnectModalOpen}
        onClose={() => setIsWifeConnectModalOpen(false)}
        isWifeConnected={isWifeConnected}
        wifeDevice={wifeDevice}
        onDisconnectWife={handleRemoveDevice}
        onForceSync={handleForceSync}
      />

      <ReceiptViewerModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setViewingReceiptBill(null);
        }}
        bill={viewingReceiptBill}
      />

      <CalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        onApplyToNewBill={(amount) => {
          setEditingBill({
            name: '',
            amount,
            dueDate: `${selectedMonth.id}-10`,
            category: 'Outros',
            recurrence: 'Única / Pontual',
            status: 'pending',
            splitHousehold: true,
          } as any);
          setIsBillModalOpen(true);
        }}
      />

      <DeleteBillModal
        isOpen={Boolean(billToDelete)}
        onClose={() => setBillToDelete(null)}
        bill={billToDelete}
        currentMonthLabel={selectedMonth.label}
        onDeleteCurrentMonth={handleDeleteSingleMonth}
        onDeleteAllMonths={handleDeleteAllMonths}
      />
    </div>
  );
}
