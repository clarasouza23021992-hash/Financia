import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, Plus, FileText, TrendingUp, 
  Cloud, Users, Bell, AlertTriangle, CheckCircle2, ChevronRight,
  ShieldCheck, Share2, Sparkles, SlidersHorizontal,
  RefreshCw, ScanLine, Calculator, Target, Clock, Paperclip, Tag,
  Images
} from 'lucide-react';
import { 
  Bill, Revenue, CloudDevice, UserProfile, NotificationSetting, 
  SyncConflictLog, InAppNotification, ChangeNotification, getBillEffectiveMonth, 
  isBillRescheduled, getMonthNamePtBr, getMonthShortPtBr 
} from './types/finance';
import { cloudkit, isMockBill, isMockRevenue } from './services/cloudkitSync';
import { 
  getStoredInAppNotifications, 
  saveStoredInAppNotifications, 
  checkAndNotifyBills, 
  getDefaultNotificationRule,
  playNotificationChime,
  sendNativeNotification
} from './services/notificationService';
import { LiveAlterationToast } from './components/LiveAlterationToast';
import { getStoredCategories } from './utils/categories';
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
import { WifeConnectionModal } from './components/WifeConnectionModal';
import { PullToRefresh } from './components/PullToRefresh';
import { CalculatorModal } from './components/CalculatorModal';
import { DeleteBillModal } from './components/DeleteBillModal';
import { DeleteRevenueModal } from './components/DeleteRevenueModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { BudgetGoalsModal } from './components/BudgetGoalsModal';
import { CategoriesManagerModal } from './components/CategoriesManagerModal';
import { BackupModal } from './components/BackupModal';
import { ReorderQuickActionsModal, getSavedQuickActionsOrder } from './components/ReorderQuickActionsModal';
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
  const [revenueToDelete, setRevenueToDelete] = useState<Revenue | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Wife Connection State
  const [isWifeConnectModalOpen, setIsWifeConnectModalOpen] = useState(false);

  const isWifeConnected = useMemo(() => {
    return cloudkit.isWifeConnected();
  }, [devices, activeDeviceId]);

  const wifeDevice = useMemo(() => {
    return cloudkit.getWifeDevice();
  }, [devices, activeDeviceId]);

  // App Navigation, Months & Filters
  const [currentTab, setCurrentTab] = useState<'bills' | 'cashflow'>('bills');
  const [selectedMonth, setSelectedMonth] = useState<MonthOption>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('financas_selected_month_id');
      // If user had previously stuck on 2026-10, migrate them to 2026-11 as requested
      if (saved && saved !== '2026-10') {
        const found = INITIAL_SUBSEQUENT_MONTHS.find(m => m.id === saved);
        if (found) return found;
      }
    }
    // Default to November 2026 (current month requested and synchronized with calendar)
    return INITIAL_SUBSEQUENT_MONTHS.find(m => m.id === '2026-11') || {
      id: '2026-11',
      label: 'Novembro de 2026',
      shortLabel: 'Nov 2026',
      isCurrent: true,
    };
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

  const [isCloudDrawerOpen, setIsCloudDrawerOpen] = useState(false);
  const [isBoletoScannerOpen, setIsBoletoScannerOpen] = useState(false);
  const [isProfilesModalOpen, setIsProfilesModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [viewingReceiptBill, setViewingReceiptBill] = useState<Bill | null>(null);
  const [receiptModalInitialView, setReceiptModalInitialView] = useState<'single' | 'gallery'>('single');
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [quickActionsOrder, setQuickActionsOrder] = useState<string[]>(() => getSavedQuickActionsOrder());
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);

  // Active household member editing debts (Carlos on Carlos's device / Paula on wife's device)
  const [activeUserName, setActiveUserName] = useState<string>(() => cloudkit.getCurrentUserName());
  const [liveAlterationNotif, setLiveAlterationNotif] = useState<ChangeNotification | null>(null);
  const handleDismissLiveToast = useCallback(() => {
    setLiveAlterationNotif(null);
  }, []);

  // In-App Notifications History & Due Date Alerts
  const [inAppNotifications, setInAppNotifications] = useState<InAppNotification[]>(() => getStoredInAppNotifications());
  const unreadNotificationsCount = useMemo(() => inAppNotifications.filter(n => !n.read).length, [inAppNotifications]);

  // In-App Due Date Notification Alert Banner
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  const handleSimulateSpouseAlteration = () => {
    const wifeName = cloudkit.getWifeName();
    const otherUser = activeUserName === wifeName ? cloudkit.getTitularName() : wifeName;
    const sampleBill = bills[0] || { name: 'Energia Elétrica (Enel)', amount: 245.60 };
    playNotificationChime();
    const simulatedNotif: ChangeNotification = {
      id: `sim_${Date.now()}`,
      householdId: cloudkit.getHouseholdId(),
      sourceDeviceId: 'dev_spouse_sim',
      sourceDeviceName: otherUser === wifeName ? 'Paula (iPhone)' : 'Carlos (iPhone)',
      sourceUserName: otherUser,
      actionType: 'bill_paid',
      title: 'Dívida Paga! ✅',
      message: `${otherUser} marcou a conta "${sampleBill.name}" (R$ ${Number(sampleBill.amount).toFixed(2).replace('.', ',')}) como PAGA! ✅`,
      targetItemName: sampleBill.name,
      amount: sampleBill.amount,
      timestamp: new Date().toISOString(),
    };
    setLiveAlterationNotif(simulatedNotif);
    const newInApp: InAppNotification = {
      id: simulatedNotif.id,
      title: simulatedNotif.title,
      message: simulatedNotif.message,
      date: simulatedNotif.timestamp,
      type: 'success',
      read: false,
      actorName: otherUser,
      deviceName: simulatedNotif.sourceDeviceName,
      sourceDeviceName: simulatedNotif.sourceDeviceName,
      actionType: 'bill_paid',
    };
    setInAppNotifications(prev => {
      const merged = [newInApp, ...prev.filter(n => n.id !== newInApp.id)];
      saveStoredInAppNotifications(merged);
      return merged;
    });
    sendNativeNotification(simulatedNotif.title, { body: simulatedNotif.message, sound: true });
  };

  const handleToggleActiveUser = () => {
    const wifeName = cloudkit.getWifeName();
    const titularName = cloudkit.getTitularName();
    const nextUser = activeUserName.toLowerCase().includes('paula') ? titularName : wifeName;
    cloudkit.setActiveUserName(nextUser);
    setActiveUserName(nextUser);
    showTemporaryToast(`Perfil ativo: ${nextUser}`);
  };

  // Map other months that contain bills (in case bills are scheduled in a different month)
  const otherMonthsWithBills = useMemo(() => {
    const map = new Map<string, number>();
    bills.forEach(b => {
      const m = getBillEffectiveMonth(b);
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

  // Automatic check to ensure bills & revenues are safe and thoroughly deduplicated
  useEffect(() => {
    // Ensure app opens on current month (Novembro 2026) synchronized with calendar
    const savedMonth = localStorage.getItem('financas_selected_month_id');
    if (!savedMonth || savedMonth === '2026-10') {
      localStorage.setItem('financas_selected_month_id', '2026-11');
      const nov = INITIAL_SUBSEQUENT_MONTHS.find(m => m.id === '2026-11');
      if (nov && selectedMonth.id !== '2026-11') {
        setSelectedMonth(nov);
      }
    }

    cloudkit.cleanupAndDeduplicateAllBills();
    cloudkit.ensureDefaultDataIfEmpty();
    const updatedBills = cloudkit.getBills();
    const updatedRevs = cloudkit.getRevenues();
    setBills(updatedBills);
    setRevenues(updatedRevs);
  }, []);

  // When selected month changes, refresh local state without re-generating duplicates
  useEffect(() => {
    setBills(cloudkit.getBills());
    setRevenues(cloudkit.getRevenues());
  }, [selectedMonth.id]);

  // Sync with CloudKit Real-Time BroadcastChannel & WebSockets
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
      } else if (event.type === 'REMOTE_CHANGE_NOTIFICATION' || event.type === 'CHANGE_NOTIFICATION_TRIGGERED') {
        const notifPayload = event.payload as ChangeNotification;
        if (notifPayload) {
          playNotificationChime();
          setLiveAlterationNotif(notifPayload);

          const actor = notifPayload.sourceUserName || 'Morador';
          const newInApp: InAppNotification = {
            id: notifPayload.id || `notif_${Date.now()}`,
            title: notifPayload.title || 'Alteração na Dívida',
            message: notifPayload.message || `${actor} alterou uma dívida`,
            date: notifPayload.timestamp || new Date().toISOString(),
            type: notifPayload.actionType === 'bill_paid' ? 'success' : 'info',
            read: false,
            actorName: actor,
            deviceName: notifPayload.sourceDeviceName,
            sourceDeviceName: notifPayload.sourceDeviceName,
            actionType: notifPayload.actionType,
          };

          setInAppNotifications((prev) => {
            const merged = [newInApp, ...prev.filter(n => n.id !== newInApp.id)];
            saveStoredInAppNotifications(merged);
            return merged;
          });

          if (event.type === 'REMOTE_CHANGE_NOTIFICATION') {
            sendNativeNotification(notifPayload.title, {
              body: notifPayload.message,
              sound: true,
            });
          }

          // Immediately update bills state and also fetch fresh state from server
          setBills(cloudkit.getBills());
          setRevenues(cloudkit.getRevenues());
          cloudkit.syncWithServer().then(() => {
            setBills(cloudkit.getBills());
            setRevenues(cloudkit.getRevenues());
          }).catch(() => {});
        }
      } else if (event.type === 'ACTIVE_USER_CHANGED') {
        setActiveUserName(event.payload || cloudkit.getCurrentUserName());
      }
    });

    return () => unsubscribe();
  }, []);

  // Periodic polling & background live sync for remote alterations made by spouse on other devices
  useEffect(() => {
    const pollInterval = setInterval(() => {
      const houseId = cloudkit.getHouseholdId();
      const myDev = cloudkit.getCurrentDeviceInfo();
      const lastSeen = localStorage.getItem('financas_last_seen_notif_time') || new Date(Date.now() - 300000).toISOString();
      const currentUserName = cloudkit.getCurrentUserName();

      // 1. Always keep bills synced from server so alterations by spouse are instantly reflected
      cloudkit.syncWithServer().then(() => {
        setBills(cloudkit.getBills());
        setRevenues(cloudkit.getRevenues());
      }).catch(() => {});

      // 2. Fetch new change notifications from spouse
      fetch(`/api/household/${encodeURIComponent(houseId)}/notifications?since=${encodeURIComponent(lastSeen)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.notifications) && data.notifications.length > 0) {
            const spouseNotifs = data.notifications.filter((n: ChangeNotification) =>
              n && (n.sourceDeviceId !== myDev.id || (n.sourceUserName && n.sourceUserName !== currentUserName))
            );

            if (spouseNotifs.length > 0) {
              spouseNotifs.forEach((notif: ChangeNotification) => {
                playNotificationChime();
                setLiveAlterationNotif(notif);
                const actor = notif.sourceUserName || 'Cônjuge';
                const newInApp: InAppNotification = {
                  id: notif.id || `notif_${Date.now()}`,
                  title: notif.title || 'Alteração na Dívida',
                  message: notif.message || `${actor} alterou uma dívida`,
                  date: notif.timestamp || new Date().toISOString(),
                  type: notif.actionType === 'bill_paid' ? 'success' : 'info',
                  read: false,
                  actorName: actor,
                  deviceName: notif.sourceDeviceName,
                  sourceDeviceName: notif.sourceDeviceName,
                  actionType: notif.actionType,
                };
                setInAppNotifications(prev => {
                  const merged = [newInApp, ...prev.filter(n => n.id !== newInApp.id)];
                  saveStoredInAppNotifications(merged);
                  return merged;
                });
                sendNativeNotification(notif.title, { body: notif.message, sound: true });
              });
            }

            const latest = data.notifications[data.notifications.length - 1];
            if (latest?.timestamp) {
              localStorage.setItem('financas_last_seen_notif_time', latest.timestamp);
            }
          }
        })
        .catch(() => {});
    }, 4000);

    return () => clearInterval(pollInterval);
  }, []);

  // Check for upcoming bills and trigger local browser/PWA notifications and toast
  useEffect(() => {
    const rule = getDefaultNotificationRule();
    const generated = checkAndNotifyBills(bills, rule, notifications);
    if (generated.length > 0) {
      setInAppNotifications((prev) => {
        const merged = [...generated, ...prev];
        const unique = merged.filter(
          (item, idx, self) =>
            idx ===
            self.findIndex(
              (t) =>
                t.id === item.id ||
                (t.billId && t.billId === item.billId && t.type === item.type)
            )
        );
        saveStoredInAppNotifications(unique);
        return unique;
      });
    }

    const currentMonthPrefix = selectedMonth.id;
    const monthBills = bills.filter(b => getBillEffectiveMonth(b) === currentMonthPrefix);
    const todayStr = new Date().toISOString().split('T')[0];
    const dueToday = monthBills.find(b => b.dueDate === todayStr && b.status !== 'paid');
    const overdue = monthBills.find(b => b.status === 'overdue');

    if (dueToday) {
      setToastNotification(`🔔 Vence Hoje: ${dueToday.name} (R$ ${Number(dueToday.amount || 0).toFixed(2).replace('.', ',')})`);
    } else if (overdue) {
      setToastNotification(`⚠️ Conta Atrasada: ${overdue.name} (R$ ${Number(overdue.amount || 0).toFixed(2).replace('.', ',')})`);
    } else {
      const dueSoon = monthBills.find(b => b.status === 'pending' && (b.dueDate || '') >= todayStr);
      if (dueSoon) {
        setToastNotification(`⏰ Próximo Vencimento: ${dueSoon.name} vence em breve (R$ ${Number(dueSoon.amount || 0).toFixed(2).replace('.', ',')})`);
      }
    }
  }, [bills, selectedMonth.id, notifications]);

  // Periodic reminder interval every 5 minutes while app is running
  useEffect(() => {
    const timer = setInterval(() => {
      const rule = getDefaultNotificationRule();
      const generated = checkAndNotifyBills(bills, rule, notifications);
      if (generated.length > 0) {
        setInAppNotifications((prev) => {
          const merged = [...generated, ...prev];
          const unique = merged.filter(
            (item, idx, self) =>
              idx ===
              self.findIndex(
                (t) =>
                  t.id === item.id ||
                  (t.billId && t.billId === item.billId && t.type === item.type)
              )
          );
          saveStoredInAppNotifications(unique);
          return unique;
        });
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [bills, notifications]);

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

  // Month-aware Bills: returns actual saved bills for the selected month based on effective payment month
  const currentMonthBills = useMemo(() => {
    return bills
      .filter(b => !isMockBill(b))
      .filter(b => {
        // Exclude any salary or revenue item from bills
        if (b.category === 'Salário & Renda') return false;
        const lower = (b.name || '').toLowerCase();
        if (lower.includes('salário') || lower.includes('salario')) return false;
        if (b.id && b.id.startsWith('bill-migrated-')) return false;
        if (b.notes && b.notes.includes('Transferido automaticamente para Dívidas')) return false;
        return true;
      })
      .filter(b => getBillEffectiveMonth(b) === selectedMonth.id);
  }, [bills, selectedMonth.id]);

  // Month-aware Revenues: returns actual saved revenues for the selected month
  const currentMonthRevenues = useMemo(() => {
    return revenues
      .filter(r => !isMockRevenue(r))
      .filter(r => (r.date || '').startsWith(selectedMonth.id));
  }, [revenues, selectedMonth.id]);

  // Check if initial sample mock bills are present in current bills
  const hasMockBills = useMemo(() => {
    return bills.some(b => isMockBill(b));
  }, [bills]);

  // Salaries of Resident 1 and Resident 2 (Editable by user)
  const userCurrentSalary = useMemo(() => {
    const userPName = profiles[0]?.name || 'Você';
    const r = currentMonthRevenues.find(x => 
      x.profileName === userPName || 
      x.profileName === 'Você' || 
      (x.category === 'Salário & Renda' && (!x.profileName || x.profileName === 'Você')) ||
      x.name.toLowerCase().includes('meu salário') ||
      x.name.toLowerCase().includes(userPName.toLowerCase())
    );
    return r ? r.amount : 0;
  }, [currentMonthRevenues, profiles]);

  const spouseCurrentSalary = useMemo(() => {
    const spousePName = profiles[1]?.name || 'Cônjuge';
    const r = currentMonthRevenues.find(x => 
      (spousePName && x.profileName === spousePName) || 
      x.profileName === 'Esposa' || 
      x.profileName === 'Cônjuge' || 
      (spousePName && x.name.toLowerCase().includes(spousePName.toLowerCase()))
    );
    return r ? r.amount : 0;
  }, [currentMonthRevenues, profiles]);

  // Total Combined Revenue of the Household for the selected month
  const totalGrandRevenue = useMemo(() => {
    return currentMonthRevenues.reduce((sum, r) => sum + r.amount, 0);
  }, [currentMonthRevenues]);

  // Handler to open Revenue modal for editing an existing revenue or creating a new one
  const handleOpenEditRevenue = (rev: Revenue | null, defaultProfileName?: string) => {
    if (rev) {
      setEditingRevenue(rev);
    } else {
      setEditingRevenue({
        id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: defaultProfileName ? `Salário (${defaultProfileName})` : '',
        amount: 0,
        date: `${selectedMonth.id}-05`,
        category: 'Salário & Renda',
        recurrence: 'Mensal',
        profileName: defaultProfileName || profiles[0]?.name || 'Você',
        notes: '',
      } as any);
    }
    setIsRevenueModalOpen(true);
  };

  // Handler to clear fictitious demo bills so user sees only real data
  const handleClearMockBills = () => {
    if (confirm('Deseja remover as contas de demonstração e manter apenas os seus lançamentos reais?')) {
      const remaining = cloudkit.clearMockBills();
      setBills(remaining);
      showTemporaryToast('Contas de exemplo removidas. Apenas seus lançamentos reais permanecem salvos!');
    }
  };

  // Filter counts for active tab badges
  const filterCounts = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      all: currentMonthBills.length,
      dueToday: currentMonthBills.filter(b => b.dueDate === today && b.status !== 'paid').length,
      overdue: currentMonthBills.filter(b => b.status === 'overdue').length,
      pending: currentMonthBills.filter(b => b.status === 'pending').length,
      paid: currentMonthBills.filter(b => b.status === 'paid').length,
      withReceipt: currentMonthBills.filter(b => Boolean(b.receiptUrl)).length,
    };
  }, [currentMonthBills]);

  // Filtered Bills sorted alphabetically (A-Z) based on status, search, and category
  const filteredBills = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    const list = currentMonthBills.filter(bill => {
      // Status & Advanced Filters
      if (statusFilter === 'due_today') {
        if (bill.dueDate !== todayStr || bill.status === 'paid') return false;
      } else if (statusFilter === 'overdue') {
        if (bill.status !== 'overdue') return false;
      } else if (statusFilter === 'pending') {
        if (bill.status !== 'pending') return false;
      } else if (statusFilter === 'paid') {
        if (bill.status !== 'paid') return false;
      } else if (statusFilter === 'with_receipt') {
        if (!bill.receiptUrl) return false;
      } else if (statusFilter === 'without_receipt') {
        if (bill.receiptUrl) return false;
      } else if (statusFilter.startsWith('profile_')) {
        const profName = statusFilter.replace('profile_', '').toLowerCase();
        const inSplit = bill.splitDetails?.some(s => s.name.toLowerCase().includes(profName) && s.percentage > 0);
        const isPaidBy = (bill.paidBy || '').toLowerCase().includes(profName);
        const isFavored = (bill.favored || '').toLowerCase().includes(profName);
        const isName = (bill.name || '').toLowerCase().includes(profName);
        if (!inSplit && !isPaidBy && !isFavored && !isName) return false;
      }

      // Category Filter
      if (categoryFilter !== 'Todas' && bill.category !== categoryFilter) return false;

      // Enhanced Search Query (name, favored, barcode, pix, notes, amount)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const cleanDigits = query.replace(/\D/g, '');
        const matchesName = (bill.name || '').toLowerCase().includes(query);
        const matchesFavored = (bill.favored || '').toLowerCase().includes(query);
        const matchesCategory = (bill.category || '').toLowerCase().includes(query);
        const matchesBarcode = cleanDigits.length >= 3 && (bill.barcode || '').replace(/\D/g, '').includes(cleanDigits);
        const matchesPix = (bill.pixKey || '').toLowerCase().includes(query);
        const matchesNotes = (bill.notes || '').toLowerCase().includes(query);
        const matchesAmount = String(bill.amount || '').includes(query) || (Number(bill.amount || 0).toFixed(2).replace('.', ',')).includes(query);

        if (!matchesName && !matchesFavored && !matchesCategory && !matchesBarcode && !matchesPix && !matchesNotes && !matchesAmount) {
          return false;
        }
      }

      return true;
    });

    // Ordenação alfabética de A a Z solicitada pelo usuário
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }));
  }, [currentMonthBills, statusFilter, categoryFilter, searchQuery]);

  // Categories list for filter chips & category dropdown
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    const stored = getStoredCategories();
    stored.forEach(c => set.add(c.name));
    currentMonthBills.forEach(b => {
      if (b.category) set.add(b.category);
    });
    return ['Todas', ...Array.from(set)];
  }, [currentMonthBills, isCategoriesModalOpen]);

  // Migrate bills when a category is renamed or deleted
  const handleMigrateBillsCategory = (oldCategory: string, newCategory: string) => {
    const allBills = cloudkit.getBills();
    let migratedCount = 0;
    const updated = allBills.map(b => {
      if (b.category === oldCategory) {
        migratedCount++;
        return {
          ...b,
          category: newCategory,
          version: (b.version || 1) + 1,
          updatedAt: new Date().toISOString(),
        };
      }
      return b;
    });

    if (migratedCount > 0) {
      cloudkit.saveBills(updated);
      setBills(cloudkit.getBills());
      showTemporaryToast(`🔄 ${migratedCount} conta(s) reclassificadas de "${oldCategory}" para "${newCategory}".`);
    }
  };

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
      lastEditedBy: billData.lastEditedBy || activeUserName,
      lastEditedAt: new Date().toISOString(),
      isEdited: Boolean(editingBill),
      lastActionDescription: editingBill ? 'Editou a conta' : 'Cadastrou nova conta',
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
      showTemporaryToast(targetId ? `Conta atualizada por ${activeUserName}!` : `Nova conta cadastrada por ${activeUserName}!`);
    }
  };

  const handleMoveBillMonth = (bill: Bill, targetMonthId: string) => {
    const dueMonth = (bill.dueDate || '').substring(0, 7);
    const isReturningToDueMonth = targetMonthId === dueMonth;
    const newPaymentMonth = isReturningToDueMonth ? undefined : targetMonthId;
    const targetLabel = getMonthNamePtBr(targetMonthId) || targetMonthId;
    const actionDesc = isReturningToDueMonth ? 'Restaurou mês original' : `Moveu para ${targetLabel}`;

    cloudkit.saveBill({
      ...bill,
      paymentMonth: newPaymentMonth,
      originalDueDate: bill.originalDueDate || bill.dueDate,
      lastEditedBy: activeUserName,
      lastEditedAt: new Date().toISOString(),
      isEdited: true,
      lastActionDescription: actionDesc,
    });
    setBills(cloudkit.getBills());
    setConflictLogs(cloudkit.getConflictLogs());

    cloudkit.notifyRemoteChange(
      'bill_rescheduled',
      'Conta Reagendada 🗓️',
      `${activeUserName} reprogramou a conta "${bill.name}" para ${targetLabel}`,
      bill.name,
      bill.amount
    );

    const targetMonthOption = INITIAL_SUBSEQUENT_MONTHS.find(m => m.id === targetMonthId) || {
      id: targetMonthId,
      label: targetLabel,
      shortLabel: targetMonthId,
    };
    setSelectedMonth(targetMonthOption);

    const formattedDueDate = bill.dueDate ? bill.dueDate.split('-').reverse().join('/') : '';
    if (isReturningToDueMonth) {
      showTemporaryToast(`✅ Conta "${bill.name}" restaurada para pagar no mês de vencimento (${targetLabel})!`);
    } else {
      const isBefore = targetMonthId < dueMonth;
      showTemporaryToast(
        `✅ Conta "${bill.name}" ${isBefore ? 'antecipada' : 'programada'} para pagar em ${targetLabel}! (Vencimento real: ${formattedDueDate})`
      );
    }
  };

  const handleRestoreDueMonth = (bill: Bill) => {
    const dueMonth = (bill.dueDate || '').substring(0, 7);
    handleMoveBillMonth(bill, dueMonth);
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

  const handleReassignActor = (bill: Bill, newActor: string) => {
    const isWife = newActor.toLowerCase().includes('paula') || newActor.toLowerCase().includes('esposa');
    const cleanActor = isWife ? cloudkit.getWifeName() : cloudkit.getTitularName();
    const updated: Bill = {
      ...bill,
      lastEditedBy: cleanActor,
      lastEditedAt: new Date().toISOString(),
      lastActionDescription: bill.isEdited ? 'Editou a conta' : 'Cadastrou a conta',
      paidBy: bill.status === 'paid' ? cleanActor : bill.paidBy,
    };
    cloudkit.saveBill(updated);
    setBills(cloudkit.getBills());
    showTemporaryToast(`✅ Alteração da dívida "${bill.name}" atribuída a ${cleanActor}!`);
    cloudkit.notifyRemoteChange(
      'bill_updated',
      'Autor da Alteração Atualizado 👤',
      `${cleanActor} foi confirmado(a) como autor(a) da alteração na conta "${bill.name}"`,
      bill.name,
      bill.amount
    );
  };

  // Handlers for Revenue operations
  const handleSaveRevenue = (revData: Partial<Revenue> & { name: string; amount: number; date: string; category: string; profileName?: string; applyToFutureMonths?: boolean }) => {
    cloudkit.saveRevenue(revData as any);
    setRevenues(cloudkit.getRevenues());
    showTemporaryToast(`Receita "${revData.name}" salva com sucesso!`);
  };

  const handleDeleteRevenueSingleMonth = (rev: Revenue) => {
    cloudkit.deleteRevenue(rev.id);
    setRevenues(cloudkit.getRevenues());
    setRevenueToDelete(null);
    showTemporaryToast(`🗑️ Receita "${rev.name}" removida deste mês.`);
  };

  const handleDeleteRevenueAllMonths = (rev: Revenue) => {
    const deletedIds = cloudkit.deleteRevenueSeries(rev);
    setRevenues(cloudkit.getRevenues());
    setRevenueToDelete(null);
    showTemporaryToast(`🗑️ Receita "${rev.name}" removida de todos os meses (${deletedIds.length} ocorrências)!`);
  };

  // Handlers for Receipt viewing & attaching
  const handleViewReceipt = (bill: Bill) => {
    setViewingReceiptBill(bill);
    setReceiptModalInitialView('single');
    setIsReceiptModalOpen(true);
  };

  const handleOpenReceiptsGallery = () => {
    setViewingReceiptBill(null);
    setReceiptModalInitialView('gallery');
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
    const name1 = profiles[0]?.name || 'Você';
    const name2 = profiles[1]?.name || 'Cônjuge';
    text += `👥 Divisão: R$ ${half.toFixed(2).replace('.', ',')} para cada (${name1} & ${name2})\n\n`;
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
      {/* Real-time Alteration Toast Notification Banner */}
      <LiveAlterationToast
        notification={liveAlterationNotif}
        onDismiss={handleDismissLiveToast}
        onSelectBillName={(name) => {
          setSearchQuery(name);
          setCurrentTab('bills');
        }}
      />

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
        onOpenBackup={() => setIsBackupModalOpen(true)}
        onOpenNotifications={() => setIsNotificationCenterOpen(true)}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenBudgets={() => setIsBudgetModalOpen(true)}
        onOpenWifeConnect={() => setIsWifeConnectModalOpen(true)}
        onOpenBoletoScanner={() => setIsBoletoScannerOpen(true)}
        onOpenProfiles={() => setIsProfilesModalOpen(true)}
        onQuickPayFilter={() => setStatusFilter('pending')}
        onShareWhatsApp={handleShareWhatsApp}
        onManualRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
        isOffline={isOffline}
        isWifeConnected={isWifeConnected}
        activeUserName={activeUserName}
        onToggleActiveUser={handleToggleActiveUser}
      />

      {/* Intelligent Due Date Notification Toast Banner */}
      {toastNotification && (
        <div className="max-w-xl md:max-w-2xl lg:max-w-3xl w-full mx-auto px-3 sm:px-4 mt-1 flex-shrink-0">
          <div 
            onClick={() => setIsNotificationCenterOpen(true)}
            className="cursor-pointer bg-slate-900 dark:bg-slate-800 text-white px-3.5 py-1.5 rounded-xl shadow-md border border-slate-700/80 flex items-center justify-between gap-2 animate-fade-in text-xs hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Bell className="w-4 h-4 text-[#FFD166] flex-shrink-0 animate-pulse" />
              <span className="font-semibold truncate">{toastNotification}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[10px] text-teal-400 font-bold hidden sm:inline">Ver lembretes</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setToastNotification(null);
                }}
                className="text-slate-400 hover:text-white text-[11px] font-bold px-1.5 py-0.5"
              >
                Dispensar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area with Pull-To-Refresh Support */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden w-full min-h-0 pb-3">
        <div className="max-w-xl md:max-w-2xl lg:max-w-3xl w-full mx-auto min-h-full">
          <PullToRefresh onRefresh={handleManualRefresh} isRefreshing={isRefreshing}>
            <AnimatePresence mode="wait" initial={false}>
              {currentTab === 'bills' ? (
                <motion.div
                  key="bills-tab"
                  initial={{ opacity: 0, y: 8, filter: 'blur(1px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -8, filter: 'blur(1px)' }}
                  transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                  className="space-y-1"
                >
            {/* 1. Month Selector with Subsequent Months */}
            <MonthSelector
              selectedMonthId={selectedMonth.id}
              onSelectMonth={(month) => {
                setSelectedMonth(month);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('financas_selected_month_id', month.id);
                }
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
              onEditRevenue={handleOpenEditRevenue}
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
                  { id: 'all', label: 'Todas', count: filterCounts.all },
                  { id: 'due_today', label: '🚨 Vencem Hoje', count: filterCounts.dueToday, urgent: filterCounts.dueToday > 0 },
                  { id: 'overdue', label: '⚠️ Atrasadas', count: filterCounts.overdue, warning: filterCounts.overdue > 0 },
                  { id: 'pending', label: '⏳ Pendentes', count: filterCounts.pending },
                  { id: 'paid', label: '✅ Pagas', count: filterCounts.paid },
                  { id: 'with_receipt', label: '📎 Com Comprovante', count: filterCounts.withReceipt },
                  ...profiles.map(p => ({
                    id: `profile_${p.name}`,
                    label: `👤 ${p.name}`,
                    count: currentMonthBills.filter(b => 
                      b.splitDetails?.some(s => s.name.toLowerCase() === p.name.toLowerCase() && s.percentage > 0) ||
                      (b.paidBy || '').toLowerCase() === p.name.toLowerCase()
                    ).length
                  })),
                ].map(f => {
                  const isSelected = statusFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setStatusFilter(f.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all active-press flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#0A1128] dark:bg-teal-500 text-white dark:text-[#0A1128] shadow-xs'
                          : f.urgent
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse'
                          : f.warning
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span>{f.label}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        isSelected
                          ? 'bg-white/20 dark:bg-black/20 text-white dark:text-[#0A1128]'
                          : f.urgent
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}>
                        {f.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="px-4 py-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {quickActionsOrder.map((actionId) => {
                if (actionId === 'scanner') {
                  return (
                    <button
                      key="scanner"
                      type="button"
                      onClick={() => setIsBoletoScannerOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-800 dark:text-teal-200 font-bold text-xs border border-teal-200 dark:border-teal-800 active-press whitespace-nowrap transition-all shadow-2xs"
                    >
                      <ScanLine className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>Escanear Boleto / Pix</span>
                    </button>
                  );
                }
                if (actionId === 'gallery') {
                  return (
                    <button
                      key="gallery"
                      type="button"
                      onClick={handleOpenReceiptsGallery}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-gradient-to-r from-teal-500/10 via-emerald-500/15 to-teal-500/20 hover:from-teal-500/20 hover:to-emerald-500/30 text-teal-900 dark:text-[#00E5B5] font-bold text-xs border border-teal-500/30 active-press whitespace-nowrap transition-all shadow-2xs"
                      title="Galeria de Comprovantes do Mês (Fotos & Prints)"
                    >
                      <Images className="w-3.5 h-3.5 text-teal-600 dark:text-[#00E5B5]" />
                      <span>Galeria Comprovantes</span>
                      {filterCounts.withReceipt > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-teal-500 text-[#0A1128] font-black">
                          {filterCounts.withReceipt}
                        </span>
                      )}
                    </button>
                  );
                }
                if (actionId === 'budget') {
                  return (
                    <button
                      key="budget"
                      type="button"
                      onClick={() => setIsBudgetModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-teal-500/15 to-emerald-500/20 hover:from-teal-500/25 hover:to-emerald-500/30 text-teal-800 dark:text-[#00E5B5] font-bold text-xs border border-teal-500/30 active-press whitespace-nowrap transition-all shadow-2xs"
                    >
                      <Target className="w-3.5 h-3.5 text-teal-600 dark:text-[#00E5B5]" />
                      <span>Metas & Teto</span>
                    </button>
                  );
                }
                if (actionId === 'reminders') {
                  return (
                    <button
                      key="reminders"
                      type="button"
                      onClick={() => setIsNotificationCenterOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 active-press whitespace-nowrap transition-all shadow-2xs"
                    >
                      <Bell className="w-3.5 h-3.5 text-[#FFD166]" />
                      <span>Lembretes</span>
                      {unreadNotificationsCount > 0 && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      )}
                    </button>
                  );
                }
                if (actionId === 'calculator') {
                  return (
                    <button
                      key="calculator"
                      type="button"
                      onClick={() => setIsCalculatorOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 active-press whitespace-nowrap transition-all shadow-2xs"
                    >
                      <Calculator className="w-3.5 h-3.5 text-teal-600 dark:text-[#00E5B5]" />
                      <span>Calculadora</span>
                    </button>
                  );
                }
                if (actionId === 'categories') {
                  return (
                    <button
                      key="categories"
                      type="button"
                      onClick={() => setIsCategoriesModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 active-press whitespace-nowrap transition-all shadow-2xs"
                      title="Gerenciar categorias de despesas"
                    >
                      <Tag className="w-3.5 h-3.5 text-teal-600 dark:text-[#00E5B5]" />
                      <span>Categorias</span>
                    </button>
                  );
                }
                return null;
              })}

              {/* Botão de Organizar / Mover Botões */}
              <button
                type="button"
                onClick={() => setIsReorderModalOpen(true)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs border border-dashed border-slate-300 dark:border-slate-700 active-press whitespace-nowrap transition-all cursor-pointer shadow-2xs"
                title="Personalizar e mudar a ordem dos botões de atalho"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-teal-500" />
                <span>Mover Botões</span>
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

                <div className="flex items-center gap-1 flex-shrink-0">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-200 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none max-w-[130px] truncate"
                  >
                    {categoriesList.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setIsCategoriesModalOpen(true)}
                    className="p-1.5 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-teal-600 dark:hover:text-teal-300 rounded-xl border border-slate-200 dark:border-slate-700 active-press transition-colors"
                    title="Gerenciar categorias de despesas (criar, renomear, excluir)"
                  >
                    <Tag className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Banner when filtered by with_receipt */}
            {statusFilter === 'with_receipt' && filterCounts.withReceipt > 0 && (
              <div className="mx-4 mb-2 p-3 bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-500/15 rounded-2xl border border-teal-500/30 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-[#00C49F] flex items-center justify-center flex-shrink-0">
                    <Images className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {filterCounts.withReceipt} comprovante(s) anexado(s) neste mês
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      Abra a galeria visual para deslizar rapidamente pelas fotos dos comprovantes
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenReceiptsGallery}
                  className="px-3 py-1.5 rounded-xl bg-[#00C49F] hover:bg-[#00b290] text-[#0A1128] font-black text-xs flex items-center gap-1.5 flex-shrink-0 active-press shadow-xs cursor-pointer transition-all"
                >
                  <Images className="w-3.5 h-3.5" />
                  <span>Abrir Galeria</span>
                </button>
              </div>
            )}

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
                    onRestoreDueMonth={handleRestoreDueMonth}
                    onReassignActor={handleReassignActor}
                  />
                ))
              )}
            </div>
                </motion.div>
              ) : (
                <motion.div
                  key="cashflow-tab"
                  initial={{ opacity: 0, y: 8, filter: 'blur(1px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -8, filter: 'blur(1px)' }}
                  transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  {/* Tab 2: Monthly Cash Flow Report */}
                  <CashFlowReport
                    bills={currentMonthBills}
                    revenues={currentMonthRevenues}
                    selectedMonth={selectedMonth.label}
                    onOpenNewRevenue={() => {
                      setEditingRevenue(null);
                      setIsRevenueModalOpen(true);
                    }}
                    onEditRevenue={handleOpenEditRevenue}
                    onDeleteRevenue={(rev) => setRevenueToDelete(rev)}
                    onOpenBudgets={() => setIsBudgetModalOpen(true)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </PullToRefresh>
        </div>
      </main>

      {/* Native Bottom Tab Bar Navigation */}
      <nav className="flex-shrink-0 z-40 w-full bg-white/95 dark:bg-[#0A1128]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-2 sm:px-6 py-1 shadow-sm">
        <div className="max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto flex items-center justify-around gap-1 sm:gap-2">
          {/* Tab 1: Contas / Dívidas */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setCurrentTab('bills')}
            className={`relative flex flex-col items-center gap-0.5 py-1 px-3 sm:px-4 rounded-xl transition-all cursor-pointer ${
              currentTab === 'bills'
                ? 'text-[#00A884] dark:text-[#00E5B5] font-bold'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className="relative">
              <FileText className="w-4.5 h-4.5" />
              {currentMonthBills.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-amber-500 text-white text-[9px] font-black min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
                  {currentMonthBills.length}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight whitespace-nowrap">Dívidas</span>
          </motion.button>

          {/* Tab 2: Fluxo de Caixa */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setCurrentTab('cashflow')}
            className={`relative flex flex-col items-center gap-0.5 py-1 px-3 sm:px-4 rounded-xl transition-all cursor-pointer ${
              currentTab === 'cashflow'
                ? 'text-[#00A884] dark:text-[#00E5B5] font-bold'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <TrendingUp className="w-4.5 h-4.5" />
            <span className="text-[10px] tracking-tight whitespace-nowrap">Fluxo</span>
          </motion.button>

          {/* Tab 3: CloudKit Sync Drawer */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsCloudDrawerOpen(true)}
            className="flex flex-col items-center gap-0.5 py-1 px-3 sm:px-5 rounded-xl text-slate-400 hover:text-slate-600 active-press cursor-pointer"
          >
            <div className="relative">
              <Cloud className="w-4.5 h-4.5 text-teal-600 dark:text-teal-400" />
              <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <span className="text-[10px] tracking-tight whitespace-nowrap">Sincronia</span>
          </motion.button>
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
        onOpenManageCategories={() => setIsCategoriesModalOpen(true)}
        existingBills={bills}
      />

      <RevenueModal
        isOpen={isRevenueModalOpen}
        onClose={() => {
          setIsRevenueModalOpen(false);
          setEditingRevenue(null);
        }}
        onSave={handleSaveRevenue}
        onDeleteRequest={(rev) => setRevenueToDelete(rev)}
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
        onOpenBackup={() => setIsBackupModalOpen(true)}
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
        onOpenBackup={() => {
          setIsProfilesModalOpen(false);
          setIsBackupModalOpen(true);
        }}
        onDataRestored={() => {
          setBills(cloudkit.getBills());
          setRevenues(cloudkit.getRevenues());
          setDevices(cloudkit.getDevices());
          showTemporaryToast('✅ Dívidas e receitas atualizadas com sucesso a partir do arquivo do e-mail!');
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
        monthBills={currentMonthBills}
        selectedMonthLabel={selectedMonth.label}
        initialView={receiptModalInitialView}
        onSelectBill={(b) => {
          setViewingReceiptBill(b);
        }}
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

      <DeleteRevenueModal
        isOpen={Boolean(revenueToDelete)}
        onClose={() => setRevenueToDelete(null)}
        revenue={revenueToDelete}
        currentMonthLabel={selectedMonth.label}
        onDeleteCurrentMonth={handleDeleteRevenueSingleMonth}
        onDeleteAllMonths={handleDeleteRevenueAllMonths}
      />

      <NotificationCenterModal
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        notifications={inAppNotifications}
        onMarkAsRead={(id) => {
          const updated = inAppNotifications.map(n => n.id === id ? { ...n, read: true } : n);
          setInAppNotifications(updated);
          saveStoredInAppNotifications(updated);
        }}
        onMarkAllAsRead={() => {
          const updated = inAppNotifications.map(n => ({ ...n, read: true }));
          setInAppNotifications(updated);
          saveStoredInAppNotifications(updated);
        }}
        onClearAll={() => {
          setInAppNotifications([]);
          saveStoredInAppNotifications([]);
        }}
        bills={bills}
        onSelectBill={(bill) => {
          setEditingBill(bill);
          setIsBillModalOpen(true);
        }}
        onOpenSettings={() => {
          setIsProfilesModalOpen(true);
        }}
        onSimulateAlteration={handleSimulateSpouseAlteration}
      />

      <BudgetGoalsModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        bills={currentMonthBills}
        selectedMonthLabel={selectedMonth.label}
      />

      <CategoriesManagerModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
        bills={bills}
        onMigrateBillsCategory={handleMigrateBillsCategory}
      />

      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onDataRestored={() => {
          setBills(cloudkit.getBills());
          setRevenues(cloudkit.getRevenues());
          setDevices(cloudkit.getDevices());
          showTemporaryToast('✅ Dados restaurados e sincronizados com sucesso!');
        }}
      />

      <ReorderQuickActionsModal
        isOpen={isReorderModalOpen}
        onClose={() => setIsReorderModalOpen(false)}
        currentOrder={quickActionsOrder}
        onSaveOrder={(newOrder) => {
          setQuickActionsOrder(newOrder);
          showTemporaryToast('✨ Nova ordem dos botões salva!');
        }}
      />
    </div>
  );
}
