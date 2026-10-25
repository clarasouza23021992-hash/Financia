import React, { useState, useEffect } from 'react';
import { 
  X, Check, TrendingUp, SlidersHorizontal, Edit2
} from 'lucide-react';
import { Bill, CategoryBudget } from '../types/finance';

interface BudgetGoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bills: Bill[];
  selectedMonthLabel?: string;
}

const BUDGETS_STORAGE_KEY = 'financas_category_budgets_v1';

const DEFAULT_BUDGETS: CategoryBudget[] = [
  { category: 'Alimentação', limit: 2000 },
  { category: 'Moradia', limit: 3000 },
  { category: 'Transporte', limit: 800 },
  { category: 'Lazer', limit: 600 },
  { category: 'Saúde', limit: 700 },
  { category: 'Cartão de Crédito', limit: 2500 },
  { category: 'Educação', limit: 1200 },
];

export const BudgetGoalsModal: React.FC<BudgetGoalsModalProps> = ({
  isOpen,
  onClose,
  bills,
  selectedMonthLabel = 'Mês Atual',
}) => {
  // Budgets state
  const [budgets, setBudgets] = useState<CategoryBudget[]>(() => {
    try {
      const saved = localStorage.getItem(BUDGETS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_BUDGETS;
    } catch {
      return DEFAULT_BUDGETS;
    }
  });

  // Editing budget item
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingLimit, setEditingLimit] = useState<string>('');

  useEffect(() => {
    try {
      localStorage.setItem(BUDGETS_STORAGE_KEY, JSON.stringify(budgets));
    } catch {}
  }, [budgets]);

  if (!isOpen) return null;

  // Calculate actual spending per category in current bills
  const spentPerCategory: Record<string, number> = {};
  bills.forEach((b) => {
    const cat = b.category || 'Outros';
    spentPerCategory[cat] = (spentPerCategory[cat] || 0) + (Number(b.amount) || 0);
  });

  const totalBudget = budgets.reduce((acc, b) => acc + b.limit, 0);
  const totalSpentAcrossBudgets = budgets.reduce((acc, b) => acc + (spentPerCategory[b.category] || 0), 0);

  const handleSaveBudgetLimit = (category: string) => {
    const num = parseFloat(editingLimit.replace(',', '.'));
    if (isNaN(num) || num < 0) return;

    setBudgets((prev) =>
      prev.map((b) => (b.category === category ? { ...b, limit: num } : b))
    );
    setEditingCategory(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in overflow-y-auto overscroll-contain">
      <div 
        className="bg-white dark:bg-[#10182F] w-full max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col my-auto max-h-[min(92dvh,calc(100vh-2rem))] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white flex items-center justify-center shadow-xs">
              <SlidersHorizontal className="w-5 h-5 text-[#0A1128]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Teto Orçamentário por Categoria
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Limites e controle de gastos • {selectedMonthLabel}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content: Category Budgets */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Overview Banner */}
          <div className="bg-gradient-to-br from-slate-900 to-[#101E3C] text-white p-4 rounded-2xl border border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-300 font-semibold">Teto Geral Planejado</span>
              <span className="font-extrabold text-teal-300">
                R$ {totalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm font-bold mb-1.5">
              <span>Gasto Consumido no Mês</span>
              <span className={totalSpentAcrossBudgets > totalBudget ? 'text-rose-400' : 'text-emerald-400'}>
                R$ {totalSpentAcrossBudgets.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* General Progress Bar */}
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  totalSpentAcrossBudgets > totalBudget
                    ? 'bg-rose-500'
                    : totalSpentAcrossBudgets / totalBudget > 0.85
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, totalBudget > 0 ? (totalSpentAcrossBudgets / totalBudget) * 100 : 0)}%` }}
              />
            </div>

            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
              <span>
                {totalSpentAcrossBudgets > totalBudget ? (
                  <span className="text-rose-300 font-bold">
                    ⚠️ Orçamento total ultrapassado em R$ {(totalSpentAcrossBudgets - totalBudget).toFixed(2).replace('.', ',')}
                  </span>
                ) : (
                  <span>
                    Margem restante:{' '}
                    <strong className="text-white">
                      R$ {(totalBudget - totalSpentAcrossBudgets).toFixed(2).replace('.', ',')}
                    </strong>
                  </span>
                )}
              </span>
              <span>{totalBudget > 0 ? Math.round((totalSpentAcrossBudgets / totalBudget) * 100) : 0}%</span>
            </div>
          </div>

          {/* List of Categories with Limit */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Limites Definidos por Categoria
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Toque para editar o valor
              </span>
            </div>

            {budgets.map((b) => {
              const spent = spentPerCategory[b.category] || 0;
              const percent = b.limit > 0 ? Math.min(150, Math.round((spent / b.limit) * 100)) : 0;
              const isOver = spent > b.limit;
              const isWarning = !isOver && percent >= 80;
              const isEditing = editingCategory === b.category;

              return (
                <div
                  key={b.category}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isOver
                      ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-300/80 dark:border-rose-900/50'
                      : isWarning
                      ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300/80 dark:border-amber-900/50'
                      : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {b.category}
                      </span>
                      {isOver && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white">
                          Ultrapassou {percent}%
                        </span>
                      )}
                      {isWarning && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-slate-950">
                          Atenção {percent}%
                        </span>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editingLimit}
                          onChange={(e) => setEditingLimit(e.target.value)}
                          placeholder="R$ teto"
                          className="w-24 text-xs font-bold px-2 py-1 rounded-lg border border-teal-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveBudgetLimit(b.category)}
                          className="w-7 h-7 bg-teal-500 text-[#0A1128] rounded-lg flex items-center justify-center font-bold"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategory(b.category);
                          setEditingLimit(String(b.limit));
                        }}
                        className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-300 font-semibold"
                        title="Clique para alterar o limite"
                      >
                        <span>Teto: R$ {b.limit.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                        <Edit2 className="w-3 h-3 text-slate-400" />
                      </button>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-teal-500'
                      }`}
                      style={{ width: `${Math.min(100, percent)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                    <span>
                      Gasto: <strong className="text-slate-800 dark:text-slate-200">R$ {spent.toFixed(2).replace('.', ',')}</strong>
                    </span>
                    <span>
                      {isOver ? (
                        <span className="text-rose-600 dark:text-rose-400 font-bold">
                          +R$ {(spent - b.limit).toFixed(2).replace('.', ',')} acima
                        </span>
                      ) : (
                        <span>
                          Resta R$ {(b.limit - spent).toFixed(2).replace('.', ',')}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl active-press"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
