import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PiggyBank, Target, Plus, TrendingUp, Sparkles, 
  Check, Trash2, ArrowUpRight, ArrowDownRight, 
  ChevronDown, ChevronUp, ShieldCheck, Heart, 
  Wallet, DollarSign, Calendar, Clock
} from 'lucide-react';
import { Bill, Revenue, SavingsGoal } from '../types/finance';

const GOALS_STORAGE_KEY = 'financas_savings_goals_v1';

const INITIAL_DEFAULT_GOALS: SavingsGoal[] = [
  { id: 'goal-1', name: 'Reserva de Emergência do Casal', targetAmount: 15000, currentAmount: 6200, icon: '🛡️' },
  { id: 'goal-2', name: 'Viagem de Férias & Descanso', targetAmount: 5000, currentAmount: 2350, icon: '✈️' },
  { id: 'goal-3', name: 'Cofre de Manutenção da Casa', targetAmount: 3000, currentAmount: 1800, icon: '🏡' },
  { id: 'goal-4', name: 'Troca do Carro & Entrada', targetAmount: 20000, currentAmount: 8500, icon: '🚗' },
];

const parseSavedGoals = (raw: string | null | any): SavingsGoal[] => {
  if (!raw) return INITIAL_DEFAULT_GOALS;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed) && parsed.length > 0) {
      const sanitized = parsed
        .filter(g => g && typeof g === 'object')
        .map((g: any, idx: number) => ({
          id: String(g.id || `goal-${idx + 1}`),
          name: String(g.name || 'Nova Meta'),
          targetAmount: Math.max(0, Number(g.targetAmount) || 1000),
          currentAmount: Math.max(0, Number(g.currentAmount) || 0),
          icon: String(g.icon || '🎯'),
          targetDate: g.targetDate ? String(g.targetDate) : undefined,
        }));
      return sanitized.length > 0 ? sanitized : INITIAL_DEFAULT_GOALS;
    }
    return INITIAL_DEFAULT_GOALS;
  } catch {
    return INITIAL_DEFAULT_GOALS;
  }
};

