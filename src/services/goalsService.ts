import { SavingsGoal, GoalContribution } from '../types/finance';
import { cloudkit } from './cloudkitSync';

const GOALS_V2_STORAGE_KEY = 'financas_couple_goals_v2';
const GOALS_V1_LEGACY_KEY = 'financas_savings_goals_v1';

export const DEFAULT_COUPLE_GOALS: SavingsGoal[] = [
  {
    id: 'goal-emergency-fund',
    name: 'Reserva de Emergência da Família (6 Meses)',
    category: 'reserva',
    targetAmount: 18000,
    currentAmount: 8500,
    monthlyTarget: 1000,
    targetDate: '2027-08-31',
    icon: '🛡️',
    color: '#00C49F',
    notes: 'Segurança financeira cobrindo os custos essenciais da nossa casa.',
    partnerSplit: {
      partner1Name: 'Carlos',
      partner1Amount: 4500,
      partner2Name: 'Paula',
      partner2Amount: 4000,
    },
    contributions: [
      {
        id: 'contrib-1',
        goalId: 'goal-emergency-fund',
        date: '2026-09-15',
        amount: 800,
        contributedBy: 'Carlos',
        note: 'Aporte mensal da sobra',
        sourceMonth: '2026-09',
        type: 'deposit',
      },
      {
        id: 'contrib-2',
        goalId: 'goal-emergency-fund',
        date: '2026-09-20',
        amount: 700,
        contributedBy: 'Paula',
        note: 'Sobra de comissão',
        sourceMonth: '2026-09',
        type: 'deposit',
      },
      {
        id: 'contrib-3',
        goalId: 'goal-emergency-fund',
        date: '2026-10-05',
        amount: 1000,
        contributedBy: 'Casal (Conta Conjunta)',
        note: 'Aporte conjunto automático da sobra do mês',
        sourceMonth: '2026-10',
        type: 'deposit',
      },
    ],
    isCompleted: false,
    createdAt: '2026-01-01',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'goal-vacation-trip',
    name: 'Viagem de Férias a Dois 🌴',
    category: 'viagem',
    targetAmount: 7500,
    currentAmount: 4200,
    monthlyTarget: 600,
    targetDate: '2027-04-15',
    icon: '✈️',
    color: '#3B82F6',
    notes: 'Passagens, hospedagem e passeios para as férias do casal no Nordeste.',
    partnerSplit: {
      partner1Name: 'Carlos',
      partner1Amount: 2200,
      partner2Name: 'Paula',
      partner2Amount: 2000,
    },
    contributions: [
      {
        id: 'contrib-trip-1',
        goalId: 'goal-vacation-trip',
        date: '2026-09-10',
        amount: 600,
        contributedBy: 'Casal (Conta Conjunta)',
        note: 'Aporte regular das férias',
        sourceMonth: '2026-09',
        type: 'deposit',
      },
      {
        id: 'contrib-trip-2',
        goalId: 'goal-vacation-trip',
        date: '2026-10-02',
        amount: 600,
        contributedBy: 'Paula',
        note: 'Aporte especial',
        sourceMonth: '2026-10',
        type: 'deposit',
      },
    ],
    isCompleted: false,
    createdAt: '2026-02-15',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'goal-home-renovation',
    name: 'Reforma e Decoração do Lar 🏡',
    category: 'bens',
    targetAmount: 9000,
    currentAmount: 3600,
    monthlyTarget: 500,
    targetDate: '2027-09-30',
    icon: '🛋️',
    color: '#8A2BE2',
    notes: 'Novos móveis para a sala e pintura geral do apartamento.',
    partnerSplit: {
      partner1Name: 'Carlos',
      partner1Amount: 1900,
      partner2Name: 'Paula',
      partner2Amount: 1700,
    },
    contributions: [
      {
        id: 'contrib-reno-1',
        goalId: 'goal-home-renovation',
        date: '2026-10-01',
        amount: 500,
        contributedBy: 'Carlos',
        note: 'Primeiro aporte da reforma',
        sourceMonth: '2026-10',
        type: 'deposit',
      },
    ],
    isCompleted: false,
    createdAt: '2026-03-01',
    updatedAt: new Date().toISOString(),
  },
];

