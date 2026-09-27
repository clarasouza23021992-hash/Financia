import React from 'react';
import { Calendar, CheckCircle2 } from 'lucide-react';
import { Bill } from '../types/finance';

interface KpiCardsProps {
  bills: Bill[];
  totalRevenue?: number;
  onSelectFilter?: (status: string) => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ bills, onSelectFilter }) => {
  const totalAmount = bills.reduce((acc, b) => acc + b.amount, 0);
  const totalCount = bills.length;

  const paidBills = bills.filter(b => b.status === 'paid');
  const paidAmount = paidBills.reduce((acc, b) => acc + b.amount, 0);
  const paidPercentage = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

  const formatCurrency = (val: number) => {
    return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="grid grid-cols-2 gap-3 px-4 py-2">
      {/* 1. TOTAL DO MÊS */}
      <div 
        id="kpi-card-total-month"
        onClick={() => onSelectFilter?.('all')}
        className="bg-white dark:bg-[#131D38] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between cursor-pointer active-press hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
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
          <div className="text-[17px] font-extrabold text-slate-900 dark:text-white tracking-tight">
            {formatCurrency(totalAmount)}
          </div>
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
            {totalCount} {totalCount === 1 ? 'dívida deste mês' : 'dívidas deste mês'}
          </div>
        </div>
      </div>

      {/* 2. JÁ PAGO (%) */}
      <div 
        id="kpi-card-paid"
        onClick={() => onSelectFilter?.('paid')}
        className="bg-white dark:bg-[#131D38] border border-emerald-200/70 dark:border-emerald-900/40 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between cursor-pointer active-press hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10.5px] font-bold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
            JÁ PAGO ({paidPercentage}%)
          </span>
          <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <div className="text-[17px] font-extrabold text-emerald-700 dark:text-emerald-400 tracking-tight">
            {formatCurrency(paidAmount)}
          </div>
          {/* Visual progress bar matching screenshot */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-[#00C49F] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(paidPercentage, 3)}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};