const formatCurrency = (val: number | string | undefined | null): string => {
  const num = Number(val) || 0;
  return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface VaultsGoalsViewProps {
  bills?: Bill[];
  revenues?: Revenue[];
  selectedMonthLabel?: string;
  activeThemeColor?: string;
  onOpenBudgetsModal?: () => void;
}

export const VaultsGoalsView: React.FC<VaultsGoalsViewProps> = ({
  bills = [],
  revenues = [],
  selectedMonthLabel = 'Novembro de 2026',
  activeThemeColor,
  onOpenBudgetsModal,
}) => {
  const instanceId = useRef(`vault_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);

  const [goals, setGoals] = useState<SavingsGoal[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(GOALS_STORAGE_KEY) : null;
      return parseSavedGoals(saved);
    } catch {
      return INITIAL_DEFAULT_GOALS;
    }
  });

  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalCurrent, setNewGoalCurrent] = useState('');
  const [newGoalIcon, setNewGoalIcon] = useState('🎯');

  const [customAmountMap, setCustomAmountMap] = useState<Record<string, string>>({});
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);

  // Sync to localStorage and broadcast event safely (ignoring own dispatches)
  useEffect(() => {
    try {
      localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
      window.dispatchEvent(
        new CustomEvent('savings-goals-changed', {
          detail: { sender: instanceId.current, goals },
        })
      );
    } catch {}
  }, [goals]);

  // Listen to external updates (e.g. from BudgetGoalsModal)
  useEffect(() => {
    const handleExternalChange = (e: any) => {
      if (e?.detail?.sender === instanceId.current) return;
      const incoming = Array.isArray(e?.detail?.goals) 
        ? e.detail.goals 
        : (Array.isArray(e?.detail) ? e.detail : null);
      if (incoming) {
        const sanitized = parseSavedGoals(incoming);
        setGoals(prev => {
          if (JSON.stringify(prev) === JSON.stringify(sanitized)) return prev;
          return sanitized;
        });
      }
    };
    window.addEventListener('savings-goals-changed', handleExternalChange);
    return () => window.removeEventListener('savings-goals-changed', handleExternalChange);
  }, []);

  const safeBills = Array.isArray(bills) ? bills : [];
  const safeRevenues = Array.isArray(revenues) ? revenues : [];

  const totalSaved = goals.reduce((acc, g) => acc + (Number(g.currentAmount) || 0), 0);
  const totalTarget = goals.reduce((acc, g) => acc + (Number(g.targetAmount) || 0), 0);
  const overallPercentage = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

  // Monthly surplus
  const monthRevenuesTotal = safeRevenues.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  const monthBillsTotal = safeBills.reduce((acc, b) => acc + (Number(b.amount) || 0), 0);
  const monthSurplus = Math.max(0, monthRevenuesTotal - monthBillsTotal);

  const brandColor = activeThemeColor || 'var(--color-brand-primary, #00C49F)';

  const handleDeposit = (goalId: string, amount: number) => {
    if (amount <= 0) return;
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        const current = Number(g.currentAmount) || 0;
        return { ...g, currentAmount: current + amount };
      }
      return g;
    }));
  };

  const handleWithdraw = (goalId: string, amount: number) => {
    if (amount <= 0) return;
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        const current = Number(g.currentAmount) || 0;
        return { ...g, currentAmount: Math.max(0, current - amount) };
      }
      return g;
    }));
  };

  const handleApplyCustomAmount = (goalId: string, isDeposit: boolean) => {
    const raw = customAmountMap[goalId] || '';
    const val = parseFloat(raw.replace(',', '.'));
    if (isNaN(val) || val <= 0) return;

    if (isDeposit) {
      handleDeposit(goalId, val);
    } else {
      handleWithdraw(goalId, val);
    }
    setCustomAmountMap(prev => ({ ...prev, [goalId]: '' }));
  };

  const handleCreateGoal = () => {
    if (!newGoalName.trim()) return;
    const target = parseFloat(newGoalTarget.replace(',', '.')) || 1000;
    const current = parseFloat(newGoalCurrent.replace(',', '.')) || 0;

    const newGoal: SavingsGoal = {
      id: `goal_${Date.now()}`,
      name: newGoalName.trim(),
      targetAmount: target,
      currentAmount: current,
      icon: newGoalIcon || '🎯',
    };

    setGoals(prev => [...prev, newGoal]);
    setNewGoalName('');
    setNewGoalTarget('');
    setNewGoalCurrent('');
    setIsAddingGoal(false);
    setExpandedCardId(newGoal.id);
  };

  const handleDeleteGoal = (goalId: string) => {
    setGoals(prev => prev.filter(g => g.id !== goalId));
    setDeletingGoalId(null);
  };

  return (
    <div className="space-y-3 pb-8 px-3 sm:px-4 pt-1 sm:pt-2 max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto">
      
      {/* Top Overview Banner with Animated Global Progress */}
      <motion.div 
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="bg-gradient-to-br from-slate-900 via-[#0C1B2A] to-[#08131E] text-white p-4 sm:p-5 rounded-3xl border border-slate-700/80 shadow-xl relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5 relative z-10">
          <div className="flex items-center gap-3">
            <div 
              className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0"
              style={{ backgroundColor: brandColor, color: '#0A1128' }}
            >
              <PiggyBank className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Cofres & Metas do Casal
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-teal-300 font-extrabold border border-teal-500/30">
                  {goals.length} Cofres
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Economias conjuntas & reservas do lar • {selectedMonthLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenBudgetsModal && (
              <button
                type="button"
                onClick={onOpenBudgetsModal}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
              >
                Teto por Categoria
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsAddingGoal(!isAddingGoal)}
              className="px-3.5 py-1.5 font-black text-xs rounded-xl flex items-center gap-1.5 active:scale-95 transition-all shadow-md cursor-pointer"
              style={{ backgroundColor: brandColor, color: '#0A1128' }}
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Novo Cofre</span>
            </button>
          </div>
        </div>

        {/* Financial Aggregates */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3 border-t border-slate-800/80 relative z-10">
          <div className="bg-slate-800/60 p-2.5 rounded-2xl border border-slate-700/50">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Guardado</div>
            <div className="text-sm sm:text-base font-extrabold text-white mt-0.5" style={{ color: brandColor }}>
              {formatCurrency(totalSaved)}
            </div>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-2xl border border-slate-700/50">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Meta Total</div>
            <div className="text-sm sm:text-base font-extrabold text-slate-200 mt-0.5">
              {formatCurrency(totalTarget)}
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-slate-800/60 p-2.5 rounded-2xl border border-slate-700/50 flex items-center justify-between sm:flex-col sm:items-start">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Conquista do Casal</div>
            <div className="text-sm sm:text-base font-extrabold text-emerald-400 flex items-center gap-1 mt-0.5">
              <span>{overallPercentage}%</span>
              <span className="text-[10px] text-slate-400 font-normal">alcançado</span>
            </div>
          </div>
        </div>

        {/* Global Progress Bar with Shimmer */}
        <div className="mt-3 relative z-10">
          <div className="w-full h-2.5 bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${overallPercentage}%` }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
              className="h-full rounded-full relative overflow-hidden"
              style={{ backgroundColor: brandColor }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </motion.div>
          </div>
        </div>

        {/* Quick hint for month surplus */}
        {monthSurplus > 0 && (
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-emerald-300/90 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
            <span className="flex items-center gap-1.5 font-medium">
              <span>💰</span>
              <span>Sobra prevista no mês: <strong>{formatCurrency(monthSurplus)}</strong></span>
            </span>
            <span className="text-[10px] text-emerald-400 font-bold">Pronto para aportar!</span>
          </div>
        )}
      </motion.div>

      {/* Add New Goal Inline Form */}
      <AnimatePresence>
        {isAddingGoal && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg space-y-3 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Criar Novo Cofre / Meta de Economia</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingGoal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Cancelar
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Nome do Cofre ou Sonho *
                </label>
                <div className="flex gap-2">
                  <select
                    value={newGoalIcon}
                    onChange={(e) => setNewGoalIcon(e.target.value)}
                    className="text-lg px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer"
                  >
                    <option value="🛡️">🛡️ Reserva</option>
                    <option value="✈️">✈️ Viagem</option>
                    <option value="🏡">🏡 Casa</option>
                    <option value="🚗">🚗 Carro</option>
                    <option value="💍">💍 Casamento</option>
                    <option value="👶">👶 Filhos</option>
                    <option value="🎓">🎓 Estudos</option>
                    <option value="🎯">🎯 Sonho</option>
                  </select>
                  <input
                    type="text"
                    value={newGoalName}
                    onChange={(e) => setNewGoalName(e.target.value)}
                    placeholder="Ex: Reforma da Sala, Férias no Nordeste..."
                    className="flex-1 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Meta Alvo (R$) *
                  </label>
                  <input
                    type="text"
                    value={newGoalTarget}
                    onChange={(e) => setNewGoalTarget(e.target.value)}
                    placeholder="Ex: 5000"
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Valor Inicial (R$)
                  </label>
                  <input
                    type="text"
                    value={newGoalCurrent}
                    onChange={(e) => setNewGoalCurrent(e.target.value)}
                    placeholder="Ex: 500"
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleCreateGoal}
                className="px-4 py-2 font-bold text-xs rounded-xl flex items-center gap-1.5 active:scale-95 transition-all shadow-md cursor-pointer"
                style={{ backgroundColor: brandColor, color: '#0A1128' }}
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Salvar Cofre</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List of Animated Cofres & Metas Cards with Framer Motion entry animations */}
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.08,
              delayChildren: 0.05,
            },
          },
        }}
        className="space-y-3"
      >
        {goals.map((goal, index) => {
          const targetNum = Number(goal.targetAmount) || 0;
          const currentNum = Number(goal.currentAmount) || 0;
          const percent = targetNum > 0 ? Math.min(100, Math.round((currentNum / targetNum) * 100)) : 0;
          const remaining = Math.max(0, targetNum - currentNum);
          const isComplete = percent >= 100;
          const isExpanded = expandedCardId === goal.id;
          const customVal = customAmountMap[goal.id] || '';

          return (
            <motion.div
              key={goal.id}
              layout
              variants={{
                hidden: { 
                  opacity: 0, 
                  y: 28, 
                  scale: 0.94,
                },
                visible: { 
                  opacity: 1, 
                  y: 0, 
                  scale: 1,
                  transition: {
                    type: 'spring',
                    damping: 22,
                    stiffness: 260,
                  },
                },
              }}
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              className={`rounded-3xl border transition-all duration-200 overflow-hidden shadow-xs ${
                isComplete
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60'
                  : 'bg-white dark:bg-[#111C34] border-slate-200/90 dark:border-slate-800'
              }`}
            >
              {/* Card Main Header Bar (Clickable to toggle details) */}
              <div 
                className="p-4 sm:p-4.5 cursor-pointer"
                onClick={() => setExpandedCardId(isExpanded ? null : goal.id)}
              >
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-3xl sm:text-3xl flex-shrink-0 filter drop-shadow-xs">
                      {goal.icon || '🎯'}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {goal.name}
                        </h3>
                        {isComplete && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500 text-white shrink-0 shadow-2xs">
                            Meta Atingida! 🎉
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>Meta: <strong>{formatCurrency(targetNum)}</strong></span>
                        <span>•</span>
                        <span>Faltam: <strong>{formatCurrency(remaining)}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Animated Progress Percentage Badge */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <motion.div 
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: [0.6, 1.1, 1], opacity: 1 }}
                      transition={{ 
                        delay: 0.18 + index * 0.08, 
                        type: 'spring', 
                        stiffness: 300, 
                        damping: 18 
                      }}
                      className={`px-3 py-1 rounded-2xl text-xs font-black flex items-center gap-1 shadow-2xs ${
                        isComplete
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span style={!isComplete ? { color: brandColor } : undefined}>
                        {percent}%
                      </span>
                    </motion.div>

                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Smooth Animated Progress Bar */}
                <div className="mt-2">
                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ 
                        duration: 0.95, 
                        ease: [0.16, 1, 0.3, 1], 
                        delay: 0.15 + index * 0.08 
                      }}
                      className={`h-full rounded-full relative overflow-hidden transition-colors ${
                        isComplete ? 'bg-emerald-500' : 'bg-brand'
                      }`}
                      style={!isComplete ? { backgroundColor: brandColor } : undefined}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer" />
                    </motion.div>
                  </div>
                </div>

                {/* Current Saved Display */}
                <div className="mt-2.5 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    Guardado até agora:
                  </span>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {formatCurrency(currentNum)}
                  </span>
                </div>
              </div>

              {/* Smoothly Expanding Drawer for Quick Deposits & Management */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
                    className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40 p-4 space-y-3.5"
                  >
                    {/* Quick Contribution Buttons */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                        <span>Aportes Rápidos</span>
                        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">1 clique</span>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                        {[50, 100, 200, 500].map(amt => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => handleDeposit(goal.id, amt)}
                            className="py-2 px-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-extrabold text-xs active:scale-95 transition-all text-center shadow-2xs cursor-pointer"
                          >
                            + R${amt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Amount Form */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                        <input
                          type="text"
                          value={customVal}
                          onChange={(e) => setCustomAmountMap(prev => ({ ...prev, [goal.id]: e.target.value }))}
                          placeholder="Outro valor..."
                          className="w-full pl-8 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleApplyCustomAmount(goal.id, true)}
                        className="px-3.5 py-2 font-bold text-xs rounded-xl flex items-center gap-1 active:scale-95 transition-all shadow-xs cursor-pointer"
                        style={{ backgroundColor: brandColor, color: '#0A1128' }}
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>Aportar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyCustomAmount(goal.id, false)}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                        title="Resgatar valor deste cofre"
                      >
                        <ArrowDownRight className="w-3.5 h-3.5" />
                        <span>Retirar</span>
                      </button>
                    </div>

                    {/* Couple Split Projection & Footer Actions */}
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                        <span>Divisão sugerida: <strong>50% Carlos • 50% Paula</strong></span>
                      </div>

                      {deletingGoalId === goal.id ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-rose-500 font-bold">Apagar?</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="font-black text-rose-600 dark:text-rose-400 underline"
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingGoalId(null)}
                            className="text-slate-400"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeletingGoalId(goal.id)}
                          className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Excluir Cofre</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>

    </div>
  );
};
