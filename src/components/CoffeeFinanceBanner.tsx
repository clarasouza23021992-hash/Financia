import React, { useMemo } from 'react';
import { Coffee, Flame, CheckCircle2, ChevronRight, Sparkles, Heart } from 'lucide-react';
import { Bill, Revenue } from '../types/finance';
import { isMockRevenue } from '../services/cloudkitSync';
import { COFFEE_ROUTINES_KEY } from './CoffeeFinanceModal';

interface CoffeeFinanceBannerProps {
  bills: Bill[];
  revenues: Revenue[];
  onOpenCoffeeModal: () => void;
  userProfileName?: string;
  spouseProfileName?: string;
}

const formatBRL = (val: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

export const CoffeeFinanceBanner: React.FC<CoffeeFinanceBannerProps> = ({
  bills,
  revenues,
  onOpenCoffeeModal,
  userProfileName = 'Carlos',
  spouseProfileName = 'Paula',
}) => {
  // Check if completed this week
  const pastRoutines = useMemo(() => {
    try {
      const saved = localStorage.getItem(COFFEE_ROUTINES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }, []);

  const latestRoutine = pastRoutines[0] || null;
  const streak = latestRoutine?.streakCount || pastRoutines.length;

  // Check if latest completion was within last 6 days
  const isDoneThisWeek = useMemo(() => {
    if (!latestRoutine?.completedAt) return false;
    const diffDays = (Date.now() - new Date(latestRoutine.completedAt).getTime()) / (1000 * 60 * 60 * 24);
    return diffDays < 6;
  }, [latestRoutine]);

  // Upcoming bills next 7 days
  const upcomingBills = useMemo(() => {
    const today = new Date();
    const in7 = new Date();
    in7.setDate(today.getDate() + 7);
    const in7ISO = in7.toISOString().split('T')[0];

    return bills.filter(b => {
      if (b.status === 'paid') return false;
      if (b.category === 'Salário & Renda') return false;
      const lower = (b.name || '').toLowerCase();
      if (lower.includes('salário') || lower.includes('salario')) return false;
      return b.dueDate <= in7ISO;
    });
  }, [bills]);

  const upcomingTotal = upcomingBills.reduce((acc, b) => acc + (b.amount || 0), 0);

  // Projected Surplus
  const projectedSurplus = useMemo(() => {
    const realRevs = revenues.filter(r => !isMockRevenue(r));
    const totalRev = realRevs.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

    const validDebts = bills.filter(b => {
      if (b.category === 'Salário & Renda') return false;
      const lower = (b.name || '').toLowerCase();
      if (lower.includes('salário') || lower.includes('salario')) return false;
      if (b.id && b.id.startsWith('bill-migrated-')) return false;
      return true;
    });

    const totalDebts = validDebts.reduce((acc, b) => acc + (b.amount || 0), 0);
    return totalRev - totalDebts;
  }, [bills, revenues]);

  if (isDoneThisWeek) {
    return (
      <div className="mx-3 sm:mx-4 my-2 p-3 bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 dark:from-amber-950/20 dark:via-emerald-950/20 dark:to-teal-950/20 border border-amber-300/40 dark:border-amber-700/40 rounded-2xl flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <Coffee className="w-4 h-4 fill-current" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Café com Finanças Feito!
              </span>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-extrabold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" />
                <span>Esta semana</span>
              </span>
              {streak > 0 && (
                <span className="text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-extrabold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                  <Flame className="w-3 h-3 fill-amber-500 text-amber-500" />
                  <span>{streak} sem</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {userProfileName} & {spouseProfileName} estão 100% alinhados.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenCoffeeModal}
          className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-all flex-shrink-0"
        >
          <span>Ver Resumo</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mx-3 sm:mx-4 my-2 p-3 sm:p-3.5 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-transparent border border-amber-300/60 dark:border-amber-700/50 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/20">
          <Coffee className="w-5 h-5 fill-current" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1">
              <span>Café com Finanças</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950">
                2 min
              </span>
            </span>
            {streak > 0 && (
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-0.5">
                <Flame className="w-3 h-3 fill-amber-500 text-amber-500" />
                <span>{streak} sem</span>
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2 mt-0.5 truncate">
            <span>
              {upcomingBills.length > 0 
                ? `${upcomingBills.length} ${upcomingBills.length === 1 ? 'conta' : 'contas'} na semana (${formatBRL(upcomingTotal)})`
                : 'Zero contas na semana 🎉'}
            </span>
            <span className="text-slate-400">•</span>
            <span className={projectedSurplus >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}>
              {projectedSurplus >= 0 ? 'Sobra:' : 'Falta:'} {projectedSurplus >= 0 ? '+' : '−'}{formatBRL(Math.abs(projectedSurplus))}
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenCoffeeModal}
        className="px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-sm shadow-amber-500/25 active:scale-95 transition-all flex-shrink-0 cursor-pointer"
      >
        <span>Abrir ☕</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
