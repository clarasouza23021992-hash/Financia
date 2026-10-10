import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Calendar, Layers, AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';
import { Revenue } from '../types/finance';

interface DeleteRevenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  revenue: Revenue | null;
  currentMonthLabel: string;
  onDeleteCurrentMonth: (revenue: Revenue) => void;
  onDeleteAllMonths: (revenue: Revenue) => void;
}

export const DeleteRevenueModal: React.FC<DeleteRevenueModalProps> = ({
  isOpen,
  onClose,
  revenue,
  currentMonthLabel,
  onDeleteCurrentMonth,
  onDeleteAllMonths,
}) => {
  const [deletingType, setDeletingType] = useState<'single' | 'all' | null>(null);

  if (!isOpen || !revenue) return null;

  const formatBRL = (val: number) => {
    return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleExecuteDelete = (type: 'single' | 'all') => {
    setDeletingType(type);
    setTimeout(() => {
      if (type === 'single') {
        onDeleteCurrentMonth(revenue);
      } else {
        onDeleteAllMonths(revenue);
      }
      setDeletingType(null);
      onClose();
    }, 320);
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs modal-safe-overlay p-3 sm:p-4 overflow-y-auto"
        onClick={() => {
          if (!deletingType) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ type: 'spring', stiffness: 450, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-[#0E172F] w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl border border-rose-200/80 dark:border-rose-900/60 overflow-hidden my-auto max-h-[calc(100dvh-1.5rem)] relative"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-rose-600 to-rose-700 text-white px-5 py-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5">
              <motion.div 
                animate={{ scale: [1, 1.12, 1], rotate: [0, -6, 6, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white flex-shrink-0 shadow-inner"
              >
                <AlertTriangle className="w-5 h-5 text-amber-200" />
              </motion.div>
              <div>
                <h2 className="text-sm font-black tracking-tight">
                  Confirmar Exclusão da Receita
                </h2>
                <p className="text-[11px] text-rose-100 font-medium">
                  Tem certeza mesmo que deseja apagar?
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={Boolean(deletingType)}
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-rose-100 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              aria-label="Fechar modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Card Resumo da Receita */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-50 dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-inner"
            >
              <div className="min-w-0 pr-2">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {revenue.category} • {revenue.recurrence || 'Mensal'}
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5">
                  {revenue.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                  <span>Titular:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{revenue.profileName || 'Você'}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                  + {formatBRL(revenue.amount)}
                </div>
                <div className="text-[11px] font-semibold text-slate-500">
                  Data: {revenue.date ? revenue.date.split('-').reverse().join('/') : '-'}
                </div>
              </div>
            </motion.div>

            {/* Aviso de Confirmação */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/70 rounded-2xl text-xs text-rose-900 dark:text-rose-200 leading-relaxed flex items-start gap-2.5"
            >
              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Atenção:</strong> Deseja realmente excluir a receita <strong>"{revenue.name}"</strong>? O valor será subtraído do saldo do casal.
              </div>
            </motion.div>

            {/* Opções de Exclusão */}
            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300 font-bold">
                Como deseja excluir a receita <strong>"{revenue.name}"</strong>?
              </p>

              {/* Opção 1: Apenas neste mês */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                disabled={Boolean(deletingType)}
                onClick={() => handleExecuteDelete('single')}
                className="w-full text-left p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all group cursor-pointer disabled:opacity-60 shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-200 dark:group-hover:bg-slate-600 transition-colors">
                    {deletingType === 'single' ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-rose-600" />
                    ) : (
                      <Calendar className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Apagar apenas em {currentMonthLabel}</span>
                      {deletingType === 'single' && (
                        <span className="text-[10px] text-rose-600 font-bold animate-pulse">Apagando...</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      Remove a receita somente deste mês. Outros meses continuam normais.
                    </div>
                  </div>
                </div>
              </motion.button>

              {/* Opção 2: Em TODOS os meses */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                disabled={Boolean(deletingType)}
                onClick={() => handleExecuteDelete('all')}
                className="w-full text-left p-3.5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 hover:border-rose-300 dark:hover:border-rose-800 transition-all group cursor-pointer disabled:opacity-60 shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-200/80 dark:bg-rose-900/70 text-rose-700 dark:text-rose-300 flex items-center justify-center flex-shrink-0 group-hover:bg-rose-300 dark:group-hover:bg-rose-800 transition-colors">
                    {deletingType === 'all' ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-rose-700" />
                    ) : (
                      <Layers className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                      <span>Apagar em TODOS os meses (atual e futuros)</span>
                      {deletingType === 'all' && (
                        <span className="text-[10px] text-rose-700 font-bold animate-pulse">Apagando...</span>
                      )}
                    </div>
                    <div className="text-[11px] text-rose-700 dark:text-rose-300 leading-snug">
                      Remove esta receita de todos os meses do planejamento financeiro.
                    </div>
                  </div>
                </div>
              </motion.button>
            </div>

            {/* Cancelar */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={Boolean(deletingType)}
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar e Manter Receita
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
