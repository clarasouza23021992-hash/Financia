import React, { useState, useEffect } from 'react';
import { 
  X, Target, PiggyBank, Plus, Check, Trash2, 
  TrendingUp, AlertCircle, ArrowUpRight, ShieldCheck, 
  Coins, Sparkles, ChevronRight, Edit2
} from 'lucide-react';
import { Bill, CategoryBudget, SavingsGoal } from '../types/finance';

interface BudgetGoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bills: Bill[];
  selectedMonthLabel?: string;
}

const BUDGETS_STORAGE_KEY = 'financas_category_budgets_v1';
const GOALS_STORAGE_KEY = 'financas_savings_goals_v1';

const DEFAULT_BUDGETS: CategoryBudget[] = [
  { category: 'Alimentação', limit: 2000 },
  { category: 'Moradia', limit: 3000 },
  { category: 'Transporte', limit: 800 },
  { category: 'Lazer', limit: 600 },
  { category: 'Saúde', limit: 700 },
  { category: 'Cartão de Crédito', limit: 2500 },
  { category: 'Educação', limit: 1200 },
];

const DEFAULT_GOALS: SavingsGoal[] = [
  { id: 'goal-1', name: 'Reserva de Emergência do Casal', targetAmount: 15000, currentAmount: 6200, icon: '🛡️' },
  { id: 'goal-2', name: 'Viagem de Férias', targetAmount: 5000, currentAmount: 2350, icon: '✈️' },
];

