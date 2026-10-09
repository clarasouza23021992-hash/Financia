import React from 'react';
import { X, Trash2, Calendar, AlertTriangle, Layers, Ban } from 'lucide-react';
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
  if (!isOpen || !bill) return null;

  const isRecurringOrInstallment =
    bill.recurrence === 'Mensal Fixa' ||
    bill.recurrence === 'Parcelada' ||
    Boolean(bill.parentRecurringId) ||
    Boolean(bill.parentInstallmentId) ||
    Boolean(bill.fixedValueType) ||
    Boolean(bill.installmentNumber);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs modal-safe-overlay p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#0E172F] w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[calc(100dvh-1.5rem)] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-rose-600 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight">
                Confirmar Exclusão da Conta
              </h2>
              <p className="text-[11px] text-rose-100 font-medium">
                Você tem certeza de que deseja apagar este lançamento?
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-rose-100 hover:text-white transition-colors cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Card Resumo da Conta */}
          <div className="bg-slate-50 dark:bg-slate-900/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {bill.category} • {bill.recurrence}
              </div>
              <div className="text-sm font-black text-slate-900 dark:text-white truncate">
                {bill.name}
              </div>
              {bill.favored && (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Favorecido: {bill.favored}
                </div>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-base font-extrabold text-slate-900 dark:text-white">
                R$ {bill.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] font-semibold text-slate-500">
                Venc: {bill.dueDate.split('-').reverse().join('/')}
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-2xl text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
            ⚠️ <strong>Atenção:</strong> Deseja realmente excluir a conta <strong>"{bill.name}"</strong>? Esta ação removerá a despesa do seu cálculo mensal.
          </div>

          {/* Opções de Exclusão */}
          <div className="space-y-2.5">
            {isRecurringOrInstallment ? (
              <>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-bold">
                  Esta é uma conta recorrente ou parcelada. Selecione onde apagar:
                </p>

                {/* Botão Opção 1: Apenas neste mês */}
                <button
                  type="button"
                  onClick={() => {
                    onDeleteCurrentMonth(bill);
                    onClose();
                  }}
                  className="w-full text-left p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all active-press group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-200 dark:group-hover:bg-slate-600">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900 dark:text-white">
                        Sim, apagar apenas em {currentMonthLabel}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        Remove a dívida somente deste mês. Parcelas e registros de outros meses continuam mantidos.
                      </div>
                    </div>
                  </div>
                </button>

                {/* Botão Opção 2: Em TODOS os meses */}
                <button
                  type="button"
                  onClick={() => {
                    onDeleteAllMonths(bill);
                    onClose();
                  }}
                  className="w-full text-left p-3.5 rounded-2xl border border-rose-300 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 hover:border-rose-400 dark:hover:border-rose-800 transition-all active-press group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-rose-200 dark:bg-rose-900/70 text-rose-700 dark:text-rose-300 flex items-center justify-center flex-shrink-0 group-hover:bg-rose-300 dark:group-hover:bg-rose-800">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-rose-900 dark:text-rose-200">
                        Sim, apagar de TODOS os meses
                      </div>
                      <div className="text-[11px] text-rose-700 dark:text-rose-300 leading-snug">
                        Remove esta dívida de todo o histórico e meses futuros do planejamento.
                      </div>
                    </div>
                  </div>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onDeleteCurrentMonth(bill);
                  onClose();
                }}
                className="w-full p-3.5 rounded-2xl border border-rose-300 dark:border-rose-900/80 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 active-press shadow-md transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sim, quero apagar esta conta</span>
              </button>
            )}
          </div>

          {/* Cancelar */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white active-press rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar e Manter Conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
