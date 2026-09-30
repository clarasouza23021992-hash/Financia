import { Bill, InAppNotification, NotificationRule, NotificationSetting } from '../types/finance';

const NOTIFICATIONS_STORAGE_KEY = 'financas_in_app_notifications_v1';
const NOTIFICATION_RULE_KEY = 'financas_notification_rule_v1';
const NOTIFIED_CACHE_KEY_PREFIX = 'financas_notified_bills_';

// Play a pleasant chime using Web Audio API (100% offline, zero external dependencies)
export function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Tone 1: High crisp pleasant ping (D5 = 587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: Harmonic resolution (A5 = 880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.18, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch {
    // Audio context may fail if user hasn't interacted or unsupported; silently ignore
  }
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    return 'denied';
  }
}

export function getDefaultNotificationRule(): NotificationRule {
  const saved = localStorage.getItem(NOTIFICATION_RULE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {}
  }
  return {
    enabled: true,
    dueToday: true,
    daysInAdvance: 2,
    notifyOverdue: true,
    recurringReminders: true,
    soundEnabled: true,
    preferredTime: '09:00',
  };
}

export function saveNotificationRule(rule: NotificationRule): void {
  localStorage.setItem(NOTIFICATION_RULE_KEY, JSON.stringify(rule));
}

// In-app notifications store
export function getStoredInAppNotifications(): InAppNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredInAppNotifications(notifications: InAppNotification[]): void {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications.slice(0, 50)));
  } catch {}
}

// Send native browser notification
export async function sendNativeNotification(
  title: string,
  options?: NotificationOptions & { sound?: boolean }
): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    if (options?.sound) {
      playNotificationChime();
    }

    // Try service worker first (best for PWA)
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          icon: '/assets/icon-192.png',
          badge: '/assets/icon-192.png',
          ...options,
        });
        return true;
      }
    }

    // Fallback to standard Window Notification
    new Notification(title, {
      icon: '/assets/icon-192.png',
      ...options,
    });
    return true;
  } catch (err) {
    console.warn('Native notification failed:', err);
    return false;
  }
}

// Check bills and schedule/trigger notifications for due dates
export function checkAndNotifyBills(
  bills: Bill[],
  rule: NotificationRule,
  settings: NotificationSetting[] = []
): InAppNotification[] {
  if (!rule.enabled) return [];

  const todayStr = new Date().toISOString().split('T')[0];
  const cacheKey = `${NOTIFIED_CACHE_KEY_PREFIX}${todayStr}`;
  let notifiedIds: string[] = [];

  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) notifiedIds = JSON.parse(raw);
  } catch {}

  const newlyGenerated: InAppNotification[] = [];
  const billsToNotifyToday: Bill[] = [];
  const billsOverdue: Bill[] = [];
  const billsDueSoon: Bill[] = [];

  const dueTodaySetting = settings.find(s => s.daysBeforeDue === 0)?.enabled ?? rule.dueToday;
  const overdueSetting = settings.find(s => s.daysBeforeDue === -1)?.enabled ?? rule.notifyOverdue;
  const daysInAdvance = rule.daysInAdvance || 2;

  bills.forEach((bill) => {
    if (bill.status === 'paid') return;
    if (!bill.dueDate) return;

    // Bill due today
    if (bill.dueDate === todayStr && dueTodaySetting) {
      if (!notifiedIds.includes(bill.id)) {
        billsToNotifyToday.push(bill);
        notifiedIds.push(bill.id);
      }
    }
    // Bill overdue
    else if (bill.dueDate < todayStr && overdueSetting && bill.status === 'overdue') {
      const overdueNotifKey = `overdue_${bill.id}`;
      if (!notifiedIds.includes(overdueNotifKey)) {
        billsOverdue.push(bill);
        notifiedIds.push(overdueNotifKey);
      }
    }
    // Bill due soon (e.g. tomorrow or in 2 days)
    else if (bill.dueDate > todayStr) {
      const diffMs = new Date(bill.dueDate).getTime() - new Date(todayStr).getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= daysInAdvance && diffDays > 0) {
        const soonKey = `soon_${bill.id}_${diffDays}d`;
        if (!notifiedIds.includes(soonKey)) {
          billsDueSoon.push(bill);
          notifiedIds.push(soonKey);
        }
      }
    }
  });

  // Save updated cache to prevent repeated alerts today
  try {
    localStorage.setItem(cacheKey, JSON.stringify(notifiedIds));
  } catch {}

  // 1. Process Due Today
  if (billsToNotifyToday.length > 0) {
    const totalAmount = billsToNotifyToday.reduce((acc, b) => acc + (b.amount || 0), 0);
    const names = billsToNotifyToday.map(b => b.name).join(', ');

    const title = billsToNotifyToday.length === 1
      ? `⏰ Vence Hoje: ${billsToNotifyToday[0].name}`
      : `🔔 ${billsToNotifyToday.length} boletos vencem hoje!`;

    const body = `Total: R$ ${totalAmount.toFixed(2).replace('.', ',')} (${names}). Toque para pagar ou visualizar.`;

    sendNativeNotification(title, {
      body,
      tag: `due-today-${todayStr}`,
      sound: rule.soundEnabled,
    });

    billsToNotifyToday.forEach(b => {
      newlyGenerated.push({
        id: `notif_today_${b.id}_${Date.now()}`,
        title: `⏰ Boleto vence hoje: ${b.name}`,
        message: `Valor R$ ${Number(b.amount || 0).toFixed(2).replace('.', ',')} com vencimento para hoje.`,
        date: new Date().toISOString(),
        type: 'urgent',
        read: false,
        billId: b.id,
      });
    });
  }

  // 2. Process Overdue
  if (billsOverdue.length > 0) {
    const count = billsOverdue.length;
    const title = count === 1 ? `⚠️ Conta Atrasada: ${billsOverdue[0].name}` : `⚠️ ${count} contas atrasadas!`;
    const body = `Evite juros e multas. Verifique suas contas pendentes.`;

    sendNativeNotification(title, {
      body,
      tag: `overdue-${todayStr}`,
      sound: rule.soundEnabled,
    });

    billsOverdue.forEach(b => {
      newlyGenerated.push({
        id: `notif_overdue_${b.id}_${Date.now()}`,
        title: `⚠️ Conta Atrasada: ${b.name}`,
        message: `Venceu em ${b.dueDate.split('-').reverse().join('/')} no valor de R$ ${Number(b.amount || 0).toFixed(2).replace('.', ',')}`,
        date: new Date().toISOString(),
        type: 'warning',
        read: false,
        billId: b.id,
      });
    });
  }

  // 3. Process Due Soon
  if (billsDueSoon.length > 0) {
    billsDueSoon.forEach(b => {
      newlyGenerated.push({
        id: `notif_soon_${b.id}_${Date.now()}`,
        title: `🗓️ Vencimento Próximo: ${b.name}`,
        message: `Vence em ${b.dueDate.split('-').reverse().join('/')} (R$ ${Number(b.amount || 0).toFixed(2).replace('.', ',')})`,
        date: new Date().toISOString(),
        type: 'info',
        read: false,
        billId: b.id,
      });
    });
  }

  return newlyGenerated;
}
