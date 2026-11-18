import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Calendar, AlertTriangle, Layers, RefreshCw, ShieldAlert, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Bill } from '../types/finance';

interface DeleteBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill | null;
  currentMonthLabel: string;
  onDeleteCurrentMonth: (bill: Bill) => void;
  onDeleteAllMonths: (bill: Bill) => void;
}

export const DeleteBillModal: React.FC<DeleteBillModalProps> = ({
  isOpen,
  onClose,
  bill,
  currentMonthLabel,
  onDeleteCurrentMonth,
  onDeleteAllMonths,
}) => {
  const [deletingType, setDeletingType] = useState<'single' | 'all' | null>(null);
  const [selectedScope, setSelectedScope] = useState<'single' | 'all' | null>(null);
  const [isConfirmedChecked, setIsConfirmedChecked] = useState(false);

  const isRecurringOrInstallment = Boolean(
    bill && (
      bill.recurrence === 'Mensal Fixa' ||
      bill.recurrence === 'Parcelada' ||
      bill.parentRecurringId ||
      bill.parentInstallmentId ||
      bill.fixedValueType ||
      bill.installmentNumber
    )
  );

  // Reset confirmation states whenever modal opens or bill changes
  useEffect(() => {
    if (isOpen && bill) {
      setDeletingType(null);
      setIsConfirmedChecked(false);
      setSelectedScope(isRecurringOrInstallment ? null : 'single');
    } else {
      setDeletingType(null);
      setSelectedScope(null);
      setIsConfirmedChecked(false);
    }
  }, [isOpen, bill?.id, isRecurringOrInstallment]);

  if (!isOpen || !bill) return null;

  const handleExecuteDelete = (type: 'single' | 'all') => {
    if (!isConfirmedChecked) return;
    setDeletingType(type);
    setTimeout(() => {
      if (type === 'single') {
        onDeleteCurrentMonth(bill);
      } else {
        onDeleteAllMonths(bill);
      }
      setDeletingType(null);
      setSelectedScope(null);
      setIsConfirmedChecked(false);
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
          {/* Header with animated warning icon */}
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
                <h2 className="text-sm font-black tracking-tight flex items-center gap-1.5">
                  Confirmar Exclusão da Conta
                </h2>
                <p className="text-[11px] text-rose-100 font-medium">
                  {selectedScope
                    ? 'Confirmação obrigatória antes de apagar'
                    : 'Escolha como deseja remover este lançamento'}
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
            {/* Card Resumo da Conta */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-50 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-inner"
            >
              <div className="min-w-0 pr-2">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {bill.category} • {bill.recurrence}
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white truncate mt-0.5">
                  {bill.name}
                </div>
                {bill.favored && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    Favorecido: {bill.favored}
                  </div>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-base font-extrabold text-rose-600 dark:text-rose-400">
                  R$ {bill.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] font-semibold text-slate-500">
                  Venc: {bill.dueDate ? bill.dueDate.split('-').reverse().join('/') : '-'}
                </div>
              </div>
            </motion.div>

            {/* Step 1: Escolher escopo para contas recorrentes / parceladas */}
            {isRecurringOrInstallment && !selectedScope ? (
              <div className="space-y-2.5">
                <p className="text-xs text-slate-600 dark:text-slate-300 font-bold">
                  Esta é uma conta recorrente ou parcelada. Onde deseja apagar?
                </p>

                {/* Opção 1: Apenas neste mês */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => {
                    setSelectedScope('single');
                    setIsConfirmedChecked(false);
                  }}
                  className="w-full text-left p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all group cursor-pointer shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-200 dark:group-hover:bg-slate-600 transition-colors">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black text-slate-900 dark:text-white">
                        Apagar apenas em {currentMonthLabel}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        Remove somente deste mês. Os outros meses permanecem intactos.
                      </div>
                    </div>
                  </div>
                </motion.button>

                {/* Opção 2: Em TODOS os meses */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => {
                    setSelectedScope('all');
                    setIsConfirmedChecked(false);
                  }}
                  className="w-full text-left p-3.5 rounded-2xl border border-rose-300 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 hover:border-rose-400 dark:hover:border-rose-800 transition-all group cursor-pointer shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-200 dark:bg-rose-900/70 text-rose-700 dark:text-rose-300 flex items-center justify-center flex-shrink-0 group-hover:bg-rose-300 dark:group-hover:bg-rose-800 transition-colors">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black text-rose-900 dark:text-rose-200">
                        Apagar de TODOS os meses
                      </div>
                      <div className="text-[11px] text-rose-700 dark:text-rose-300 leading-snug">
                        Remove esta série de contas do histórico e dos meses futuros.
                      </div>
                    </div>
                  </div>
                </motion.button>
              </div>
            ) : (
              /* Step 2: Confirmação real obrigatória */
              <div className="space-y-3">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/70 rounded-2xl text-xs text-rose-900 dark:text-rose-200 leading-relaxed flex items-start gap-2.5"
                >
                  <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Confirmação Final:</strong>{' '}
                    {selectedScope === 'all' ? (
                      <span>
                        Você vai apagar <strong>"{bill.name}"</strong> de <strong>TODOS os meses</strong> (atual e futuros). Esta ação não pode ser desfeita.
                      </span>
                    ) : isRecurringOrInstallment ? (
                      <span>
                        Você vai apagar <strong>"{bill.name}"</strong> apenas do mês de <strong>{currentMonthLabel}</strong>.
                      </span>
                    ) : (
                      <span>
                        Você vai apagar definitivamente a conta <strong>"{bill.name}"</strong>. Os totais serão recalculados.
                      </span>
                    )}
                  </div>
                </motion.div>

                {/* Checkbox explícito de confirmação */}
                <label className="flex items-start gap-2.5 p-3 rounded-2xl border-2 border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-900 cursor-pointer hover:border-rose-400 transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={isConfirmedChecked}
                    disabled={Boolean(deletingType)}
                    onChange={(e) => setIsConfirmedChecked(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded accent-rose-600 cursor-pointer flex-shrink-0"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug">
                    Sim, tenho certeza que desejo apagar{' '}
                    {selectedScope === 'all' ? 'em TODOS os meses' : 'esta conta'}
                  </span>
                </label>

                <motion.button
                  whileTap={isConfirmedChecked ? { scale: 0.98 } : undefined}
                  type="button"
                  disabled={!isConfirmedChecked || Boolean(deletingType)}
                  onClick={() => handleExecuteDelete(selectedScope || 'single')}
                  className={`w-full p-3.5 rounded-2xl border font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                    isConfirmedChecked
                      ? 'border-rose-400 dark:border-rose-800 bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/25 cursor-pointer'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {deletingType ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Apagando conta agora...</span>
                    </>
                  ) : isConfirmedChecked ? (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>
                        {selectedScope === 'all'
                          ? 'Confirmar e Apagar de TODOS os Meses'
                          : 'Confirmar e Apagar Conta'}
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 opacity-50" />
                      <span>Marque a caixa acima para confirmar</span>
                    </>
                  )}
                </motion.button>
              </div>
            )}

            {/* Rodapé: Voltar / Cancelar */}
            <div className="pt-2 flex items-center justify-between">
              {isRecurringOrInstallment && selectedScope ? (
                <button
                  type="button"
                  disabled={Boolean(deletingType)}
                  onClick={() => {
                    setSelectedScope(null);
                    setIsConfirmedChecked(false);
                  }}
                  className="px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                disabled={Boolean(deletingType)}
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar e Manter Conta
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