type GoalsListener = (goals: SavingsGoal[]) => void;
const listeners = new Set<GoalsListener>();

function notifyAll(goals: SavingsGoal[]) {
  listeners.forEach((fn) => {
    try {
      fn(goals);
    } catch (e) {
      console.warn('Goals listener error:', e);
    }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('financas_goals_changed', { detail: goals }));
  }
}

export const goalsService = {
  getGoals(): SavingsGoal[] {
    if (typeof window === 'undefined') return DEFAULT_COUPLE_GOALS;
    try {
      const v2 = localStorage.getItem(GOALS_V2_STORAGE_KEY);
      if (v2) {
        const parsed = JSON.parse(v2);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }

      // Check legacy v1 and upgrade
      const v1 = localStorage.getItem(GOALS_V1_LEGACY_KEY);
      if (v1) {
        const parsedV1 = JSON.parse(v1);
        if (Array.isArray(parsedV1) && parsedV1.length > 0) {
          const upgraded: SavingsGoal[] = parsedV1.map((g: any) => ({
            id: g.id || `goal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: g.name || 'Nova Meta',
            category: 'outros',
            targetAmount: Number(g.targetAmount) || 1000,
            currentAmount: Number(g.currentAmount) || 0,
            targetDate: g.targetDate,
            monthlyTarget: Math.round((Number(g.targetAmount) || 1000) / 12),
            icon: g.icon || '🎯',
            color: '#00C49F',
            partnerSplit: {
              partner1Name: 'Carlos',
              partner1Amount: Math.round((Number(g.currentAmount) || 0) * 0.5),
              partner2Name: 'Paula',
              partner2Amount: Math.round((Number(g.currentAmount) || 0) * 0.5),
            },
            contributions: [],
            isCompleted: (Number(g.currentAmount) || 0) >= (Number(g.targetAmount) || 1000),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));
          this.saveAllGoals(upgraded);
          return upgraded;
        }
      }

      // Default initial goals
      this.saveAllGoals(DEFAULT_COUPLE_GOALS);
      return DEFAULT_COUPLE_GOALS;
    } catch {
      return DEFAULT_COUPLE_GOALS;
    }
  },

  saveAllGoals(goals: SavingsGoal[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(GOALS_V2_STORAGE_KEY, JSON.stringify(goals));
      localStorage.setItem(GOALS_V1_LEGACY_KEY, JSON.stringify(goals));
      notifyAll(goals);
    } catch (e) {
      console.warn('Failed to save goals in localStorage:', e);
    }
  },

  saveGoal(goal: SavingsGoal): SavingsGoal {
    const goals = this.getGoals();
    const idx = goals.findIndex((g) => g.id === goal.id);
    const nowIso = new Date().toISOString();
    const targetAmount = Math.max(0, Number(goal.targetAmount) || 0);
    const currentAmount = Math.max(0, Number(goal.currentAmount) || 0);
    const isCompleted = currentAmount >= targetAmount && targetAmount > 0;

    const updatedGoal: SavingsGoal = {
      ...goal,
      targetAmount,
      currentAmount,
      isCompleted,
      completedAt: isCompleted ? (goal.completedAt || nowIso) : undefined,
      updatedAt: nowIso,
      createdAt: goal.createdAt || nowIso,
    };

    let newGoals: SavingsGoal[];
    if (idx >= 0) {
      newGoals = [...goals];
      newGoals[idx] = updatedGoal;
    } else {
      newGoals = [updatedGoal, ...goals];
    }

    this.saveAllGoals(newGoals);

    // Notify spouse device
    try {
      const actor = cloudkit.getCurrentUserName() || 'Você';
      cloudkit.notifyRemoteChange(
        idx >= 0 ? 'goal_updated' : 'goal_created',
        idx >= 0 ? 'Meta Atualizada 🎯' : 'Novo Cofre Criado 💎',
        `${actor} ${idx >= 0 ? 'atualizou o cofre' : 'criou o cofre'} "${updatedGoal.name}" com meta de R$ ${updatedGoal.targetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        updatedGoal.name,
        updatedGoal.targetAmount
      );
    } catch {}

    return updatedGoal;
  },

  deleteGoal(id: string) {
    const goals = this.getGoals();
    const target = goals.find((g) => g.id === id);
    const newGoals = goals.filter((g) => g.id !== id);
    this.saveAllGoals(newGoals);

    if (target) {
      try {
        const actor = cloudkit.getCurrentUserName() || 'Você';
        cloudkit.notifyRemoteChange(
          'goal_deleted',
          'Cofre Removido 🗑️',
          `${actor} removeu o cofre "${target.name}"`,
          target.name,
          target.currentAmount
        );
      } catch {}
    }
  },

  addContribution(
    goalId: string,
    amount: number,
    contributedBy: string,
    note?: string,
    sourceMonth?: string
  ): SavingsGoal | null {
    if (amount <= 0) return null;
    const goals = this.getGoals();
    const idx = goals.findIndex((g) => g.id === goalId);
    if (idx < 0) return null;

    const goal = goals[idx];
    const nowIso = new Date().toISOString();
    const todayYmd = nowIso.substring(0, 10);

    const contribution: GoalContribution = {
      id: `contrib-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      goalId,
      date: todayYmd,
      amount,
      contributedBy,
      note: note?.trim() || undefined,
      sourceMonth: sourceMonth || todayYmd.substring(0, 7),
      type: 'deposit',
    };

    const newCurrentAmount = Math.max(0, (goal.currentAmount || 0) + amount);
    const isCompleted = newCurrentAmount >= goal.targetAmount && goal.targetAmount > 0;

    // Update partner split
    const split = { ...(goal.partnerSplit || {
      partner1Name: 'Carlos',
      partner1Amount: 0,
      partner2Name: 'Paula',
      partner2Amount: 0,
    }) };

    const lowerBy = (contributedBy || '').toLowerCase();
    if (lowerBy.includes('carlos')) {
      split.partner1Amount = (split.partner1Amount || 0) + amount;
    } else if (lowerBy.includes('paula')) {
      split.partner2Amount = (split.partner2Amount || 0) + amount;
    } else {
      // Joint / Casal / Sobra -> 50/50 split
      const half = amount / 2;
      split.partner1Amount = (split.partner1Amount || 0) + half;
      split.partner2Amount = (split.partner2Amount || 0) + half;
    }

    const updatedGoal: SavingsGoal = {
      ...goal,
      currentAmount: newCurrentAmount,
      isCompleted,
      completedAt: isCompleted ? (goal.completedAt || nowIso) : undefined,
      partnerSplit: split,
      contributions: [contribution, ...(goal.contributions || [])],
      updatedAt: nowIso,
    };

    const newGoals = [...goals];
    newGoals[idx] = updatedGoal;
    this.saveAllGoals(newGoals);

    // Notify spouse device
    try {
      const actor = cloudkit.getCurrentUserName() || 'Você';
      cloudkit.notifyRemoteChange(
        'goal_contributed',
        'Novo Aporte no Cofre! 💰',
        `${actor} aportou R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} no cofre "${goal.name}". Novo saldo: R$ ${newCurrentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        goal.name,
        amount
      );
    } catch {}

    return updatedGoal;
  },

  withdrawAmount(
    goalId: string,
    amount: number,
    withdrawnBy: string,
    note?: string
  ): SavingsGoal | null {
    if (amount <= 0) return null;
    const goals = this.getGoals();
    const idx = goals.findIndex((g) => g.id === goalId);
    if (idx < 0) return null;

    const goal = goals[idx];
    const nowIso = new Date().toISOString();
    const todayYmd = nowIso.substring(0, 10);

    const withdrawAmount = Math.min(amount, goal.currentAmount || 0);
    const newCurrentAmount = Math.max(0, (goal.currentAmount || 0) - withdrawAmount);

    const contribution: GoalContribution = {
      id: `withdraw-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      goalId,
      date: todayYmd,
      amount: withdrawAmount,
      contributedBy: withdrawnBy,
      note: note ? `Resgate: ${note}` : 'Resgate de valor',
      sourceMonth: todayYmd.substring(0, 7),
      type: 'withdrawal',
    };

    const updatedGoal: SavingsGoal = {
      ...goal,
      currentAmount: newCurrentAmount,
      isCompleted: newCurrentAmount >= goal.targetAmount && goal.targetAmount > 0,
      contributions: [contribution, ...(goal.contributions || [])],
      updatedAt: nowIso,
    };

    const newGoals = [...goals];
    newGoals[idx] = updatedGoal;
    this.saveAllGoals(newGoals);

    try {
      const actor = cloudkit.getCurrentUserName() || 'Você';
      cloudkit.notifyRemoteChange(
        'goal_withdrawn',
        'Resgate de Cofre 💸',
        `${actor} resgatou R$ ${withdrawAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} do cofre "${goal.name}". Saldo restante: R$ ${newCurrentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        goal.name,
        withdrawAmount
      );
    } catch {}

    return updatedGoal;
  },

  calculateEstimate(goal: SavingsGoal): {
    monthsRemaining: number;
    estimatedCompletionDate: string;
    isComplete: boolean;
    monthlyNeededToTargetDate?: number;
  } {
    const remaining = Math.max(0, (goal.targetAmount || 0) - (goal.currentAmount || 0));
    if (remaining <= 0) {
      return {
        monthsRemaining: 0,
        estimatedCompletionDate: 'Meta Concluída! 🎉',
        isComplete: true,
      };
    }

    // Monthly contribution pacing
    let pace = goal.monthlyTarget || 0;

    // If monthlyTarget is 0, estimate from past 3 months contributions
    if (pace <= 0 && goal.contributions && goal.contributions.length > 0) {
      const totalPastDeposits = goal.contributions
        .filter((c) => c.type !== 'withdrawal')
        .reduce((sum, c) => sum + c.amount, 0);
      pace = Math.max(100, Math.round(totalPastDeposits / Math.max(1, goal.contributions.length)));
    }

    if (pace <= 0) {
      pace = 500; // reasonable fallback
    }

    const monthsRemaining = Math.ceil(remaining / pace);

    // Calculate target date
    const d = new Date();
    d.setMonth(d.getMonth() + monthsRemaining);
    const monthName = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const formatted = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    // If user set an explicit targetDate, calculate monthly amount needed
    let monthlyNeededToTargetDate: number | undefined = undefined;
    if (goal.targetDate) {
      const targetD = new Date(goal.targetDate);
      const diffMs = targetD.getTime() - Date.now();
      const diffMonths = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.4)));
      monthlyNeededToTargetDate = Math.round(remaining / diffMonths);
    }

    return {
      monthsRemaining,
      estimatedCompletionDate: formatted,
      isComplete: false,
      monthlyNeededToTargetDate,
    };
  },

  subscribe(listener: GoalsListener) {
    listeners.add(listener);
    if (typeof window !== 'undefined') {
      const storageHandler = (e: StorageEvent) => {
        if (e.key === GOALS_V2_STORAGE_KEY) {
          listener(this.getGoals());
        }
      };
      const customHandler = (e: any) => {
        listener(e.detail || this.getGoals());
      };
      window.addEventListener('storage', storageHandler);
      window.addEventListener('financas_goals_changed', customHandler);
      return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', storageHandler);
        window.removeEventListener('financas_goals_changed', customHandler);
      };
    }
    return () => {
      listeners.delete(listener);
    };
  },
};
