import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, CheckCircle2, Clock } from 'lucide-react';
import { Bill, getBillEffectiveMonth } from '../types/finance';

export interface MonthOption {
  id: string; // e.g., '2026-11'
  label: string; // 'Novembro de 2026'
  shortLabel: string; // 'Nov 2026'
  isCurrent?: boolean;
}

export const INITIAL_SUBSEQUENT_MONTHS: MonthOption[] = [
  { id: '2026-09', label: 'Setembro de 2026', shortLabel: 'Set 2026' },
  { id: '2026-10', label: 'Outubro de 2026', shortLabel: 'Out 2026' },
  { id: '2026-11', label: 'Novembro de 2026', shortLabel: 'Nov 2026', isCurrent: true },
  { id: '2026-12', label: 'Dezembro de 2026', shortLabel: 'Dez 2026' },
  { id: '2027-01', label: 'Janeiro de 2027', shortLabel: 'Jan 2027' },
  { id: '2027-02', label: 'Fevereiro de 2027', shortLabel: 'Fev 2027' },
  { id: '2027-03', label: 'Março de 2027', shortLabel: 'Mar 2027' },
  { id: '2027-04', label: 'Abril de 2027', shortLabel: 'Abr 2027' },
  { id: '2027-05', label: 'Maio de 2027', shortLabel: 'Mai 2027' },
  { id: '2027-06', label: 'Junho de 2027', shortLabel: 'Jun 2027' },
  { id: '2027-07', label: 'Julho de 2027', shortLabel: 'Jul 2027' },
  { id: '2027-08', label: 'Agosto de 2027', shortLabel: 'Ago 2027' },
  { id: '2027-09', label: 'Setembro de 2027', shortLabel: 'Set 2027' },
  { id: '2027-10', label: 'Outubro de 2027', shortLabel: 'Out 2027' },
  { id: '2027-11', label: 'Novembro de 2027', shortLabel: 'Nov 2027' },
  { id: '2027-12', label: 'Dezembro de 2027', shortLabel: 'Dez 2027' },
];

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const MONTH_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

interface MonthSelectorProps {
  selectedMonthId: string;
  onSelectMonth: (month: MonthOption) => void;
  bills: Bill[];
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  selectedMonthId,
  onSelectMonth,
  bills,
}) => {
  const [monthsList, setMonthsList] = useState<MonthOption[]>(() => {
    let list = INITIAL_SUBSEQUENT_MONTHS;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('financas_custom_months_list');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            list = parsed;
          }
        } catch {
          // fallback
        }
      }
    }
    // Always mark Novembro de 2026 as isCurrent: true
    return list.map(m => ({
      ...m,
      isCurrent: m.id === '2026-11',
    }));
  });

  const currentIndex = monthsList.findIndex(m => m.id === selectedMonthId);
  const novIndex = monthsList.findIndex(m => m.id === '2026-11');
  const safeIndex = currentIndex >= 0 ? currentIndex : (novIndex >= 0 ? novIndex : 2); // default to Novembro 2026
  const currentMonthOption = monthsList[safeIndex] || monthsList[0];
  const currentCalendarMonth = monthsList.find(m => m.id === '2026-11') || monthsList[2];
  const isViewingCurrentMonth = selectedMonthId === '2026-11';

  const currentMonthBillsCount = bills.filter(b => getBillEffectiveMonth(b) === selectedMonthId).length;

  const handlePrev = () => {
    if (safeIndex > 0) {
      onSelectMonth(monthsList[safeIndex - 1]);
    }
  };

  const handleNext = () => {
    if (safeIndex < monthsList.length - 1) {
      onSelectMonth(monthsList[safeIndex + 1]);
    } else {
      // Auto-create next month if reaching the end
      handleCreateNextMonth();
    }
  };

  const handleCreateNextMonth = () => {
    const last = monthsList[monthsList.length - 1];
    const [yearStr, monthStr] = last.id.split('-');
    let year = parseInt(yearStr, 10);
    let monthNum = parseInt(monthStr, 10); // 1-12

    monthNum += 1;
    if (monthNum > 12) {
      monthNum = 1;
      year += 1;
    }

    const newId = `${year}-${String(monthNum).padStart(2, '0')}`;
    const newOption: MonthOption = {
      id: newId,
      label: `${MONTH_NAMES[monthNum - 1]} de ${year}`,
      shortLabel: `${MONTH_SHORT[monthNum - 1]} ${year}`,
    };

    const updated = [...monthsList, newOption];
    setMonthsList(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('financas_custom_months_list', JSON.stringify(updated));
    }
    onSelectMonth(newOption);
  };

  return (
    <div className="px-4 py-2">
      <div className="bg-white dark:bg-[#131D38] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Header navigation bar */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold flex-shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                  Navegação de Meses
                </span>
                {isViewingCurrentMonth ? (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Mês Atual</span>
                  </span>
                ) : (
                  <button
                    onClick={() => onSelectMonth(currentCalendarMonth)}
                    className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition-colors flex items-center gap-1 active-press"
                    title="Ir para o mês atual (Novembro)"
                  >
                    <Clock className="w-2.5 h-2.5" />
                    <span>Ir p/ Mês Atual</span>
                  </button>
                )}
              </div>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate block">
                {currentMonthOption.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
            <button
              onClick={handlePrev}
              disabled={safeIndex === 0}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors active-press"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 px-1">
              {safeIndex + 1}/{monthsList.length}
            </span>
            <button
              onClick={handleNext}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active-press"
              title="Próximo mês subsequente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleCreateNextMonth}
              className="ml-0.5 sm:ml-1 px-2 py-1 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-700 dark:text-teal-300 text-[10.5px] font-extrabold rounded-lg border border-teal-200 dark:border-teal-800 flex items-center gap-1 active-press"
              title="Adicionar mais um mês subsequente ao calendário"
            >
              <Plus className="w-3 h-3" />
              <span className="hidden sm:inline">Criar Mês</span>
              <span className="sm:hidden">+ Mês</span>
            </button>
          </div>
        </div>

        {/* Scrollable Month Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 pt-0.5">
          {monthsList.map((month) => {
            const isSelected = month.id === selectedMonthId;
            const isMonthCurrent = month.id === '2026-11';
            const count = bills.filter(b => b && b.category !== 'Salário & Renda' && getBillEffectiveMonth(b) === month.id).length;

            return (
              <button
                key={month.id}
                onClick={() => onSelectMonth(month)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active-press relative ${
                  isSelected
                    ? 'bg-[#0A1128] dark:bg-teal-500 text-white dark:text-[#0A1128] shadow-sm ring-2 ring-teal-500/30'
                    : isMonthCurrent
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/80 hover:bg-emerald-100'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                }`}
              >
                {isMonthCurrent && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" title="Mês Atual do Calendário" />
                )}
                <span>{month.shortLabel}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    isSelected
                      ? 'bg-white/20 text-white dark:bg-[#0A1128]/30 dark:text-[#0A1128]'
                      : count > 0
                      ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                  }`}
                >
                  {count} {count === 1 ? 'conta' : 'contas'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
