import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Filter, Plus, FileText, Landmark, TrendingUp, 
  Cloud, Users, Bell, AlertTriangle, CheckCircle2, ChevronRight,
  ShieldCheck, Share2, Sparkles, SlidersHorizontal, Building2, CreditCard, Upload,
  RefreshCw
} from 'lucide-react';
import { Bill, Revenue, CloudDevice, UserProfile, NotificationSetting, SyncConflictLog } from './types/finance';
import { cloudkit } from './services/cloudkitSync';
import { Header } from './components/Header';
import { KpiCards } from './components/KpiCards';
import { BillCard } from './components/BillCard';
import { BillModal } from './components/BillModal';
import { RevenueModal } from './components/RevenueModal';
import { CashFlowReport } from './components/CashFlowReport';
import { CloudKitSyncDrawer } from './components/CloudKitSyncDrawer';
import { BankSyncModal } from './components/BankSyncModal';
import { BoletoScannerModal } from './components/BoletoScannerModal';
import { ProfilesModal } from './components/ProfilesModal';
import { ReceiptViewerModal } from './components/ReceiptViewerModal';
import { MonthSelector, MonthOption } from './components/MonthSelector';
import { CoupleRevenueCard } from './components/CoupleRevenueCard';
import { EditCoupleSalariesModal } from './components/EditCoupleSalariesModal';
import { WifeConnectionModal } from './components/WifeConnectionModal';
import { PullToRefresh } from './components/PullToRefresh';
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

  // Wife Connection State
  const [isWifeConnectModalOpen, setIsWifeConnectModalOpen] = useState(false);

  const isWifeConnected = useMemo(() => {
    return devices.some(d => !d.isCurrent && d.id !== activeDeviceId);
  }, [devices, activeDeviceId]);

  const wifeDevice = useMemo(() => {
    return devices.find(d => !d.isCurrent && d.id !== activeDeviceId) || null;
  }, [devices, activeDeviceId]);

  // App Navigation, Months & Filters
  const [currentTab, setCurrentTab] = useState<'bills' | 'cashflow' | 'bank'>('bills');
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
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isBoletoScannerOpen, setIsBoletoScannerOpen] = useState(false);
  const [isProfilesModalOpen, setIsProfilesModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [viewingReceiptBill, setViewingReceiptBill] = useState<Bill | null>(null);

  // In-App Due Date Notification Alert Banner
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // Profiles and Notifications
  const [profiles, setProfiles] = useState<UserProfile[]>(() => cloudkit.getProfiles());

  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    { id: 'notif-1', title: 'Avisar 3 dias antes do vencimento', daysBeforeDue: 3, enabled: true },
    { id: 'notif-2', title: 'Avisar no dia do vencimento às 09:00', daysBeforeDue: 0, enabled: true },
    { id: 'notif-3', title: 'Alerta vermelho para contas atrasadas', daysBeforeDue: -1, enabled: true },
    { id: 'notif-4', title: 'Notificar quando o cônjuge/morador anexar comprovante', daysBeforeDue: 0, enabled: true },
  ]);

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

  // Check for upcoming bills to notify automatically
  useEffect(() => {
    const overdue = bills.find(b => b.status === 'overdue');
    if (overdue) {
      setToastNotification(`⚠️ Lembrete de Conta Atrasada: ${overdue.name} (R$ ${overdue.amount.toFixed(2)})`);
    } else {
      const dueSoon = bills.find(b => b.status === 'pending');
      if (dueSoon) {
        setToastNotification(`⏰ Próximo Vencimento: ${dueSoon.name} vence em breve (R$ ${dueSoon.amount.toFixed(2)})`);
      }
    }
  }, [bills]);

  // Ensure debts & recurring bills propagate to current and future months automatically
  useEffect(() => {
    const updated = cloudkit.ensureRecurringBillsForMonth(selectedMonth.id);
    if (updated.length !== bills.length) {
      setBills(updated);
    }
  }, [selectedMonth.id]);

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
    return bills.filter(b => b.dueDate.startsWith(selectedMonth.id));
  }, [bills, selectedMonth.id]);

  // Check if initial sample mock bills are present in current bills
  const hasMockBills = useMemo(() => {
    const mockIds = ['bill-condominio', 'bill-luz', 'bill-gas', 'bill-internet', 'bill-supermercado', 'bill-saude'];
    return bills.some(b => mockIds.includes(b.id));
  }, [bills]);

  // Salaries of Carlos and Paula (Editable by user)
  const carlosCurrentSalary = useMemo(() => {
    const r = revenues.find(x => x.profileName === 'Carlos' || x.name.toLowerCase().includes('carlos'));
    return r ? r.amount : 6850;
  }, [revenues]);

  const paulaCurrentSalary = useMemo(() => {
    const r = revenues.find(x => 
      x.profileName === 'Paula' || 
      x.profileName === 'Camila' || 
      x.name.toLowerCase().includes('paula') || 
      x.name.toLowerCase().includes('camila')
    );
    return r ? r.amount : 7240;
  }, [revenues]);

  // Total Combined Revenue of the Household
  const totalGrandRevenue = useMemo(() => {
    return revenues.reduce((sum, r) => sum + r.amount, 0);
  }, [revenues]);

  // Handler to edit and save Carlos & Paula salaries
  const handleSaveCoupleSalaries = (carlosAmount: number, paulaAmount: number) => {
    cloudkit.updateCoupleSalaries(carlosAmount, paulaAmount, selectedMonth.id);
    setRevenues(cloudkit.getRevenues());
    showTemporaryToast(`Salários atualizados: Carlos (R$ ${carlosAmount.toFixed(2)}) e Paula (R$ ${paulaAmount.toFixed(2)})`);
  };

  // Handler to replicate recurring bills into a target subsequent month
  const handleReplicateBillsToMonth = (targetMonthId: string) => {
    const updated = cloudkit.replicateBillsToMonth(targetMonthId, selectedMonth.id);
    setBills(cloudkit.getBills());
    showTemporaryToast(`Contas replicadas para o mês ${targetMonthId} com sucesso!`);
  };

  // Handler to clear fictitious demo bills so user sees only real data
  const handleClearMockBills = () => {
    if (confirm('Deseja remover as contas de demonstração e manter apenas os seus lançamentos reais?')) {
      const remaining = cloudkit.clearMockBills();
      setBills(remaining);
      showTemporaryToast('Contas de exemplo removidas. Apenas seus lançamentos reais permanecem salvos!');
    }
  };

  // Filtered Bills based on status, search, and category
  const filteredBills = useMemo(() => {
    return currentMonthBills.filter(bill => {
      // Status Filter
      if (statusFilter === 'pending' && bill.status !== 'pending') return false;
      if (statusFilter === 'paid' && bill.status !== 'paid') return false;
      if (statusFilter === 'overdue' && bill.status !== 'overdue') return false;

      // Category Filter
      if (categoryFilter !== 'Todas' && bill.category !== categoryFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = bill.name.toLowerCase().includes(query);
        const matchesFavored = bill.favored.toLowerCase().includes(query);
        const matchesCategory = bill.category.toLowerCase().includes(query);
        const matchesBarcode = (bill.barcode || '').includes(query);
        if (!matchesName && !matchesFavored && !matchesCategory && !matchesBarcode) return false;
      }

      return true;
    });
  }, [currentMonthBills, statusFilter, categoryFilter, searchQuery]);

  // Categories list for filter chips
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    currentMonthBills.forEach(b => set.add(b.category));
    return ['Todas', ...Array.from(set)];
  }, [currentMonthBills]);

  // Handlers for Bill operations
  const handleSaveBill = (
    billData: Partial<Bill>,
    installmentConfig?: {
      totalInstallments: number;
      currentInstallment: number;
      valueIsPerInstallment: boolean;
    }
  ) => {
    if (billData.recurrence === 'Parcelada' && installmentConfig) {
      cloudkit.saveBillWithInstallments(billData, installmentConfig);
    } else {
      cloudkit.saveBill(billData);
      if (billData.recurrence === 'Mensal Fixa') {
        cloudkit.ensureRecurringBillsForMonth(selectedMonth.id);
      }
    }
    setBills(cloudkit.getBills());
    setConflictLogs(cloudkit.getConflictLogs());
    showTemporaryToast(
      billData.recurrence === 'Parcelada' && installmentConfig && installmentConfig.totalInstallments > 1
        ? `✅ Dívida parcelada em ${installmentConfig.totalInstallments}x salva e lançada nos próximos meses!`
        : (billData.id ? 'Conta atualizada com sucesso!' : 'Nova conta cadastrada e sincronizada!')
    );
  };

  const handleDeleteBill = (id: string) => {
    if (confirm('Deseja realmente remover esta conta das Finanças da Casa?')) {
      cloudkit.deleteBill(id);
      setBills(cloudkit.getBills());
      showTemporaryToast('Conta excluída.');
    }
  };

  const handleTogglePaid = (bill: Bill) => {
    const newStatus = bill.status === 'paid' ? 'pending' : 'paid';
    cloudkit.toggleBillStatus(bill.id, newStatus);
    setBills(cloudkit.getBills());
    showTemporaryToast(newStatus === 'paid' ? `Conta "${bill.name}" marcada como Paga!` : 'Status revertido para Pendente.');
  };

  // Handlers for Revenue operations
  const handleSaveRevenue = (revData: Partial<Revenue> & { name: string; amount: number; date: string; category: string }) => {
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

  // Import bank transactions
  const handleImportBankTransactions = (newBills: Partial<Bill>[], newRevenues: Partial<Revenue>[]) => {
    newBills.forEach(b => cloudkit.saveBill(b));
    newRevenues.forEach(r => cloudkit.saveRevenue(r as any));
    setBills(cloudkit.getBills());
    setRevenues(cloudkit.getRevenues());
    showTemporaryToast(`Importação concluída: ${newBills.length} despesas reais e ${newRevenues.length} receitas inseridas!`);
  };

  // Boleto / Pix AI Scanner completed
  const handleBoletoScanned = (scannedData: Partial<Bill>) => {
    const processed = parseScannedBoletoOrPix(scannedData, selectedMonth.id);
    setEditingBill(processed as Bill);
    setIsBillModalOpen(true);
    const dueDateDisplay = processed.dueDate ? processed.dueDate.split('-').reverse().join('/') : '';
    showTemporaryToast(
      `✨ Boleto/Pix processado: Favorecido "${processed.favored || processed.name}" e Vencimento (${dueDateDisplay}) preenchidos automaticamente!`
    );
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
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
        <div className="bg-slate-900 dark:bg-slate-800 text-white px-4 py-2.5 mx-4 mt-3 rounded-2xl shadow-lg border border-slate-700/80 flex items-center justify-between gap-2 animate-fade-in text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Bell className="w-4 h-4 text-[#FFD166] flex-shrink-0 animate-pulse" />
            <span className="font-semibold truncate">{toastNotification}</span>
          </div>
          <button
            onClick={() => setToastNotification(null)}
            className="text-slate-400 hover:text-white text-[11px] font-bold px-1.5 py-0.5"
          >
            Dispensar
          </button>
        </div>
      )}

      {/* Main Content Area with Pull-To-Refresh Support */}
      <main className="flex-1 max-w-xl w-full mx-auto pb-24">
        <PullToRefresh onRefresh={handleManualRefresh} isRefreshing={isRefreshing}>
        {currentTab === 'bills' && (
          <div className="space-y-1">
            {/* 1. Month Selector with Subsequent Months starting October 2026 */}
            <MonthSelector
              selectedMonthId={selectedMonth.id}
              onSelectMonth={(month) => {
                setSelectedMonth(month);
                const updated = cloudkit.ensureRecurringBillsForMonth(month.id);
                setBills(updated);
              }}
              bills={bills}
              onReplicateBillsToMonth={handleReplicateBillsToMonth}
            />

            {/* Quick Pull / Manual Refresh Toolbar Bar */}
            <div className="mx-4 my-1 px-3 py-1.5 bg-white dark:bg-[#131D38] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between text-xs shadow-xs">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                <span className="truncate">Puxe a tela para baixo para sincronizar</span>
              </div>
              <button
                type="button"
                id="btn-sync-now"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1 font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 active:scale-95 transition-all px-2.5 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 flex-shrink-0 text-[11px]"
                title="Sincronizar dados agora"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Atualizando...' : 'Atualizar Agora'}</span>
              </button>
            </div>

            {/* 2. Couple Revenue Summary */}
            <CoupleRevenueCard
              revenues={revenues}
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
                <div className="bg-white dark:bg-[#131D38] p-7 rounded-3xl text-center border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {currentMonthBills.length === 0
                      ? `Nenhuma conta em ${selectedMonth.label}`
                      : 'Nenhuma conta encontrada nos filtros'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    {currentMonthBills.length === 0
                      ? `Você ainda não cadastrou contas para ${selectedMonth.label}. Você pode replicar as contas recorrentes do mês anterior ou cadastrar uma nova conta.`
                      : 'Nenhuma despesa corresponde aos filtros selecionados.'}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {currentMonthBills.length === 0 && (
                      <button
                        onClick={() => handleReplicateBillsToMonth(selectedMonth.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-500/15 hover:bg-teal-500/25 text-teal-700 dark:text-teal-300 font-bold text-xs rounded-xl border border-teal-500/30 active-press"
                      >
                        <span>📋 Replicar Contas Recorrentes</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingBill(null);
                        setIsBillModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#00C49F] text-[#0A1128] font-bold text-xs rounded-xl shadow-xs active-press"
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
            revenues={revenues}
            selectedMonth={selectedMonth.label}
            onOpenNewRevenue={() => {
              setEditingRevenue(null);
              setIsRevenueModalOpen(true);
            }}
            onDeleteRevenue={handleDeleteRevenue}
          />
        )}

        {/* Tab 3: Bank & Open Finance Integration */}
        {currentTab === 'bank' && (
          <div className="p-4 space-y-4">
            <div className="bg-[#0A1128] text-white p-5 rounded-3xl shadow-lg relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-xs font-bold text-[#00E5B5] uppercase tracking-wider mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Conexão Bancária Criptografada</span>
                </div>
                <h2 className="text-lg font-black tracking-tight mb-1">
                  Open Finance Brasil & Cartões de Crédito
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed max-w-md mb-4">
                  Cadastre suas contas bancárias reais (Itaú, Nubank, Bradesco, Santander, etc.) e cartões de crédito da Paula e do Carlos. Todos os dados fictícios foram removidos.
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => setIsBankModalOpen(true)}
                    className="px-4 py-2.5 bg-[#00C49F] hover:bg-[#00b290] text-[#0A1128] font-extrabold text-xs rounded-xl active-press shadow-md flex items-center gap-1.5"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Gerenciar Contas & Cartões Reais</span>
                  </button>
                </div>
              </div>
              <div className="absolute right-2 bottom-2 text-slate-800 pointer-events-none opacity-40">
                <Landmark className="w-36 h-36" />
              </div>
            </div>

            {/* Quick action cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white dark:bg-[#131D38] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2 font-bold">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                    Cartões de Crédito da Família
                  </h3>
                  <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mb-3">
                    Acompanhe limites disponíveis, dias de fechamento e o vencimento das faturas da Paula e do Carlos.
                  </p>
                </div>
                <button
                  onClick={() => setIsBankModalOpen(true)}
                  className="w-full py-2 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-bold text-xs rounded-xl active-press transition-colors"
                >
                  Configurar Cartões de Crédito
                </button>
              </div>

              <div className="bg-white dark:bg-[#131D38] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-2 font-bold">
                    <Upload className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                    Importação de Extrato (OFX / CSV)
                  </h3>
                  <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mb-3">
                    Exporte o arquivo OFX ou CSV no seu aplicativo de banco e carregue diretamente para lançar despesas reais.
                  </p>
                </div>
                <button
                  onClick={() => setIsBankModalOpen(true)}
                  className="w-full py-2 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 text-teal-800 dark:text-teal-200 font-bold text-xs rounded-xl active-press transition-colors"
                >
                  Importar Extrato OFX / CSV
                </button>
              </div>
            </div>
          </div>
        )}
        </PullToRefresh>
      </main>

      {/* Native iOS Bottom Tab Bar Navigation */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/95 dark:bg-[#0A1128]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 z-40 px-4 py-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg">
        <div className="max-w-xl mx-auto flex items-center justify-around">
          {/* Tab 1: Contas */}
          <button
            onClick={() => setCurrentTab('bills')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
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
            <span className="text-[10px] tracking-tight">Dívidas</span>
          </button>

          {/* Tab 2: Fluxo de Caixa */}
          <button
            onClick={() => setCurrentTab('cashflow')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
              currentTab === 'cashflow'
                ? 'text-[#00A884] dark:text-[#00E5B5] font-bold scale-105'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Fluxo de Caixa</span>
          </button>

          {/* Tab 3: Bancos & Open Finance */}
          <button
            onClick={() => {
              setCurrentTab('bank');
              setIsBankModalOpen(true);
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
              currentTab === 'bank'
                ? 'text-[#00A884] dark:text-[#00E5B5] font-bold scale-105'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Landmark className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Bancos API</span>
          </button>

          {/* Tab 4: CloudKit Sync Drawer */}
          <button
            onClick={() => setIsCloudDrawerOpen(true)}
            className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-slate-400 hover:text-slate-600 active-press"
          >
            <div className="relative">
              <Cloud className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <span className="text-[10px] tracking-tight">iCloud Sync</span>
          </button>

          {/* Tab 5: Moradores & Configurações */}
          <button
            onClick={() => setIsProfilesModalOpen(true)}
            className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-slate-400 hover:text-slate-600 active-press"
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Moradores</span>
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

      <BankSyncModal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
        onImportTransactions={handleImportBankTransactions}
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
    </div>
  );
}
