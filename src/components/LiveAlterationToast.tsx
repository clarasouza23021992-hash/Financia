import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Edit3, Paperclip, AlertCircle, ArrowRight, Bell, Trash2, Calendar, Smartphone } from 'lucide-react';
import { ChangeNotification } from '../types/finance';
import { cloudkit } from '../services/cloudkitSync';

interface LiveAlterationToastProps {
  notification: ChangeNotification | null;
  onDismiss: () => void;
  onSelectBillName?: (billName: string) => void;
}

export const LiveAlterationToast: React.FC<LiveAlterationToastProps> = ({
  notification,
  onDismiss,
  onSelectBillName,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!notification) return;

    setProgress(100);
    const duration = 6500;
    const interval = 50;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [notification, onDismiss]);

  if (!notification) return null;

  const isPaid = notification.actionType === 'bill_paid';
  const isCreated = notification.actionType === 'bill_created';
  const isReceipt = notification.actionType === 'receipt_attached';
  const isDeleted = notification.actionType === 'bill_deleted';
  const isRescheduled = notification.actionType === 'bill_rescheduled';

  const rawActor = notification.sourceUserName || 'Morador';
  const lower = rawActor.toLowerCase();
  const wifeName = cloudkit.getWifeName();
  const wifeLower = wifeName.toLowerCase();
  const titularName = cloudkit.getTitularName();

  let actorName = titularName;
  let isWife = false;
  if (lower.includes(wifeLower) || lower.includes('esposa') || lower.includes('cônjuge') || lower.includes('clara') || lower.includes('paula')) {
    actorName = wifeName;
    isWife = true;
  } else if (lower.includes('carlos') || lower.includes('você') || lower.includes('titular') || lower.includes('meu')) {
    actorName = titularName;
    isWife = false;
  } else if (rawActor && !/iphone|android|celular|computador|dispositivo|dev_/i.test(rawActor)) {
    actorName = rawActor.trim();
    isWife = false;
  }
  const avatar = isWife ? '👩🏻' : '👤';

  let iconElement = <Edit3 className="w-4 h-4 text-amber-500" />;
  let accentBorder = 'border-amber-400 dark:border-amber-500/60';
  let badgeBg = 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300';
  let actionVerb = 'alterou a dívida';

  // Canonical Device Label: strictly 'Paula (iPhone)' or 'Carlos (iPhone)'
  const rawDev = (notification.sourceDeviceName || '').trim();
  const devLow = rawDev.toLowerCase();
  const isDevWife = isWife || devLow.includes('paula') || devLow.includes('esposa') || devLow.includes('clara');
  const canonicalDevice = isDevWife ? 'Paula (iPhone)' : 'Carlos (iPhone)';

  if (isPaid) {
    iconElement = <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    accentBorder = 'border-emerald-400 dark:border-emerald-500/60';
    badgeBg = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300';
    actionVerb = 'marcou como PAGA! ✅';
  } else if (isCreated) {
    iconElement = <Bell className="w-4 h-4 text-teal-500" />;
    accentBorder = 'border-teal-400 dark:border-teal-500/60';
    badgeBg = 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300';
    actionVerb = 'cadastrou nova dívida 🧾';
  } else if (isReceipt) {
    iconElement = <Paperclip className="w-4 h-4 text-blue-500" />;
    accentBorder = 'border-blue-400 dark:border-blue-500/60';
    badgeBg = 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300';
    actionVerb = 'anexou comprovante 📎';
  } else if (isDeleted) {
    iconElement = <Trash2 className="w-4 h-4 text-rose-500" />;
    accentBorder = 'border-rose-400 dark:border-rose-500/60';
    badgeBg = 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300';
    actionVerb = 'excluiu a dívida 🗑️';
  } else if (isRescheduled) {
    iconElement = <Calendar className="w-4 h-4 text-indigo-500" />;
    accentBorder = 'border-indigo-400 dark:border-indigo-500/60';
    badgeBg = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300';
    actionVerb = 'reprogramou o mês 🗓️';
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
        className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md z-50 pointer-events-auto"
      >
        <div className={`relative overflow-hidden rounded-2xl bg-white dark:bg-[#0D152A] shadow-2xl border-2 ${accentBorder} p-3.5 backdrop-blur-md`}>
          {/* Progress bar line */}
          <div
            className="absolute top-0 left-0 h-1 bg-[#00C49F] transition-all ease-linear"
            style={{ width: `${progress}%` }}
          />

          <div className="flex items-start gap-3">
            {/* Avatar & Icon */}
            <div className="relative shrink-0 mt-0.5">
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                {avatar}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white dark:bg-[#0D152A] flex items-center justify-center">
                {iconElement}
              </div>
            </div>

            {/* Notification content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${badgeBg}`}>
                  {actorName}
                </span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 inline-flex items-center gap-1 shadow-2xs">
                  <Smartphone className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span>{canonicalDevice}</span>
                </span>
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  {actionVerb}
                </span>
                <span className="text-[10px] text-slate-400 font-mono ml-auto">
                  {(() => {
                    const d = notification.timestamp ? new Date(notification.timestamp) : new Date();
                    const h = String(d.getHours()).padStart(2, '0');
                    const m = String(d.getMinutes()).padStart(2, '0');
                    return `${h}:${m}`;
                  })()}
                </span>
              </div>

              {notification.targetItemName && (
                <p className="text-xs font-semibold text-slate-900 dark:text-white mt-1 truncate">
                  "{notification.targetItemName}"
                  {notification.amount !== undefined && notification.amount > 0 && (
                    <span className="text-teal-600 dark:text-teal-400 font-extrabold ml-1">
                      (R$ {Number(notification.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </span>
                  )}
                </p>
              )}

              {notification.message && !notification.targetItemName && (
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                  {notification.message}
                </p>
              )}

              {/* Origin device clearly labeled to avoid confusion */}
              <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                <span className="opacity-80">Aparelho da alteração:</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60">
                  <Smartphone className="w-2.5 h-2.5 text-teal-600 dark:text-teal-400" />
                  {canonicalDevice}
                </span>
              </div>

              {/* Quick action button to scroll/filter */}
              {notification.targetItemName && onSelectBillName && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectBillName(notification.targetItemName!);
                    onDismiss();
                  }}
                  className="mt-1.5 text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>Localizar esta conta</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Dismiss button */}
            <button
              type="button"
              onClick={onDismiss}
              className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center shrink-0 active:scale-90 transition-transform"
              title="Fechar notificação"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
