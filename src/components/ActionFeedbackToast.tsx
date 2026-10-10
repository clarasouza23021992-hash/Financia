import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Trash2, Edit3, X, Bell, Sparkles, AlertTriangle } from 'lucide-react';
import { playSaveChime, playDeletePop } from '../services/notificationService';

export interface ActionToastData {
  id?: string;
  type: 'save' | 'edit' | 'delete' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface ActionFeedbackToastProps {
  toast: ActionToastData | null;
  onDismiss: () => void;
}

export const ActionFeedbackToast: React.FC<ActionFeedbackToastProps> = ({
  toast,
  onDismiss,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!toast) return;
    setProgress(100);

    // Play subtle auditory feedback
    if (toast.type === 'save') {
      playSaveChime();
    } else if (toast.type === 'delete') {
      playDeletePop();
    }

    const duration = toast.duration || 4500;
    const intervalTime = 50;
    const decrement = 100 / (duration / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= decrement) {
          clearInterval(timer);
          return 0;
        }
        return prev - decrement;
      });
    }, intervalTime);

    const timeout = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => {
      clearInterval(timer);
      clearTimeout(timeout);
    };
  }, [toast, onDismiss]);

  if (!toast) return null;

  const isSave = toast.type === 'save';
  const isEdit = toast.type === 'edit';
  const isDelete = toast.type === 'delete';

  let config = {
    badgeBg: 'bg-emerald-500/15 dark:bg-emerald-500/25',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-500/50 dark:border-emerald-400/60 shadow-emerald-500/20',
    barColor: 'bg-gradient-to-r from-emerald-500 to-teal-400',
    icon: (
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: [0, 1.25, 1], rotate: [0, 10, 0] }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      >
        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
      </motion.div>
    ),
    label: 'SALVO COM SUCESSO',
  };

  if (isEdit) {
    config = {
      badgeBg: 'bg-amber-500/15 dark:bg-amber-500/25',
      badgeText: 'text-amber-700 dark:text-amber-300',
      borderColor: 'border-amber-500/50 dark:border-amber-400/60 shadow-amber-500/20',
      barColor: 'bg-gradient-to-r from-amber-500 to-orange-400',
      icon: (
        <motion.div
          animate={{ rotate: [0, -15, 15, -5, 5, 0] }}
          transition={{ duration: 0.5 }}
        >
          <Edit3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </motion.div>
      ),
      label: 'ALTERAÇÃO SALVA',
    };
  } else if (isDelete) {
    config = {
      badgeBg: 'bg-rose-500/15 dark:bg-rose-500/25',
      badgeText: 'text-rose-700 dark:text-rose-300',
      borderColor: 'border-rose-500/50 dark:border-rose-400/60 shadow-rose-500/20',
      barColor: 'bg-gradient-to-r from-rose-500 to-red-600',
      icon: (
        <motion.div
          animate={{ rotate: [0, -14, 14, -8, 8, 0], scale: [0.85, 1.2, 1] }}
          transition={{ duration: 0.5 }}
        >
          <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
        </motion.div>
      ),
      label: 'EXCLUÍDO DEFINITIVAMENTE',
    };
  } else if (toast.type === 'info') {
    config = {
      badgeBg: 'bg-teal-500/15 dark:bg-teal-500/25',
      badgeText: 'text-teal-700 dark:text-teal-300',
      borderColor: 'border-teal-500/40 dark:border-teal-500/50 shadow-teal-500/15',
      barColor: 'bg-teal-500',
      icon: <Bell className="w-5 h-5 text-teal-600 dark:text-teal-400" />,
      label: 'AVISO',
    };
  }

  return (
    <div className="fixed top-3 sm:top-5 left-0 right-0 z-70 pointer-events-none px-3 sm:px-4 flex justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={toast.id || toast.title}
          initial={{ opacity: 0, y: -30, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9, filter: 'blur(3px)' }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className={`pointer-events-auto max-w-lg w-full bg-white/95 dark:bg-[#0F172E]/95 rounded-2xl sm:rounded-3xl shadow-2xl border ${config.borderColor} overflow-hidden backdrop-blur-md relative`}
        >
          {/* Subtle Sparkle Accent for Save */}
          {isSave && (
            <div className="absolute top-2 right-10 flex gap-1 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0.5, 1.3, 0.5] }}
                transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1 }}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              </motion.div>
            </div>
          )}

          {/* Subtle Accent for Delete */}
          {isDelete && (
            <div className="absolute top-2 right-10 flex gap-1 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 0.8, 0], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.8 }}
              >
                <span className="text-[10px] text-rose-400 font-bold">🗑️</span>
              </motion.div>
            </div>
          )}

          <div className="p-3.5 sm:p-4 flex items-start gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs ${config.badgeBg}`}>
              {config.icon}
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${config.badgeBg} ${config.badgeText}`}>
                  {config.label}
                </span>
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                  {toast.title}
                </h4>
              </div>
              {toast.message && (
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug font-medium">
                  {toast.message}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onDismiss}
              aria-label="Fechar mensagem de confirmação"
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0 cursor-pointer active:scale-95"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Animated Countdown Progress Bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800/60 h-1 overflow-hidden">
            <div
              className={`h-full ${config.barColor} transition-all duration-75`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
