import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, Copy, CheckCircle2 } from 'lucide-react';
import { Bill } from '../types/finance';

export interface MonthOption {
  id: string; // e.g., '2026-10'
  label: string; // 'Outubro de 2026'
  shortLabel: string; // 'Out 2026'
  isCurrent?: boolean;
}

export const INITIAL_SUBSEQUENT_MONTHS: MonthOption[] = [
  { id: '2026-09', label: 'Setembro de 2026', shortLabel: 'Set 2026' },
  { id: '2026-10', label: 'Outubro de 2026', shortLabel: 'Out 2026', isCurrent: true },
  { id: '2026-11', label: 'Novembro de 2026', shortLabel: 'Nov 2026' },
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
  onReplicateBillsToMonth: (targetMonthId: string) => void;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  selectedMonthId,
  onSelectMonth,
  bills,
  onReplicateBillsToMonth,
}) => {
  const [monthsList, setMonthsList] = useState<MonthOption[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('financas_custom_months_list');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // fallback
        }
      }
    }
    return INITIAL_SUBSEQUENT_MONTHS;
  });

  const currentIndex = monthsList.findIndex(m => m.id === selectedMonthId);
  const safeIndex = currentIndex >= 0 ? currentIndex : 1; // default to Outubro 2026 (index 1)
  const currentMonthOption = monthsList[safeIndex] || monthsList[0];

  const currentMonthBillsCount = bills.filter(b => b.dueDate.startsWith(selectedMonthId)).length;

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
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Navegação de Meses
              </span>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                {currentMonthOption.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              disabled={safeIndex === 0}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors active-press"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 px-1.5">
              {safeIndex + 1} de {monthsList.length}
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
              className="ml-1 px-2 py-1 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-700 dark:text-teal-300 text-[10.5px] font-extrabold rounded-lg border border-teal-200 dark:border-teal-800 flex items-center gap-1 active-press"
              title="Adicionar mais um mês subsequente ao calendário"
            >
              <Plus className="w-3 h-3" />
              <span>Criar Mês</span>
            </button>
          </div>
        </div>

        {/* Scrollable Month Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 pt-0.5">
          {monthsList.map((month) => {
            const isSelected = month.id === selectedMonthId;
            const count = bills.filter(b => b.dueDate.startsWith(month.id)).length;

            return (
              <button
                key={month.id}
                onClick={() => onSelectMonth(month)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active-press ${
                  isSelected
                    ? 'bg-[#0A1128] dark:bg-teal-500 text-white dark:text-[#0A1128] shadow-sm ring-2 ring-teal-500/30'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                }`}
              >
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

        {/* Action Prompt if current selected month has 0 bills */}
        {currentMonthBillsCount === 0 && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 bg-amber-50/60 dark:bg-amber-950/20 p-2.5 rounded-xl">
            <div className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
              💡 Nenhuma conta lançada para <b>{currentMonthOption.shortLabel}</b> ainda.
            </div>
            <button
              onClick={() => onReplicateBillsToMonth(selectedMonthId)}
              className="flex-shrink-0 px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-extrabold rounded-lg flex items-center gap-1 shadow-xs active-press"
              title="Copiar contas fixas do mês anterior para este mês"
            >
              <Copy className="w-3 h-3" />
              <span>Replicar Contas Fixas</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
