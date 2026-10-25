import React, { useState } from 'react';
import { 
  Wallet, TrendingUp, Plus, Sparkles, Scale, CheckCircle2, 
  AlertCircle, Clock, ShieldCheck, ChevronDown, ChevronUp, Eye, EyeOff,
  Layers, CreditCard
} from 'lucide-react';
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

// Authentic EMV Golden Chip SVG component with gold metallic reflection
const GoldenEMVChip: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'md' }) => {
  const isSm = size === 'sm';
  return (
    <div
      className={`relative rounded-md overflow-hidden border border-amber-300/80 shadow-xs flex items-center justify-center shrink-0 ${
        isSm ? 'w-7 h-5' : 'w-9 h-7'
      }`}
      style={{
        background: 'linear-gradient(135deg, #FDE68A 0%, #D4AF37 40%, #B45309 80%, #F59E0B 100%)',
      }}
      title="Chip de Segurança Familiar"
    >
      <svg viewBox="0 0 36 28" className="w-full h-full opacity-80">
        <rect x="2" y="2" width="32" height="24" rx="3" fill="none" stroke="#78350F" strokeWidth="0.9" />
        <path d="M 2 14 H 13 M 23 14 H 34 M 13 2 V 26 M 23 2 V 26" stroke="#78350F" strokeWidth="0.9" />
        <rect x="13" y="8" width="10" height="12" rx="1.5" fill="#FCD34D" stroke="#78350F" strokeWidth="0.9" />
      </svg>
    </div>
  );
};

