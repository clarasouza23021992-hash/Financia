import React, { useState } from 'react';
import { 
  FileDown, Table, TrendingUp, TrendingDown, Wallet, 
  ArrowUpRight, ArrowDownRight, PieChart, Plus, Trash2, Calendar,
  CheckCircle2, Clock, AlertCircle, Receipt, Edit3, Target
} from 'lucide-react';
import { Bill, Revenue } from '../types/finance';
import { exportFinancialPDF, exportFinancialCSV } from '../services/pdfExporter';
import { getCategoryInfo } from '../utils/categories';

interface CashFlowReportProps {
  bills: Bill[];
  revenues: Revenue[];
  selectedMonth?: string;
  onOpenNewRevenue: () => void;
  onEditRevenue?: (revenue: Revenue) => void;
  onDeleteRevenue: (revenue: Revenue) => void;
  onOpenBudgets?: () => void;
}

export const CashFlowReport: React.FC<CashFlowReportProps> = ({
  bills,
  revenues,
  selectedMonth = 'Outubro de 2026',
  onOpenNewRevenue,
  onEditRevenue,
  onDeleteRevenue,
  onOpenBudgets,
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
    <div className="space-y-2.5 pb-2 px-3 sm:px-4 pt-1 sm:pt-2">
      {/* Report Header & Export Actions */}
      <div className="bg-white dark:bg-[#131D38] p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              Relatório de Fluxo de Caixa Mensal
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Análise financeira consolidada • {selectedMonth}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenBudgets && (
              <button
                type="button"
                onClick={onOpenBudgets}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-teal-500/15 to-emerald-500/20 hover:from-teal-500/25 hover:to-emerald-500/30 text-teal-800 dark:text-[#00E5B5] border border-teal-500/30 rounded-xl text-xs font-bold active-press shadow-2xs"
              >
                <Target className="w-4 h-4 text-teal-600 dark:text-[#00E5B5]" />
                <span>Metas & Teto</span>
              </button>
            )}
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
            const catInfo = getCategoryInfo(cat);
            const CatIcon = catInfo.icon;
            return (
              <div key={cat}>
                <div className="flex items-center justify-between text-xs mb-1 gap-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5 min-w-0">
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${catInfo.badgeBg}`}>
                      <CatIcon className={`w-3.5 h-3.5 ${catInfo.iconColor}`} />
                    </span>
                    <span className="truncate">{cat}</span>
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
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Receitas & Entradas ({revenues.length})
            </h3>
          </div>
          <button
            onClick={onOpenNewRevenue}
            className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar Entrada
          </button>
        </div>

        <div className="space-y-2">
          {revenues.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-400">
              Nenhuma receita registrada neste mês.
            </div>
          ) : (
            revenues.map((rev) => (
              <div 
                key={rev.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all cursor-pointer group"
                onClick={() => onEditRevenue && onEditRevenue(rev)}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                    <span>{rev.name}</span>
                    <Edit3 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                    <span>📅 {rev.date.split('-').reverse().join('/')}</span>
                    <span>•</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">👤 {rev.profileName}</span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{rev.category}</span>
                    {rev.recurrence === 'Mensal' && (
                      <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                        Mensal
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                    + R$ {rev.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  {onEditRevenue && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditRevenue(rev);
                      }}
                      className="text-slate-400 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                      title="Editar Receita"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteRevenue(rev);
                    }}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                    title="Excluir Receita"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bills / Debts List (Dívidas do Mês) */}
      <div className="bg-white dark:bg-[#131D38] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Dívidas & Contas do Mês ({bills.length})
            </h3>
          </div>
          <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400">
            Total: R$ {totalBills.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="space-y-2">
          {bills.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-400">
              Nenhuma dívida registrada neste mês.
            </div>
          ) : (
            bills.map((bill) => {
              const catInfo = getCategoryInfo(bill.category);
              const isPaid = bill.status === 'paid';
              const isOverdue = bill.status === 'overdue';

              return (
                <div 
                  key={bill.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                      <span>{bill.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isPaid
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          : isOverdue
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                      }`}>
                        {isPaid ? 'Paga' : isOverdue ? 'Atrasada' : 'Pendente'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>📅 Venc: {bill.dueDate.split('-').reverse().join('/')}</span>
                      <span>•</span>
                      <span className="truncate">{catInfo.name}</span>
                      {bill.recurrence === 'Parcelada' && bill.installmentNumber && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-teal-600 dark:text-teal-400">
                            {bill.installmentNumber}/{bill.totalInstallments}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
                      - R$ {bill.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
