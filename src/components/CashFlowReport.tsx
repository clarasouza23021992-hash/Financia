import React, { useState } from 'react';
import { 
  FileDown, Table, TrendingUp, TrendingDown, Wallet, 
  ArrowUpRight, ArrowDownRight, PieChart, Plus, Trash2, Calendar
} from 'lucide-react';
import { Bill, Revenue } from '../types/finance';
import { exportFinancialPDF, exportFinancialCSV } from '../services/pdfExporter';

interface CashFlowReportProps {
  bills: Bill[];
  revenues: Revenue[];
  selectedMonth?: string;
  onOpenNewRevenue: () => void;
  onDeleteRevenue: (id: string) => void;
}

export const CashFlowReport: React.FC<CashFlowReportProps> = ({
  bills,
  revenues,
  selectedMonth = 'Outubro de 2026',
  onOpenNewRevenue,
  onDeleteRevenue,
}) => {
  const totalRevenues = revenues.reduce((acc, r) => acc + r.amount, 0);
  const totalBills = bills.reduce((acc, b) => acc + b.amount, 0);
  const totalPaid = bills.filter(b => b.status === 'paid').reduce((acc, b) => acc + b.amount, 0);
  const totalPending = bills.filter(b => b.status === 'pending').reduce((acc, b) => acc + b.amount, 0);
  const totalOverdue = bills.filter(b => b.status === 'overdue').reduce((acc, b) => acc + b.amount, 0);
  const netBalance = totalRevenues - totalBills;

  // Category breakdown for bills
  const categoryTotals: Record<string, number> = {};
  bills.forEach(b => {
    categoryTotals[b.category] = (categoryTotals[b.category] || 0) + b.amount;
  });

  const categoryEntries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4 pb-20 px-4 pt-3">
      {/* Report Header & Export Actions */}
      <div className="bg-white dark:bg-[#131D38] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              Relatório de Fluxo de Caixa Mensal
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Análise financeira consolidada • {selectedMonth}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportFinancialPDF(bills, revenues, selectedMonth)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold active-press shadow-xs"
            >
              <FileDown className="w-4 h-4 text-teal-400" />
              <span>Exportar PDF</span>
            </button>
            <button
              onClick={() => exportFinancialCSV(bills, revenues)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold active-press"
            >
              <Table className="w-4 h-4 text-emerald-600" />
              <span>Planilha CSV</span>
            </button>
          </div>
        </div>

        {/* 3 Main Highlights */}
        <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200/80 dark:border-emerald-900/40">
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
              <ArrowUpRight className="w-3 h-3" />
              <span>Receitas</span>
            </div>
            <div className="text-sm font-extrabold text-emerald-800 dark:text-emerald-300 mt-0.5">
              R$ {totalRevenues.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-rose-50/70 dark:bg-rose-950/30 p-2.5 rounded-xl border border-rose-200/80 dark:border-rose-900/40">
            <div className="flex items-center gap-1 text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase">
              <ArrowDownRight className="w-3 h-3" />
              <span>Dívidas</span>
            </div>
            <div className="text-sm font-extrabold text-rose-800 dark:text-rose-300 mt-0.5">
              R$ {totalBills.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className={`p-2.5 rounded-xl border ${
            netBalance >= 0 
              ? 'bg-teal-50/70 dark:bg-teal-950/30 border-teal-200/80 dark:border-teal-900/40' 
              : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-900/40'
          }`}>
            <div className="flex items-center gap-1 text-[10px] font-bold text-teal-700 dark:text-teal-400 uppercase">
              <Wallet className="w-3 h-3" />
              <span>Saldo Livre</span>
            </div>
            <div className={`text-sm font-extrabold mt-0.5 ${
              netBalance >= 0 ? 'text-teal-900 dark:text-teal-200' : 'text-amber-800 dark:text-amber-300'
            }`}>
              R$ {netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown by Category */}
      <div className="bg-white dark:bg-[#131D38] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <PieChart className="w-4 h-4 text-teal-600" />
          Gastos por Categoria
        </h3>
        <div className="space-y-3">
          {categoryEntries.map(([cat, amt]) => {
            const pct = totalBills > 0 ? Math.round((amt / totalBills) * 100) : 0;
            return (
              <div key={cat}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate pr-2">
                    {cat}
                  </span>
                  <div className="text-right flex-shrink-0 font-medium text-slate-600 dark:text-slate-400">
                    <span className="font-bold text-slate-900 dark:text-white mr-1.5">
                      R$ {amt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10.5px] font-mono text-slate-400">({pct}%)</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-teal-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Revenues List */}
      <div className="bg-white dark:bg-[#131D38] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Receitas & Entradas Cadastradas ({revenues.length})
          </h3>
          <button
            onClick={onOpenNewRevenue}
            className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar Entrada
          </button>
        </div>

        <div className="space-y-2">
          {revenues.map((rev) => (
            <div 
              key={rev.id}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800"
            >
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {rev.name}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                  <span>📅 {rev.date.split('-').reverse().join('/')}</span>
                  <span>•</span>
                  <span>👤 {rev.profileName}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                  + R$ {rev.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <button
                  onClick={() => onDeleteRevenue(rev.id)}
                  className="text-slate-400 hover:text-rose-600 p-1"
                  title="Excluir Receita"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
