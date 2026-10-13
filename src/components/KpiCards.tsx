import React from 'react';
import { Calendar, CheckCircle2, Trophy, Flame, TrendingUp, Sparkles, Target, ArrowRight, MessageCircle } from 'lucide-react';
import { Bill } from '../types/finance';

interface KpiCardsProps {
  bills: Bill[];
  totalRevenue?: number;
  onSelectFilter?: (status: string) => void;
  onShareWhatsApp?: () => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ bills, onSelectFilter, onShareWhatsApp }) => {
  // Strictly filter out any salary or migrated revenue items
  const validBills = bills.filter(b => {
    if (b.category === 'Salário & Renda') return false;
    const lower = (b.name || '').toLowerCase();
    if (lower.includes('salário') || lower.includes('salario')) return false;
    if (b.id && b.id.startsWith('bill-migrated-')) return false;
    if (b.notes && b.notes.includes('Transferido automaticamente para Dívidas')) return false;
    return true;
  });

  const totalAmount = validBills.reduce((acc, b) => acc + b.amount, 0);
  const totalCount = validBills.length;

  const paidBills = validBills.filter(b => b.status === 'paid');
  const paidAmount = paidBills.reduce((acc, b) => acc + b.amount, 0);
  const paidCount = paidBills.length;

  const pendingBills = validBills.filter(b => b.status !== 'paid');
  const pendingAmount = Math.max(0, totalAmount - paidAmount);
  const pendingCount = pendingBills.length;

  // Percentage of bills paid (count and amount)
  const paidCountPercentage = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;
  const paidAmountPercentage = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

  const formatCurrency = (val: number) => {
    return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Motivational message and tone depending on progress
  const getMotivationInfo = () => {
    if (totalCount === 0) {
      return {
        icon: Target,
        iconBg: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
        badgeBg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
        badgeText: '0% do mês',
        title: 'Nenhuma dívida cadastrada',
        message: 'Cadastre suas contas do mês para acompanhar o progresso de quitação!',
        isComplete: false,
      };
    }
    if (paidCount === totalCount) {
      return {
        icon: Trophy,
        iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400',
        badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700',
        badgeText: '🏆 100% Quitadas!',
        title: 'Todas as dívidas quitadas!',
        message: 'Parabéns pela disciplina! Você zerou 100% das suas contas deste mês.',
        isComplete: true,
      };
    }
    if (paidCountPercentage >= 75) {
      return {
        icon: Flame,
        iconBg: 'bg-orange-100 text-orange-600 dark:bg-orange-950/70 dark:text-orange-400',
        badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300',
        badgeText: `${paidCountPercentage}% Quitadas`,
        title: 'Reta final do mês!',
        message: `Falta apenas ${pendingCount} ${pendingCount === 1 ? 'conta' : 'contas'} (${formatCurrency(pendingAmount)}) para você zerar tudo!`,
        isComplete: false,
      };
    }
    if (paidCountPercentage >= 50) {
      return {
        icon: TrendingUp,
        iconBg: 'bg-teal-100 text-teal-700 dark:bg-teal-950/70 dark:text-teal-400',
        badgeBg: 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300',
        badgeText: `${paidCountPercentage}% Quitadas`,
        title: 'Mais da metade já foi paga!',
        message: `Excelente evolução! Você já quitou ${formatCurrency(paidAmount)} das suas despesas.`,
        isComplete: false,
      };
    }
    if (paidCountPercentage > 0) {
      return {
        icon: Sparkles,
        iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400',
        badgeBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
        badgeText: `${paidCountPercentage}% Quitadas`,
        title: 'Progresso em andamento',
        message: `Bom ritmo! Cada conta paga é menos preocupação no seu orçamento.`,
        isComplete: false,
      };
    }
    return {
      icon: Target,
      iconBg: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
      badgeBg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
      badgeText: `0% de ${totalCount} contas`,
      title: 'Aguardando quitação',
      message: 'Marque sua primeira conta como paga para ver a barra de progresso subir!',
      isComplete: false,
    };
  };

  const motivation = getMotivationInfo();
  const MotivationIcon = motivation.icon;

  return (
    <div className="px-4 py-2 space-y-2.5">
      {/* 1. TOP SUMMARY CARDS (Total do Mês & Já Pago) */}
      <div className="grid grid-cols-2 gap-3">
        {/* TOTAL DO MÊS */}
        <div 
          id="kpi-card-total-month"
          onClick={() => onSelectFilter?.('all')}
          className="bg-white dark:bg-[#131D38] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 premium-card flex flex-col justify-between cursor-pointer active-press hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10.5px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
              TOTAL DO MÊS
            </span>
            <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-[17px] font-extrabold text-slate-900 dark:text-white tracking-tight font-mono">
              <span className="text-xs font-sans font-bold text-slate-400 dark:text-slate-500 mr-0.5">R$</span>
              {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {paidBills.length > 0 && pendingBills.length > 0 ? (
                <span className="text-amber-600 dark:text-amber-400 font-bold">
                  Falta {formatCurrency(pendingAmount)}
                </span>
              ) : paidBills.length > 0 && pendingBills.length === 0 && totalCount > 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  100% quitadas! ✅
                </span>
              ) : (
                <span>{totalCount} {totalCount === 1 ? 'dívida deste mês' : 'dívidas deste mês'}</span>
              )}
            </div>
          </div>
        </div>

        {/* JÁ PAGO (%) */}
        <div 
          id="kpi-card-paid"
          onClick={() => onSelectFilter?.('paid')}
          className="bg-white dark:bg-[#131D38] border border-emerald-200/70 dark:border-emerald-900/40 rounded-2xl p-3.5 premium-card flex flex-col justify-between cursor-pointer active-press hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10.5px] font-bold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
              JÁ PAGO ({paidAmountPercentage}%)
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-[17px] font-extrabold text-emerald-700 dark:text-emerald-400 tracking-tight font-mono">
              <span className="text-xs font-sans font-bold text-emerald-500/70 mr-0.5">R$</span>
              {paidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {paidCount} de {totalCount} {totalCount === 1 ? 'paga' : 'pagas'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. VISUAL PROGRESS BAR & MOTIVATION CARD */}
      <div 
        id="kpi-card-progress"
        className={`bg-white dark:bg-[#131D38] border rounded-2xl p-3.5 premium-card transition-all ${
          motivation.isComplete 
            ? 'border-emerald-300 dark:border-emerald-800/80 bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/30 dark:from-[#0f242b]/40 dark:via-[#131D38] dark:to-[#131D38]' 
            : 'border-slate-200/80 dark:border-slate-800'
        }`}
      >
        {/* Header: Title, Counts and Percentage Badge */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${motivation.iconBg}`}>
              <MotivationIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                  Progresso de Quitação
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                {totalCount > 0 ? (
                  <>
                    <strong className="text-slate-700 dark:text-slate-200">{paidCount}</strong> de <strong className="text-slate-700 dark:text-slate-200">{totalCount}</strong> {totalCount === 1 ? 'conta quitada' : 'contas quitadas'}
                  </>
                ) : (
                  'Nenhuma conta cadastrada'
                )}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-1.5">
            <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full shadow-2xs ${motivation.badgeBg}`}>
              {motivation.badgeText}
            </span>
            {onShareWhatsApp && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onShareWhatsApp();
                }}
                title="Compartilhar retrospectiva e resumo no WhatsApp"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10.5px] border border-emerald-500/30 transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                <MessageCircle className="w-3 h-3 fill-emerald-500/30 text-emerald-600 dark:text-emerald-400" />
                <span>WhatsApp</span>
              </button>
            )}
          </div>
        </div>

        {/* The Visual Progress Bar */}
        <div className="relative my-2">
          <div 
            className="w-full bg-slate-100 dark:bg-slate-800/90 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60 relative"
            role="progressbar"
            aria-valuenow={paidCountPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progresso de quitação: ${paidCountPercentage}%`}
          >
            {/* Milestone Guide Lines (25%, 50%, 75%) */}
            <div className="absolute inset-0 flex justify-between px-[25%] pointer-events-none opacity-20 dark:opacity-30">
              <div className="w-[1px] h-full bg-slate-400 dark:bg-slate-300"></div>
              <div className="w-[1px] h-full bg-slate-400 dark:bg-slate-300"></div>
            </div>

            {/* Filled Progress Bar with smooth transition and shimmer sheen */}
            <div 
              className={`h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden ${
                motivation.isComplete
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-[#00C49F] shadow-sm shadow-emerald-500/40'
                  : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-[#00C49F]'
              }`}
              style={{ 
                width: `${totalCount === 0 ? 0 : Math.min(100, Math.max(paidCountPercentage, paidCount > 0 ? 5 : 0))}%` 
              }}
            >
              {/* Subtle animated shimmer sheen */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full h-full animate-shimmer pointer-events-none" />
              {/* Glossy top sheen reflection */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent rounded-full pointer-events-none" />
            </div>
          </div>

          {/* Quick markers under bar */}
          <div className="flex justify-between items-center text-[9.5px] font-bold text-slate-400 dark:text-slate-500 px-0.5 mt-1">
            <span>0%</span>
            <span className="hidden sm:inline">25%</span>
            <span>50%</span>
            <span className="hidden sm:inline">75%</span>
            <span className={motivation.isComplete ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : ''}>100%</span>
          </div>
        </div>

        {/* Motivational Message & Quick Action Links */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80 mt-1">
          <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
            <span className="font-semibold text-slate-900 dark:text-white mr-1">{motivation.title}:</span>
            <span>{motivation.message}</span>
          </div>

          {/* Quick Filter buttons to help user take action */}
          {totalCount > 0 && onSelectFilter && (
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center mt-0.5 sm:mt-0">
              {pendingCount > 0 ? (
                <button
                  type="button"
                  onClick={() => onSelectFilter('pending')}
                  className="text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:text-amber-800 hover:underline flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 transition-colors"
                >
                  <span>{pendingCount} {pendingCount === 1 ? 'pendente' : 'pendentes'}</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </button>
              ) : null}
              {paidCount > 0 && (
                <button
                  type="button"
                  onClick={() => onSelectFilter('paid')}
                  className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 hover:underline flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 transition-colors"
                >
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>{paidCount} {paidCount === 1 ? 'paga' : 'pagas'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