// Contactless payment wave icon
const ContactlessWave: React.FC = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-200/75 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M8 16.5a5 5 0 0 1 0-9" />
    <path d="M12 19a8.5 8.5 0 0 1 0-14" />
    <path d="M16 21.5a12 12 0 0 1 0-19" />
  </svg>
);

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
  const [showEquationDetails, setShowEquationDetails] = useState(false);
  const [hideAmountValues, setHideAmountValues] = useState<boolean>(() => {
    try {
      return localStorage.getItem('financas_couple_hide_values') === 'true';
    } catch {
      return false;
    }
  });

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('financas_couple_card_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('financas_couple_card_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const toggleHideValues = () => {
    setHideAmountValues(prev => {
      const next = !prev;
      try {
        localStorage.setItem('financas_couple_hide_values', String(next));
      } catch {}
      return next;
    });
  };

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
  const currentAvailableBalance = grandTotalRevenue - paidDebtsAmount;

  // 2. Sobra Líquida Final Prevista do Mês (Receita Somada − Todas as Dívidas do Mês)
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
    if (hideAmountValues) return '••••••';
    return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Extract short month code e.g. 11/26
  const getShortMonthCode = () => {
    const parts = selectedMonth.split(' de ');
    if (parts.length === 2) {
      const monthMap: Record<string, string> = {
        'Janeiro': '01', 'Fevereiro': '02', 'Março': '03', 'Abril': '04',
        'Maio': '05', 'Junho': '06', 'Julho': '07', 'Agosto': '08',
        'Setembro': '09', 'Outubro': '10', 'Novembro': '11', 'Dezembro': '12',
      };
      const mm = monthMap[parts[0]] || '11';
      const yy = parts[1].slice(-2);
      return `${mm}/${yy}`;
    }
    return '11/26';
  };

  // COLLAPSED VIEW: Ultra-refined Black Titanium mini bar
  if (isCollapsed) {
    return (
      <div id="couple-revenue-summary" className="px-3 sm:px-4 py-1 animate-fadeIn">
        <div className="titanium-card rounded-2xl p-2.5 sm:p-3 text-white border border-amber-500/25 relative overflow-hidden transition-all group">
          <div className="relative z-10 flex items-center justify-between gap-2.5">
            {/* Clickable summary area to expand */}
            <button
              type="button"
              onClick={toggleCollapse}
              className="flex items-center gap-2.5 flex-1 min-w-0 text-left active-press"
              title="Toque para expandir o Cartão de Renda do Casal"
            >
              <GoldenEMVChip size="sm" />

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black tracking-widest text-amber-300/90 uppercase truncate font-mono">
                    BLACK TITANIUM • CASAL
                  </span>
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md shrink-0 flex items-center gap-1 ${
                      isAllPaid
                        ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                        : isSurplus
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {isAllPaid ? '🎉 100% Pago' : `${isSurplus ? '+ Sobra' : '− Falta'} ${formatBRL(Math.abs(projectedBalance))}`}
                  </span>
                </div>

                <div className="text-[12px] text-slate-200 font-semibold truncate flex items-center gap-2 mt-0.5">
                  <span className="font-extrabold text-white font-mono tracking-tight">{formatBRL(grandTotalRevenue)}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-300 text-[10.5px]">
                    RECEITA TOTAL DA FAMÍLIA
                  </span>
                </div>
              </div>
            </button>

            {/* Quick Actions & Expand Button */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={toggleHideValues}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition-colors active-press"
                title={hideAmountValues ? 'Mostrar valores' : 'Ocultar valores'}
              >
                {hideAmountValues ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={onOpenNewRevenue}
                className="px-2 py-1 bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 text-[10.5px] font-bold rounded-lg flex items-center gap-1 transition-all border border-amber-400/30 active-press"
                title="Cadastrar nova receita"
              >
                <Plus className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden xs:inline">+ Renda</span>
              </button>

              <button
                type="button"
                onClick={toggleCollapse}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-amber-300 text-[10.5px] font-bold rounded-lg flex items-center gap-1 transition-all border border-white/15 active-press"
                title="Expandir cartão de crédito do casal"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Expandir</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // EXPANDED VIEW: Luxury Black / Platinum Titanium Physical Card
  return (
    <div id="couple-revenue-summary" className="px-3 sm:px-4 py-1.5 animate-fadeIn">
      {/* 1. PHYSICAL BLACK / PLATINUM TITANIUM CREDIT CARD */}
      <div className="titanium-card rounded-3xl p-4 sm:p-5 text-white border border-amber-500/30 relative overflow-hidden transition-all">
        {/* Subtle metallic diagonal sheen line */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-gradient-to-br from-amber-400/15 via-white/5 to-transparent rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-gradient-to-tr from-cyan-400/10 via-purple-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3.5">
          {/* Card Top Row: EMV Chip + Contactless Wave + Holographic Black Titanium Crest */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <GoldenEMVChip size="md" />
              <ContactlessWave />
              <span className="text-[9.5px] font-bold tracking-widest uppercase text-amber-200/90 font-mono bg-black/40 px-2 py-0.5 rounded-md border border-amber-500/20">
                FAMILY BLACK • TITANIUM
              </span>
            </div>

            {/* Quick Card Controls (Hide values, View List, Collapse) */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleHideValues}
                className="w-7 h-7 rounded-lg bg-black/40 hover:bg-black/60 text-slate-300 hover:text-white flex items-center justify-center transition-colors border border-white/10 active-press"
                title={hideAmountValues ? 'Mostrar valores' : 'Ocultar valores'}
              >
                {hideAmountValues ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={onOpenNewRevenue}
                className="px-2.5 py-1 bg-amber-400/20 hover:bg-amber-400/30 active:bg-amber-400/40 text-amber-200 text-[10.5px] font-extrabold rounded-lg flex items-center gap-1 transition-all border border-amber-400/40 active-press shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-amber-300 stroke-[2.5]" />
                <span className="hidden xs:inline">+ Adicionar Renda</span>
              </button>

              <button
                type="button"
                onClick={toggleCollapse}
                className="px-2 py-1 bg-black/40 hover:bg-black/60 text-slate-300 hover:text-white text-[10.5px] font-bold rounded-lg flex items-center gap-1 transition-all border border-white/10 active-press"
                title="Recolher card de renda"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Recolher</span>
              </button>
            </div>
          </div>

          {/* Card Center: Combined Household Income (Physical Card Embossed Look) */}
          <div className="py-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 font-mono flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                RECEITA TOTAL DA FAMÍLIA • {selectedMonth.toUpperCase()}
              </span>

              {/* Dynamic Live Tag */}
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
                    <span>🎉 100% Contas Pagas!</span>
                  </>
                ) : isSurplus ? (
                  <>
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                    <span>+ Sobra Prevista: {formatBRL(projectedBalance)}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-2.5 h-2.5 text-rose-400" />
                    <span>− Falta no Mês: {formatBRL(Math.abs(projectedBalance))}</span>
                  </>
                )}
              </span>
            </div>

            {/* Huge Embossed Amount */}
            <div className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-amber-100 font-mono tracking-tight mt-1 drop-shadow-sm flex items-center gap-2">
              <span>{formatBRL(grandTotalRevenue)}</span>
              {otherTotal > 0 && (
                <span className="text-[11px] font-sans font-semibold text-amber-300/80 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                  +{formatBRL(otherTotal)} extras
                </span>
              )}
            </div>
          </div>

          {/* Ação Unificada de Receita Conjunta */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onOpenNewRevenue}
              className="flex-1 bg-black/40 hover:bg-black/60 transition-all py-2.5 px-3 rounded-2xl border border-white/10 hover:border-amber-400/40 text-left flex items-center justify-between group active-press cursor-pointer"
              title="Cadastrar salário conjunto ou entrada de receita"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">💰</span>
                <div>
                  <div className="font-extrabold text-slate-200 text-xs">
                    Salário & Receitas Conjuntas
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Toque para cadastrar o salário do casal ou nova entrada
                  </div>
                </div>
              </div>
              <Plus className="w-4 h-4 text-amber-300 shrink-0 group-hover:scale-110 transition-transform" />
            </button>

            <button
              type="button"
              onClick={onOpenRevenueList}
              className="bg-black/40 hover:bg-black/60 transition-all py-2.5 px-3 rounded-2xl border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 active-press cursor-pointer"
              title="Ver extrato completo de receitas"
            >
              <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">Ver Extrato</span>
            </button>
          </div>

          {/* Card Bottom Row: Embossed Cardholder Names & Month Validity Code */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <div>
              <span className="text-[8.5px] uppercase tracking-widest text-slate-500 block">CONTA DA FAMÍLIA</span>
              <span className="font-black text-slate-200 tracking-wider">
                {(userProfileName || 'CARLOS').toUpperCase()} & {(spouseProfileName || 'PAULA').toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[8.5px] uppercase tracking-widest text-slate-500 block">VALIDADE MÊS</span>
                <span className="font-black text-amber-300 tracking-widest">{getShortMonthCode()}</span>
              </div>

              {/* Master/Visa style luxury twin overlapping circles foil logo */}
              <div className="flex items-center -space-x-2 shrink-0 opacity-80">
                <div className="w-4 h-4 rounded-full bg-amber-400/80 shadow-xs" />
                <div className="w-4 h-4 rounded-full bg-red-400/80 shadow-xs mix-blend-screen" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SECONDARY ACTION & EQUATION DRAWER BAR */}
      <div className="mt-1.5 flex items-center justify-between gap-2 px-1">
        <button
          type="button"
          onClick={() => setShowEquationDetails(!showEquationDetails)}
          className="text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition-colors active-press py-1"
        >
          <Scale className="w-3.5 h-3.5 text-amber-500" />
          <span>{showEquationDetails ? 'Ocultar Equação Financeira' : 'Ver Balanço & Saldo ao Vivo'}</span>
          {showEquationDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        <button
          type="button"
          onClick={onOpenRevenueList}
          className="text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors active-press py-1"
        >
          <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
          <span>Extrato de Receitas</span>
        </button>
      </div>

      {/* 3. EXPANDABLE MATHEMATICAL FINANCIAL EQUATION */}
      {showEquationDetails && (
        <div className="mt-2 bg-white dark:bg-[#131D38] rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 dark:border-slate-800/80 space-y-2.5 shadow-xs animate-fadeIn">
          {/* Side-by-side equation summary cards */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
              <span className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Receita Somada Total
              </span>
              <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white font-mono mt-0.5 block">
                {formatBRL(grandTotalRevenue)}
              </span>
              <span className="text-[9px] text-slate-400 truncate block mt-0.5">
                {userProfileName} + {spouseProfileName}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] font-bold text-amber-600 dark:text-amber-300 uppercase tracking-wider">
                  Dívidas do Mês
                </span>
                {paidDebts.length > 0 && (
                  <span className="text-[8.5px] font-extrabold px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                    {paidDebts.length} pagas
                  </span>
                )}
              </div>
              <span className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-300 font-mono mt-0.5 block">
                {formatBRL(totalBillsAmount)}
              </span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400 truncate block mt-0.5">
                {isAllPaid ? '100% quitadas! ✅' : `Falta: ${formatBRL(pendingDebtsAmount)}`}
              </span>
            </div>
          </div>

          {/* Real-time Dynamic Balance Box */}
          <div className={`p-2.5 sm:p-3 rounded-xl border space-y-2 transition-all ${
            isSurplus
              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-300'
              : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-500/30 text-rose-900 dark:text-rose-300'
          }`}>
            <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-black/5 dark:border-white/10">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">💵</span>
                  <span className="text-[11px] font-bold uppercase tracking-tight text-slate-800 dark:text-slate-200 truncate">
                    Saldo Atual Livre em Conta:
                  </span>
                  <span className="text-[8.5px] font-extrabold px-1.5 py-0.2 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-300 border border-teal-500/30 shrink-0">
                    Ao Vivo
                  </span>
                </div>
                <div className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {paidDebts.length > 0
                    ? `Renda (${formatBRL(grandTotalRevenue)}) − Já Pago (${formatBRL(paidDebtsAmount)})`
                    : 'Nenhuma conta paga ainda no mês'}
                </div>
              </div>

              <div className={`text-sm sm:text-base font-black tracking-tight font-mono shrink-0 ${
                isCurrentSurplus ? 'text-teal-600 dark:text-teal-300' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {formatBRL(currentAvailableBalance)}
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${
                  isSurplus ? 'bg-emerald-500 text-white' : 'bg-rose-600 text-white'
                }`}>
                  {isSurplus ? '+' : '−'}
                </span>
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-tight text-slate-900 dark:text-white block">
                    {isAllPaid ? 'Sobra Total Garantida (Quitado):' : isSurplus ? 'Total que vai Sobrar (Final):' : 'Total que vai Faltar (Final):'}
                  </span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 block">
                    {isAllPaid ? 'Todas as contas foram quitadas!' : `Saldo Livre (${formatBRL(currentAvailableBalance)}) − Falta Pagar (${formatBRL(pendingDebtsAmount)})`}
                  </span>
                </div>
              </div>

              <div className={`text-base sm:text-lg font-black tracking-tight font-mono shrink-0 ${
                isSurplus ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                <span>{isSurplus ? '+' : '−'}</span>
                <span>{formatBRL(Math.abs(projectedBalance))}</span>
              </div>
            </div>
          </div>

          {/* Audit Button & Transparency Box */}
          <div>
            <button
              type="button"
              onClick={() => setShowAuditDetails(!showAuditDetails)}
              className="w-full py-1 px-2 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 text-[10px] font-semibold flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
                <span>Auditoria de Cálculo Centavo por Centavo</span>
              </div>
              <div className="flex items-center gap-1 text-slate-500 text-[9.5px]">
                <span>{showAuditDetails ? 'Ocultar' : 'Ver Detalhes'}</span>
                {showAuditDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </div>
            </button>

            {showAuditDetails && (
              <div className="mt-1.5 p-2.5 rounded-xl bg-slate-900 text-white text-xs space-y-1.5 animate-fadeIn font-mono">
                <div className="flex items-center justify-between text-slate-200 text-[11px]">
                  <span>(+) Receita Somada do Casal</span>
                  <span className="font-bold text-teal-300">{formatBRL(grandTotalRevenue)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-200 text-[11px]">
                  <span>(−) Dívidas Já Pagas ({paidDebts.length})</span>
                  <span className="font-bold text-emerald-400">− {formatBRL(paidDebtsAmount)}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-y border-white/10 text-white font-bold bg-white/5 px-1.5 rounded text-[11px]">
                  <span>(=) Saldo Atual Livre na Conta</span>
                  <span className={isCurrentSurplus ? 'text-teal-300' : 'text-rose-400'}>{formatBRL(currentAvailableBalance)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-200 text-[11px]">
                  <span>(−) Dívidas Pendentes ({pendingDebts.length})</span>
                  <span className="font-bold text-amber-300">− {formatBRL(pendingDebtsAmount)}</span>
                </div>
                <div className={`flex items-center justify-between pt-1 font-black text-sm px-1.5 py-0.5 rounded ${
                  isSurplus ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  <span>(=) Sobra Final do Mês</span>
                  <span>{isSurplus ? '+' : '−'} {formatBRL(Math.abs(projectedBalance))}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
