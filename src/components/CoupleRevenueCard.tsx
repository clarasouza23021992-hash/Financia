import React from 'react';
import { Wallet, TrendingUp, Plus, Edit3, Sparkles, Scale, CheckCircle2, AlertCircle, Minus, Equal } from 'lucide-react';
import { Revenue, Bill } from '../types/finance';

interface CoupleRevenueCardProps {
  revenues: Revenue[];
  bills: Bill[];
  selectedMonth: string;
  onOpenNewRevenue: () => void;
  onOpenRevenueList: () => void;
  onEditSalaries: () => void;
  isWifeConnected?: boolean;
  userProfileName?: string;
  spouseProfileName?: string;
}

export const CoupleRevenueCard: React.FC<CoupleRevenueCardProps> = ({
  revenues,
  bills,
  selectedMonth,
  onOpenNewRevenue,
  onOpenRevenueList,
  onEditSalaries,
  isWifeConnected = false,
  userProfileName = 'Você',
  spouseProfileName = 'Esposa',
}) => {
  // Identify You and Wife's salaries dynamically
  const carlosRevenues = revenues.filter(
    r =>
      r.profileName === userProfileName ||
      r.profileName === 'Carlos' ||
      r.profileName === 'Você' ||
      r.name.toLowerCase().includes(userProfileName.toLowerCase()) ||
      r.name.toLowerCase().includes('carlos') ||
      r.name.toLowerCase().includes('meu')
  );
  const paulaRevenues = revenues.filter(
    r =>
      r.profileName === spouseProfileName ||
      r.profileName === 'Paula' ||
      r.profileName === 'Esposa' ||
      r.profileName === 'Camila' ||
      r.name.toLowerCase().includes(spouseProfileName.toLowerCase()) ||
      r.name.toLowerCase().includes('paula') ||
      r.name.toLowerCase().includes('esposa') ||
      r.name.toLowerCase().includes('camila')
  );

  // Helper to reliably sum all revenues for the family member
  const calculateMemberTotal = (memberRevs: typeof revenues) => {
    return memberRevs.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  };

  const carlosSalary = calculateMemberTotal(carlosRevenues);
  const paulaSalary = calculateMemberTotal(paulaRevenues);

  // Sum of Carlos and Paula salaries (Receita Somada do Casal)
  const combinedSalaries = carlosSalary + paulaSalary;

  // Other revenues (investments, bonuses, etc.)
  const otherRevenues = revenues.filter(
    r =>
      !carlosRevenues.some(cr => cr.id === r.id) &&
      !paulaRevenues.some(pr => pr.id === r.id)
  );
  const otherTotal = otherRevenues.reduce((acc, r) => acc + r.amount, 0);
  const grandTotalRevenue = combinedSalaries + otherTotal;

  // Total bills/debts for balance comparison (Valor da Dívida)
  const totalBillsAmount = bills.reduce((acc, b) => acc + b.amount, 0);
  
  // Projected Balance (Receita Somada Menos a Dívida)
  const projectedBalance = grandTotalRevenue - totalBillsAmount;
  const isSurplus = projectedBalance >= 0;

  const formatBRL = (val: number) => {
    return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div id="couple-revenue-summary" className="px-4 py-2">
      <div className="bg-gradient-to-br from-[#0A1128] via-[#0E1A38] to-[#12244E] text-white rounded-3xl p-4 shadow-lg border border-slate-700/60 relative overflow-hidden">
        {/* Background glow decoration */}
        <div className="absolute -right-12 -top-12 w-40 h-40 bg-teal-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          {/* Top header line */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-400/20 text-[#00C49F] flex items-center justify-center font-bold">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold tracking-wider text-teal-300 uppercase">
                  Receita do Casal • {selectedMonth}
                </span>
                <p className="text-[12px] font-semibold text-slate-200">
                  Salários da Casa Somados
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                id="btn-edit-couple-salaries"
                onClick={onEditSalaries}
                className="px-2.5 py-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all border border-teal-400/30 active-press"
                title="Editar os salários do casal"
              >
                <Edit3 className="w-3.5 h-3.5 text-teal-300" />
                <span>Editar Salários</span>
              </button>

              <button
                onClick={onOpenNewRevenue}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 active:bg-white/25 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all border border-white/15 active-press"
              >
                <Plus className="w-3.5 h-3.5 text-[#00C49F]" />
                <span>Receita</span>
              </button>
            </div>
          </div>

          {/* Individual Contributions Grid (Você & Esposa) */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Você Salary */}
            <button
              onClick={onEditSalaries}
              className="bg-white/5 hover:bg-white/10 transition-all p-2.5 rounded-2xl border border-white/10 hover:border-blue-400/40 text-left flex items-center justify-between group active-press"
              title="Clique para editar o seu salário"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">👨🏻‍💻</span>
                <div>
                  <div className="font-bold text-slate-200 text-[11px] flex items-center gap-1">
                    <span>{userProfileName || 'Você'}</span>
                    <Edit3 className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="font-extrabold text-blue-300 text-sm">{formatBRL(carlosSalary)}</div>
                </div>
              </div>
            </button>

            {/* Esposa Salary */}
            <button
              onClick={onEditSalaries}
              className="bg-white/5 hover:bg-white/10 transition-all p-2.5 rounded-2xl border border-white/10 hover:border-pink-400/40 text-left flex items-center justify-between group active-press"
              title="Clique para editar o salário da esposa"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">👩🏻‍💼</span>
                <div>
                  <div className="font-bold text-slate-200 text-[11px] flex items-center gap-1">
                    <span>{spouseProfileName || 'Esposa'}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${isWifeConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    <Edit3 className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="font-extrabold text-pink-300 text-sm">{formatBRL(paulaSalary)}</div>
                </div>
              </div>
            </button>
          </div>

          {/* HIGHLIGHTED FINANCIAL EQUATION: [RECEITA SOMADA] - [VALOR DA DÍVIDA] = [TOTAL QUE VAI SOBRAR OU FALTAR] */}
          <div className="pt-2 pb-1 border-t border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-[#FFD166]" />
                Balanço Mensal do Lar:
              </span>
              <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                isSurplus
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {isSurplus ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>+ Vai Sobrar no Mês</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 text-rose-400" />
                    <span>− Vai Faltar no Mês</span>
                  </>
                )}
              </span>
            </div>

            {/* Visual Formula Cards: Receita Somada - Dívida = Saldo */}
            <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 items-center">
              {/* 1. Receita Somada */}
              <div className="sm:col-span-3 p-3 rounded-2xl bg-white/5 border border-white/10 text-left">
                <div className="text-[10px] font-bold text-teal-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Receita Somada</span>
                  <span className="text-white/60 font-normal">Você + Esposa</span>
                </div>
                <div className="text-lg font-black text-white mt-0.5 tracking-tight">
                  {formatBRL(grandTotalRevenue)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {otherTotal > 0 ? `Salários (${formatBRL(combinedSalaries)}) + Outros (${formatBRL(otherTotal)})` : 'Salários Somados da Casa'}
                </div>
              </div>

              {/* Minus sign */}
              <div className="hidden sm:flex justify-center items-center">
                <div className="w-7 h-7 rounded-full bg-white/10 border border-white/15 flex items-center justify-center font-black text-slate-300 text-base">
                  −
                </div>
              </div>

              {/* 2. Valor da Dívida */}
              <div className="sm:col-span-3 p-3 rounded-2xl bg-white/5 border border-white/10 text-left">
                <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Valor da Dívida</span>
                  <span className="text-white/60 font-normal">{bills.length} contas</span>
                </div>
                <div className="text-lg font-black text-amber-300 mt-0.5 tracking-tight">
                  {formatBRL(totalBillsAmount)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Total de Despesas e Contas do Mês
                </div>
              </div>
            </div>

            {/* 3. Final Total: Total que vai sobrar (+) em verde ou faltar (-) em vermelho */}
            <div className={`p-3.5 rounded-2xl border transition-all ${
              isSurplus
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-950/40'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300 shadow-md shadow-rose-950/40'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-xs ${
                      isSurplus ? 'bg-emerald-500 text-slate-950' : 'bg-rose-600 text-white'
                    }`}>
                      {isSurplus ? '+' : '−'}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wide">
                      {isSurplus ? 'Total que vai Sobrar no Mês:' : 'Total que vai Faltar no Mês:'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {isSurplus
                      ? 'Saldo positivo projetado após o pagamento de todas as contas da casa.'
                      : 'Alerta de déficit: as contas do mês superam a receita somada do casal.'}
                  </p>
                </div>

                {/* Amount with bold + in green or - in red */}
                <div className="text-left sm:text-right">
                  <div className={`text-2xl font-black tracking-tight flex items-baseline sm:justify-end gap-1 ${
                    isSurplus ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {/* Big Signal: Plus in Green (+) or Minus in Red (-) */}
                    <span className={`text-3xl font-black leading-none ${
                      isSurplus ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {isSurplus ? '+' : '−'}
                    </span>
                    <span className="text-2xl font-black">
                      {formatBRL(Math.abs(projectedBalance))}
                    </span>
                  </div>
                  <div className={`text-[10.5px] font-black uppercase tracking-wider ${
                    isSurplus ? 'text-emerald-300' : 'text-rose-300'
                  }`}>
                    {isSurplus ? 'Sinal de Mais (+) em Verde • Sobra' : 'Sinal de Menos (−) em Vermelho • Falta'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
