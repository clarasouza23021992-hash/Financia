import React, { useState } from 'react';
import { Wallet, TrendingUp, Plus, Edit3, Sparkles, Scale, CheckCircle2, AlertCircle, Clock, ShieldCheck, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { Revenue, Bill } from '../types/finance';
import { isMockRevenue } from '../services/cloudkitSync';

interface CoupleRevenueCardProps {
  revenues: Revenue[];
  bills: Bill[];
  selectedMonth: string;
  onOpenNewRevenue: () => void;
  onOpenRevenueList: () => void;
  onEditRevenue?: (revenue: Revenue | null, defaultProfileName?: string) => void;
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
  onEditRevenue,
  isWifeConnected = false,
  userProfileName = 'Você',
  spouseProfileName = 'Esposa',
}) => {
  const [showAuditDetails, setShowAuditDetails] = useState(false);

  // Real revenues only, excluding any mock records
  const realRevenues = revenues.filter(r => !isMockRevenue(r));

  // Identify You and Spouse's salaries dynamically based on user profiles
  const userRevenues = realRevenues.filter(
    r =>
      r.profileName === userProfileName ||
      r.profileName === 'Você' ||
      r.profileName === 'Carlos' ||
      (r.category === 'Salário & Renda' && (!r.profileName || r.profileName === 'Você' || r.profileName === 'Carlos')) ||
      r.name.toLowerCase().includes(userProfileName.toLowerCase()) ||
      r.name.toLowerCase().includes('carlos') ||
      r.name.toLowerCase().includes('meu salário')
  );
  const spouseRevenues = realRevenues.filter(
    r =>
      (spouseProfileName && r.profileName === spouseProfileName) ||
      r.profileName === 'Esposa' ||
      r.profileName === 'Paula' ||
      r.profileName === 'Cônjuge' ||
      (spouseProfileName && r.name.toLowerCase().includes(spouseProfileName.toLowerCase())) ||
      r.name.toLowerCase().includes('paula') ||
      r.name.toLowerCase().includes('esposa')
  );

  // Helper to reliably sum all revenues for the family member
  const calculateMemberTotal = (memberRevs: typeof realRevenues) => {
    return memberRevs.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  };

  const userSalary = calculateMemberTotal(userRevenues);
  const spouseSalary = calculateMemberTotal(spouseRevenues);

  // Sum of salaries
  const combinedSalaries = userSalary + spouseSalary;

  // Other revenues (investments, bonuses, etc.)
  const otherRevenues = realRevenues.filter(
    r =>
      !userRevenues.some(ur => ur.id === r.id) &&
      !spouseRevenues.some(sr => sr.id === r.id)
  );
  const otherTotal = otherRevenues.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  const grandTotalRevenue = combinedSalaries + otherTotal;

  // Total bills/debts for balance comparison (STRICTLY exclude any salary or migrated revenue items!)
  const validDebts = bills.filter(b => {
    if (b.category === 'Salário & Renda') return false;
    const lower = (b.name || '').toLowerCase();
    if (lower.includes('salário') || lower.includes('salario')) return false;
    if (b.id && b.id.startsWith('bill-migrated-')) return false;
    if (b.notes && b.notes.includes('Transferido automaticamente para Dívidas')) return false;
    return true;
  });

  // Separate into Paid vs Pending debts so all financial metrics update accurately when debts are paid
  const paidDebts = validDebts.filter(b => b.status === 'paid');
  const pendingDebts = validDebts.filter(b => b.status !== 'paid');

  const paidDebtsAmount = paidDebts.reduce((acc, b) => acc + (b.amount || 0), 0);
  const pendingDebtsAmount = pendingDebts.reduce((acc, b) => acc + (b.amount || 0), 0);
  const totalBillsAmount = validDebts.reduce((acc, b) => acc + (b.amount || 0), 0);
  
  // 1. Saldo Atual Livre da Renda (Receita Somada − Dívidas Já Pagas)
  // Atualiza instantaneamente a cada conta que o morador ou cônjuge marca como paga!
  const currentAvailableBalance = grandTotalRevenue - paidDebtsAmount;

  // 2. Sobra Líquida Final Prevista do Mês (Receita Somada − Todas as Dívidas do Mês)
  // Equivale a: Saldo Atual Livre − Dívidas Pendentes a Pagar
  const projectedBalance = grandTotalRevenue - totalBillsAmount;
  const isSurplus = projectedBalance >= 0;
  const isCurrentSurplus = currentAvailableBalance >= 0;
  const isAllPaid = validDebts.length > 0 && pendingDebts.length === 0;

  const handleEditUser = () => {
    if (onEditRevenue) {
      onEditRevenue(userRevenues[0] || null, userProfileName || 'Você');
    } else {
      onOpenNewRevenue();
    }
  };

  const handleEditSpouse = () => {
    if (onEditRevenue) {
      onEditRevenue(spouseRevenues[0] || null, spouseProfileName || 'Esposa');
    } else {
      onOpenNewRevenue();
    }
  };

  const formatBRL = (val: number) => {
    return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div id="couple-revenue-summary" className="px-4 py-1.5">
      <div className="bg-gradient-to-br from-[#0A1128] via-[#0E1A38] to-[#12244E] text-white rounded-2xl p-3 sm:p-3.5 shadow-md border border-slate-700/60 relative overflow-hidden">
        {/* Background glow decoration */}
        <div className="absolute -right-12 -top-12 w-40 h-40 bg-teal-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-2">
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
                type="button"
                onClick={onOpenRevenueList}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 active:bg-white/25 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all border border-white/15 active-press"
                title="Ver lista detalhada de receitas"
              >
                <TrendingUp className="w-3.5 h-3.5 text-teal-300" />
                <span>Ver Todas</span>
              </button>

              <button
                type="button"
                onClick={onOpenNewRevenue}
                className="px-2.5 py-1 bg-teal-500/25 hover:bg-teal-500/35 active:bg-teal-500/40 text-teal-200 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all border border-teal-400/40 active-press"
              >
                <Plus className="w-3.5 h-3.5 text-[#00C49F]" />
                <span>+ Receita</span>
              </button>
            </div>
          </div>

          {/* Individual Contributions Grid (Você & Esposa) */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Você Salary */}
            <button
              type="button"
              onClick={handleEditUser}
              className="bg-white/5 hover:bg-white/10 transition-all p-2.5 rounded-2xl border border-white/10 hover:border-blue-400/40 text-left flex items-center justify-between group active-press"
              title="Clique para editar ou cadastrar o seu salário"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">👨🏻‍💻</span>
                <div>
                  <div className="font-bold text-slate-200 text-[11px] flex items-center gap-1">
                    <span>{userProfileName || 'Você'}</span>
                    <Edit3 className="w-2.5 h-2.5 text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="font-extrabold text-blue-300 text-sm">{formatBRL(userSalary)}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{userSalary > 0 ? 'Toque p/ editar' : '+ Cadastrar'}</div>
                </div>
              </div>
            </button>

            {/* Esposa Salary */}
            <button
              type="button"
              onClick={handleEditSpouse}
              className="bg-white/5 hover:bg-white/10 transition-all p-2.5 rounded-2xl border border-white/10 hover:border-pink-400/40 text-left flex items-center justify-between group active-press"
              title="Clique para editar ou cadastrar o salário da esposa"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">👩🏻‍💼</span>
                <div>
                  <div className="font-bold text-slate-200 text-[11px] flex items-center gap-1">
                    <span>{spouseProfileName || 'Esposa'}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Celular conectado" />
                    <Edit3 className="w-2.5 h-2.5 text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="font-extrabold text-pink-300 text-sm">{formatBRL(spouseSalary)}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{spouseSalary > 0 ? 'Toque p/ editar' : '+ Cadastrar'}</div>
                </div>
              </div>
            </button>
          </div>

          {/* COMPACT FINANCIAL EQUATION & REAL-TIME CASH BALANCE */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-[#FFD166]" />
                Balanço do Mês:
              </span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                isAllPaid
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                  : isSurplus
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {isAllPaid ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>🎉 100% das Contas Pagas!</span>
                  </>
                ) : isSurplus ? (
                  <>
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                    <span>+ Sobra Prevista</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-2.5 h-2.5 text-rose-400" />
                    <span>− Falta no Mês</span>
                  </>
                )}
              </span>
            </div>

            {/* Compact Equation Grid: 2 side-by-side cards (Receita Somada & Total de Dívidas) */}
            <div className="grid grid-cols-2 gap-1.5 items-stretch">
              {/* 1. Receita Somada */}
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-left flex flex-col justify-between">
                <div>
                  <div className="text-[9.5px] font-bold text-teal-300 uppercase tracking-wider truncate">
                    Receita Somada
                  </div>
                  <div className="text-sm sm:text-base font-extrabold text-white mt-0.5 tracking-tight truncate">
                    {formatBRL(grandTotalRevenue)}
                  </div>
                </div>
                <div className="text-[9px] text-slate-400 truncate mt-1">
                  {userProfileName || 'Você'} + {spouseProfileName || 'Cônjuge'}
                </div>
              </div>

              {/* 2. Dívidas do Mês (Total com separação clara de pagas vs pendentes) */}
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-left flex flex-col justify-between">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[9.5px] font-bold text-amber-300 uppercase tracking-wider truncate">
                    Dívidas do Mês
                  </span>
                  {paidDebts.length > 0 && (
                    <span className="text-[8.5px] font-extrabold px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>{paidDebts.length} paga{paidDebts.length > 1 ? 's' : ''}</span>
                    </span>
                  )}
                </div>
                <div className="text-sm sm:text-base font-extrabold text-amber-300 mt-0.5 tracking-tight truncate">
                  {formatBRL(totalBillsAmount)}
                </div>
                <div className="text-[9px] text-slate-300 truncate flex items-center justify-between gap-1 mt-1">
                  {isAllPaid ? (
                    <span className="text-emerald-300 font-bold">Todas quitadas! ✅</span>
                  ) : (
                    <>
                      <span className="text-amber-200">⏳ Falta: {formatBRL(pendingDebtsAmount)}</span>
                      {paidDebts.length > 0 && (
                        <span className="text-emerald-300">Pago: {formatBRL(paidDebtsAmount)}</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Real-Time Dynamic Balance Box (ATUALIZA INSTANTANEAMENTE A CADA CONTA PAGA) */}
            <div className={`p-2.5 sm:p-3 rounded-xl border space-y-2 transition-all ${
              isSurplus
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 shadow-xs'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-300 shadow-xs'
            }`}>
              {/* Row 1: Saldo Livre em Conta Hoje (Atualiza a cada clique de pagamento!) */}
              <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/10">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px]">💵</span>
                    <span className="text-[11px] font-bold uppercase tracking-tight text-slate-200 truncate">
                      Saldo Atual Livre em Conta:
                    </span>
                    <span className="text-[8.5px] font-extrabold px-1.5 py-0.2 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 shrink-0">
                      Ao Vivo
                    </span>
                  </div>
                  <div className="text-[9.5px] text-slate-400 mt-0.5 truncate">
                    {paidDebts.length > 0
                      ? `Renda (${formatBRL(grandTotalRevenue)}) − Já Pago (${formatBRL(paidDebtsAmount)})`
                      : 'Nenhuma conta paga ainda neste mês'}
                  </div>
                </div>

                <div className={`text-sm sm:text-base font-black tracking-tight shrink-0 ${
                  isCurrentSurplus ? 'text-teal-300' : 'text-rose-400'
                }`}>
                  {formatBRL(currentAvailableBalance)}
                </div>
              </div>

              {/* Row 2: Quanto ainda falta pagar (Dívidas Pendentes) */}
              {!isAllPaid && validDebts.length > 0 && (
                <div className="flex items-center justify-between text-[10.5px] text-slate-300 px-0.5">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span className="text-slate-300 font-semibold">
                      Ainda Falta Pagar no Mês:
                    </span>
                  </div>
                  <span className="font-extrabold text-amber-300">
                    {formatBRL(pendingDebtsAmount)} ({pendingDebts.length} {pendingDebts.length === 1 ? 'conta' : 'contas'})
                  </span>
                </div>
              )}

              {/* Row 3: Total que vai Sobrar ou Faltar (Resultado Final do Mês) */}
              <div className="pt-1 border-t border-white/10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${
                    isSurplus ? 'bg-emerald-500 text-slate-950' : 'bg-rose-600 text-white'
                  }`}>
                    {isSurplus ? '+' : '−'}
                  </span>
                  <div className="min-w-0">
                    <span className="text-[11px] sm:text-[11.5px] font-extrabold uppercase tracking-tight text-white block truncate">
                      {isAllPaid
                        ? 'Sobra Total Garantida (Quitado):'
                        : isSurplus
                          ? 'Total que vai Sobrar (Final):'
                          : 'Total que vai Faltar (Final):'}
                    </span>
                    <span className="text-[9px] sm:text-[9.5px] text-slate-400 block truncate">
                      {isAllPaid
                        ? 'Todas as dívidas foram 100% quitadas!'
                        : `Saldo Livre (${formatBRL(currentAvailableBalance)}) − Falta Pagar (${formatBRL(pendingDebtsAmount)})`}
                    </span>
                  </div>
                </div>

                <div className={`text-base sm:text-lg font-black tracking-tight shrink-0 flex items-center gap-0.5 ${
                  isSurplus ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  <span>{isSurplus ? '+' : '−'}</span>
                  <span>{formatBRL(Math.abs(projectedBalance))}</span>
                </div>
              </div>
            </div>

            {/* 4. Expandable Audit Button & Panel (100% Math Transparency) */}
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setShowAuditDetails(!showAuditDetails)}
                className="w-full py-1 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[10px] font-semibold flex items-center justify-between transition-colors border border-white/5"
              >
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                  <span>Auditoria do Cálculo • 100% de Precisão Financeira</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400 text-[9.5px]">
                  <span>{showAuditDetails ? 'Ocultar' : 'Ver Detalhes'}</span>
                  {showAuditDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </div>
              </button>

              {showAuditDetails && (
                <div className="mt-1.5 p-2.5 rounded-xl bg-slate-900/90 border border-teal-500/30 text-xs space-y-1.5 animate-fadeIn">
                  <div className="text-[10px] font-bold text-teal-300 uppercase tracking-wider pb-1 border-b border-white/10 flex items-center justify-between">
                    <span>Demonstrativo Financeiro do Mês</span>
                    <span className="text-slate-400 font-normal">Centavo por centavo</span>
                  </div>

                  <div className="space-y-1 text-[11px] font-mono">
                    <div className="flex items-center justify-between text-slate-200">
                      <span>(+) Receita Somada do Casal</span>
                      <span className="font-bold text-teal-300">{formatBRL(grandTotalRevenue)}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-200">
                      <span>(−) Dívidas Já Pagas ({paidDebts.length})</span>
                      <span className="font-bold text-emerald-400">− {formatBRL(paidDebtsAmount)}</span>
                    </div>

                    <div className="flex items-center justify-between py-1 my-0.5 border-y border-white/10 text-white font-bold bg-white/5 px-1.5 rounded">
                      <span className="flex items-center gap-1">
                        <span>(=) Saldo Atual Livre na Conta</span>
                      </span>
                      <span className={isCurrentSurplus ? 'text-teal-300' : 'text-rose-400'}>
                        {formatBRL(currentAvailableBalance)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-200">
                      <span>(−) Dívidas Pendentes ({pendingDebts.length})</span>
                      <span className="font-bold text-amber-300">− {formatBRL(pendingDebtsAmount)}</span>
                    </div>

                    <div className={`flex items-center justify-between pt-1 border-t border-white/10 font-black text-sm px-1.5 py-0.5 rounded ${
                      isSurplus ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      <span>(=) Sobra Final do Mês</span>
                      <span>{isSurplus ? '+' : '−'} {formatBRL(Math.abs(projectedBalance))}</span>
                    </div>
                  </div>

                  <p className="text-[9.5px] text-slate-400 pt-1 leading-relaxed">
                    💡 <strong className="text-slate-300">Como funciona:</strong> Ao marcar uma conta como paga, ela é subtraída do seu Saldo Atual Livre e reduz imediatamente o total que Falta Pagar. A Sobra Final permanece garantida sem dupla contagem!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