export const BudgetGoalsModal: React.FC<BudgetGoalsModalProps> = ({
  isOpen,
  onClose,
  bills,
  selectedMonthLabel = 'Mês Atual',
}) => {
  const [activeTab, setActiveTab] = useState<'budget' | 'goals'>('budget');

  // Budgets state
  const [budgets, setBudgets] = useState<CategoryBudget[]>(() => {
    try {
      const saved = localStorage.getItem(BUDGETS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_BUDGETS;
    } catch {
      return DEFAULT_BUDGETS;
    }
  });

  // Goals state
  const [goals, setGoals] = useState<SavingsGoal[]>(() => {
    try {
      const saved = localStorage.getItem(GOALS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_GOALS;
    } catch {
      return DEFAULT_GOALS;
    }
  });

  // Editing budget item
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingLimit, setEditingLimit] = useState<string>('');

  // Adding new goal
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalCurrent, setNewGoalCurrent] = useState('');
  const [newGoalIcon, setNewGoalIcon] = useState('🎯');

  // Quick adjust goal amount modal
  const [adjustGoalId, setAdjustGoalId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>('');

  useEffect(() => {
    try {
      localStorage.setItem(BUDGETS_STORAGE_KEY, JSON.stringify(budgets));
    } catch {}
  }, [budgets]);

  useEffect(() => {
    try {
      localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
    } catch {}
  }, [goals]);

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

  const handleAddGoal = () => {
    if (!newGoalName.trim()) return;
    const target = parseFloat(newGoalTarget.replace(',', '.')) || 0;
    const current = parseFloat(newGoalCurrent.replace(',', '.')) || 0;

    const newGoal: SavingsGoal = {
      id: `goal_${Date.now()}`,
      name: newGoalName.trim(),
      targetAmount: target,
      currentAmount: current,
      icon: newGoalIcon || '🎯',
    };

    setGoals((prev) => [...prev, newGoal]);
    setNewGoalName('');
    setNewGoalTarget('');
    setNewGoalCurrent('');
    setIsAddingGoal(false);
  };

  const handleDeleteGoal = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const handleAdjustGoalSavings = (goalId: string, isAdd: boolean) => {
    const num = parseFloat(adjustAmount.replace(',', '.'));
    if (isNaN(num) || num <= 0) return;

    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === goalId) {
          const updated = isAdd ? g.currentAmount + num : Math.max(0, g.currentAmount - num);
          return { ...g, currentAmount: updated };
        }
        return g;
      })
    );
    setAdjustGoalId(null);
    setAdjustAmount('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-white dark:bg-[#10182F] w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white flex items-center justify-center shadow-xs">
              <Target className="w-5 h-5 text-[#0A1128]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Metas & Teto Orçamentário
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Controle de limites por categoria e sonhos do casal • {selectedMonthLabel}
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

        {/* Tab Selector */}
        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50/60 dark:bg-slate-900/40">
          <button
            type="button"
            onClick={() => setActiveTab('budget')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'budget'
                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-teal-500" />
            <span>Teto por Categoria</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('goals')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'goals'
                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PiggyBank className="w-4 h-4 text-emerald-500" />
            <span>Metas do Casal ({goals.length})</span>
          </button>
        </div>

        {/* Tab 1: Category Budgets */}
        {activeTab === 'budget' && (
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
                      ⚠️ Orçamento total estourado em R$ {(totalSpentAcrossBudgets - totalBudget).toFixed(2).replace('.', ',')}
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
                            Estourou {percent}%
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
        )}

        {/* Tab 2: Savings Goals */}
        {activeTab === 'goals' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Sonhos & Reserva do Casal
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Acompanhe quanto o casal já guardou em conjunto
                </p>
              </div>

              {!isAddingGoal && (
                <button
                  type="button"
                  onClick={() => setIsAddingGoal(true)}
                  className="px-3 py-1.5 bg-[#00C49F] hover:bg-[#00b290] text-[#0A1128] font-bold text-xs rounded-xl flex items-center gap-1 active-press shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Nova Meta</span>
                </button>
              )}
            </div>

            {/* Add Goal Form */}
            {isAddingGoal && (
              <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-300 dark:border-teal-700/60 space-y-3 animate-fade-in">
                <div className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-teal-500" />
                  <span>Cadastrar Nova Meta de Economia</span>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                      Nome do Sonho / Meta *
                    </label>
                    <input
                      type="text"
                      value={newGoalName}
                      onChange={(e) => setNewGoalName(e.target.value)}
                      placeholder="Ex: Reforma da Cozinha, Viagem, Carro Novo"
                      className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                        Valor Alvo (R$) *
                      </label>
                      <input
                        type="text"
                        value={newGoalTarget}
                        onChange={(e) => setNewGoalTarget(e.target.value)}
                        placeholder="Ex: 10000"
                        className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                        Já Guardado (R$)
                      </label>
                      <input
                        type="text"
                        value={newGoalCurrent}
                        onChange={(e) => setNewGoalCurrent(e.target.value)}
                        placeholder="Ex: 2500"
                        className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingGoal(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAddGoal}
                    className="px-4 py-1.5 bg-[#00C49F] hover:bg-[#00b290] text-[#0A1128] font-bold text-xs rounded-xl flex items-center gap-1 active-press shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Salvar Meta</span>
                  </button>
                </div>
              </div>
            )}

            {/* Goals List */}
            <div className="space-y-3">
              {goals.map((g) => {
                const percent = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
                const isComplete = percent >= 100;
                const isAdjusting = adjustGoalId === g.id;

                return (
                  <div
                    key={g.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isComplete
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                        : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{g.icon || '🎯'}</span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {g.name}
                          </h4>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Meta: R$ {g.targetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-extrabold ${isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-teal-600 dark:text-teal-400'}`}>
                          {percent}%
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteGoal(g.id)}
                          className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"
                          title="Remover meta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isComplete ? 'bg-emerald-500' : 'bg-gradient-to-r from-teal-500 to-emerald-400'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs mt-2.5">
                      <span className="text-slate-600 dark:text-slate-400">
                        Guardado:{' '}
                        <strong className="text-slate-900 dark:text-white">
                          R$ {g.currentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </strong>
                      </span>

                      {!isAdjusting ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setAdjustGoalId(g.id);
                              setAdjustAmount('');
                            }}
                            className="px-2.5 py-1 bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold text-[11px] rounded-lg active-press"
                          >
                            + Guardar / Retirar
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={adjustAmount}
                            onChange={(e) => setAdjustAmount(e.target.value)}
                            placeholder="R$ valor"
                            className="w-20 text-[11px] font-bold px-2 py-1 rounded-lg border border-teal-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleAdjustGoalSavings(g.id, true)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg"
                            title="Adicionar valor guardado"
                          >
                            + Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustGoalSavings(g.id, false)}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg"
                            title="Retirar valor"
                          >
                            - Retirar
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdjustGoalId(null)}
                            className="text-[10px] text-slate-400 hover:text-slate-600"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
