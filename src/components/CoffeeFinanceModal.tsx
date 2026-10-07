import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Coffee, CheckCircle2, Circle, Calendar, AlertCircle, 
  TrendingUp, Sparkles, Share2, Copy, Check, Plus, Trash2, 
  Heart, History, ChevronDown, ChevronUp, ArrowRight, ShieldCheck,
  Smile, Flame, ExternalLink, FileText
} from 'lucide-react';
import { Bill, Revenue, WeeklyCoffeeRoutine, WeeklyExtraExpense } from '../types/finance';
import { isMockRevenue } from '../services/cloudkitSync';

interface CoffeeFinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  bills: Bill[];
  revenues: Revenue[];
  selectedMonthLabel?: string;
  userProfileName?: string;
  spouseProfileName?: string;
  onPayBill?: (bill: Bill) => void;
  onOpenBillDetail?: (bill: Bill) => void;
}

export const COFFEE_ROUTINES_KEY = 'financas_weekly_coffee_routines_v1';

// Helper to format BRL currency
const formatBRL = (val: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val || 0);
};

// Format date to Brazilian locale
const formatDateBR = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
};

export const CoffeeFinanceModal: React.FC<CoffeeFinanceModalProps> = ({
  isOpen,
  onClose,
  bills,
  revenues,
  selectedMonthLabel = 'Mês Atual',
  userProfileName = 'Carlos',
  spouseProfileName = 'Clara',
  onPayBill,
  onOpenBillDetail,
}) => {
  const [activeTab, setActiveTab] = useState<'alignment' | 'history'>('alignment');
  const [showCelebration, setShowCelebration] = useState(false);
  const [showBillsList, setShowBillsList] = useState(false);
  const [showMissingReceiptsList, setShowMissingReceiptsList] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Form State
  const [checkedBills, setCheckedBills] = useState(false);
  const [checkedReceipts, setCheckedReceipts] = useState(false);
  const [checkedSurplus, setCheckedSurplus] = useState(false);
  const [checkedExtras, setCheckedExtras] = useState(false);

  const [completedBy, setCompletedBy] = useState<string>(`${userProfileName} & ${spouseProfileName}`);
  const [notes, setNotes] = useState<string>('');

  // Extra expenses planned for the coming week
  const [extraExpenses, setExtraExpenses] = useState<WeeklyExtraExpense[]>([]);
  const [newExpenseDesc, setNewExpenseDesc] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');

  // Past Routines
  const [pastRoutines, setPastRoutines] = useState<WeeklyCoffeeRoutine[]>(() => {
    try {
      const saved = localStorage.getItem(COFFEE_ROUTINES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Calculate Streak
  const streak = useMemo(() => {
    if (!pastRoutines || pastRoutines.length === 0) return 0;
    return pastRoutines[0]?.streakCount || pastRoutines.length;
  }, [pastRoutines]);

  // Current Week Range (Today until +7 days)
  const { todayStr, next7DaysStr, weekRangeLabel, billsDueNext7Days, billsDueTotal } = useMemo(() => {
    const today = new Date();
    const todayISO = today.toISOString().split('T')[0];
    
    const in7 = new Date();
    in7.setDate(today.getDate() + 7);
    const in7ISO = in7.toISOString().split('T')[0];

    const startBR = today.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const endBR = in7.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const label = `${startBR} a ${endBR}`;

    // Filter bills: pending or overdue, due within next 7 days
    const upcoming = bills.filter(b => {
      if (b.status === 'paid') return false;
      if (b.category === 'Salário & Renda') return false;
      const lower = (b.name || '').toLowerCase();
      if (lower.includes('salário') || lower.includes('salario')) return false;

      // include overdue bills or bills due in next 7 days
      return b.dueDate <= in7ISO;
    });

    const total = upcoming.reduce((acc, b) => acc + (b.amount || 0), 0);

    return {
      todayStr: todayISO,
      next7DaysStr: in7ISO,
      weekRangeLabel: label,
      billsDueNext7Days: upcoming,
      billsDueTotal: total,
    };
  }, [bills]);

  // Missing receipts for paid bills in the current month
  const missingReceipts = useMemo(() => {
    return bills.filter(b => {
      if (b.status !== 'paid') return false;
      if (b.category === 'Salário & Renda') return false;
      return !b.receiptUrl;
    });
  }, [bills]);

  // Real projected surplus calculation
  const { grandTotalRevenue, totalValidDebts, projectedSurplus, isSurplus } = useMemo(() => {
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
    const surplus = totalRev - totalDebts;

    return {
      grandTotalRevenue: totalRev,
      totalValidDebts: totalDebts,
      projectedSurplus: surplus,
      isSurplus: surplus >= 0,
    };
  }, [bills, revenues]);

  // Extra expenses total
  const extraExpensesTotal = useMemo(() => {
    return extraExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  }, [extraExpenses]);

  // Checklist counts
  const checkedCount = (checkedBills ? 1 : 0) + 
                       (checkedReceipts ? 1 : 0) + 
                       (checkedSurplus ? 1 : 0) + 
                       (checkedExtras ? 1 : 0);
  const isAllChecked = checkedCount === 4;

  // Add extra expense
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseDesc.trim()) return;
    const amt = parseFloat(newExpenseAmount.replace(',', '.')) || 0;
    const newExp: WeeklyExtraExpense = {
      id: `exp-${Date.now()}`,
      description: newExpenseDesc.trim(),
      amount: amt,
    };
    setExtraExpenses(prev => [...prev, newExp]);
    setNewExpenseDesc('');
    setNewExpenseAmount('');
    setCheckedExtras(true);
  };

  const handleRemoveExpense = (id: string) => {
    setExtraExpenses(prev => prev.filter(e => e.id !== id));
  };

  // Mark all checked
  const handleCheckAll = () => {
    setCheckedBills(true);
    setCheckedReceipts(true);
    setCheckedSurplus(true);
    setCheckedExtras(true);
  };

  // Save Routine
  const handleCompleteRoutine = () => {
    const newStreak = streak + 1;
    const newRoutine: WeeklyCoffeeRoutine = {
      id: `coffee-${Date.now()}`,
      completedAt: new Date().toISOString(),
      completedBy,
      weekRange: weekRangeLabel,
      streakCount: newStreak,
      billsDueCount: billsDueNext7Days.length,
      billsDueTotal,
      missingReceiptsCount: missingReceipts.length,
      projectedSurplus,
      extraExpenses,
      notes: notes.trim() || undefined,
      itemsChecked: {
        billsReviewed: checkedBills,
        receiptsReviewed: checkedReceipts,
        surplusReviewed: checkedSurplus,
        extraExpensesAligned: checkedExtras,
      },
    };

    const updated = [newRoutine, ...pastRoutines.slice(0, 29)];
    setPastRoutines(updated);
    try {
      localStorage.setItem(COFFEE_ROUTINES_KEY, JSON.stringify(updated));
    } catch {}

    setShowCelebration(true);
  };

  // WhatsApp Message Generator
  const generateWhatsAppMessage = () => {
    let msg = `☕ *Café com Finanças Concluído!* 💑\n`;
    msg += `🗓️ *Semana:* ${weekRangeLabel}\n`;
    msg += `👥 *Participantes:* ${completedBy}\n\n`;

    msg += `📋 *Resumo do Alinhamento Semanal:*\n`;
    if (billsDueNext7Days.length > 0) {
      msg += `• 📅 *Contas dos próximos 7 dias:* ${formatBRL(billsDueTotal)} (${billsDueNext7Days.length} ${billsDueNext7Days.length === 1 ? 'conta' : 'contas'})\n`;
    } else {
      msg += `• 📅 *Contas dos próximos 7 dias:* Nenhuma conta pendente! 🎉\n`;
    }

    msg += `• 💰 *Sobra do mês projetada:* ${isSurplus ? '+' : ''}${formatBRL(projectedSurplus)}\n`;

    if (missingReceipts.length === 0) {
      msg += `• 📎 *Comprovantes:* 100% conferidos e anexados ✨\n`;
    } else {
      msg += `• 📎 *Comprovantes:* ${missingReceipts.length} ${missingReceipts.length === 1 ? 'pendência' : 'pendências'}\n`;
    }

    if (extraExpenses.length > 0) {
      msg += `• 🛒 *Gastos extras previstos:* ${formatBRL(extraExpensesTotal)} (${extraExpenses.map(e => e.description).join(', ')})\n`;
    }

    if (notes.trim()) {
      msg += `\n💬 *Nosso Alinhamento:*\n"${notes.trim()}"\n`;
    }

    msg += `\n✨ *Finanças da nossa casa 100% alinhadas e sem estresse! Te amo ❤️*`;
    return msg;
  };

  const handleShareWhatsApp = () => {
    const text = generateWhatsAppMessage();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopySummary = async () => {
    const text = generateWhatsAppMessage();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    } catch {
      // Fallback
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl max-h-[92vh] flex flex-col bg-white dark:bg-[#0E172E] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="relative px-5 py-4 bg-gradient-to-r from-[#0A1128] via-[#112046] to-[#0A1128] text-white border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0">
              <Coffee className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5">
                  <span>Café com Finanças</span>
                  <span className="text-amber-400 text-xs">☕</span>
                </h2>
                {streak > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>{streak} sem seguidas</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300">
                Checklist semanal de 2 minutos para {userProfileName} & {spouseProfileName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center justify-between px-5 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/40 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setActiveTab('alignment'); setShowCelebration(false); }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                activeTab === 'alignment'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              ☕ Alinhamento da Semana ({weekRangeLabel})
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('history'); setShowCelebration(false); }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Histórico ({pastRoutines.length})</span>
            </button>
          </div>

          {activeTab === 'alignment' && !showCelebration && (
            <button
              type="button"
              onClick={handleCheckAll}
              className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
            >
              Marcar tudo OK
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {showCelebration ? (
            /* Celebration Screen */
            <div className="py-6 text-center space-y-4 animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center shadow-xl shadow-amber-500/30">
                <Coffee className="w-10 h-10 fill-current animate-bounce" />
              </div>

              <div className="space-y-1">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  ✨ Café com Finanças Concluído!
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Mais uma semana sob controle!
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  Parabéns a <strong>{completedBy}</strong>! Em apenas 2 minutos vocês alinharam as contas, protegeram o orçamento familiar e fortaleceram a cumplicidade.
                </p>
              </div>

              {/* Summary Stats Pill Box */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-md mx-auto text-left pt-2">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Sequência</div>
                  <div className="text-base font-black text-amber-500 flex items-center gap-1">
                    <Flame className="w-4 h-4 fill-amber-500" />
                    <span>{streak + 1} sem</span>
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">7 Dias</div>
                  <div className="text-sm font-black text-slate-900 dark:text-white truncate">
                    {formatBRL(billsDueTotal)}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Sobra Mês</div>
                  <div className={`text-sm font-black truncate ${isSurplus ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isSurplus ? '+' : ''}{formatBRL(projectedSurplus)}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Extras</div>
                  <div className="text-sm font-black text-slate-900 dark:text-white truncate">
                    {formatBRL(extraExpensesTotal)}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-2.5 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Enviar Resumo no WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  {copiedText ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Resumo</span>
                    </>
                  )}
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowCelebration(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                >
                  Voltar ao Checklist
                </button>
              </div>
            </div>
          ) : activeTab === 'alignment' ? (
            /* Active Alignment View */
            <div className="space-y-4">
              {/* Progress Banner */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-sm">
                    {checkedCount}/4
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {isAllChecked ? 'Tudo conferido! Pronto para concluir' : 'Checklist dos 4 Pontos da Casa'}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Converse por 2 minutos e marque cada item abaixo:
                    </p>
                  </div>
                </div>

                <div className="w-20 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${(checkedCount / 4) * 100}%` }}
                  />
                </div>
              </div>

              {/* STEP 1: Contas dos Próximos 7 Dias */}
              <div className={`p-4 rounded-2xl border transition-all ${
                checkedBills 
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300/80 dark:border-emerald-800/60' 
                  : 'bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => setCheckedBills(!checkedBills)}
                      className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                        checkedBills 
                          ? 'bg-emerald-500 text-white shadow-xs' 
                          : 'border-2 border-slate-300 dark:border-slate-600 hover:border-amber-500'
                      }`}
                    >
                      {checkedBills && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase text-amber-600 dark:text-amber-400">Passo 1</span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          Contas que vencem nos próximos 7 dias
                        </h4>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        {billsDueNext7Days.length > 0 ? (
                          <>
                            Há <strong>{billsDueNext7Days.length} {billsDueNext7Days.length === 1 ? 'conta' : 'contas'}</strong> com vencimento na semana, totalizando <strong className="text-amber-600 dark:text-amber-400">{formatBRL(billsDueTotal)}</strong>.
                          </>
                        ) : (
                          <>Nenhuma conta a vencer nos próximos 7 dias. Tudo em dia! 🎉</>
                        )}
                      </p>
                    </div>
                  </div>

                  {billsDueNext7Days.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowBillsList(!showBillsList)}
                      className="px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1"
                    >
                      <span>{showBillsList ? 'Ocultar' : 'Ver contas'}</span>
                      {showBillsList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {/* Collapsible list of upcoming bills */}
                {showBillsList && billsDueNext7Days.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/60 space-y-2">
                    {billsDueNext7Days.map((bill) => (
                      <div 
                        key={bill.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-white truncate">
                            {bill.name}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            <span>Vence: {formatDateBR(bill.dueDate)}</span>
                            {bill.paidBy && <span>• Resp: {bill.paidBy}</span>}
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-2 flex-shrink-0">
                          <span className="font-black text-slate-900 dark:text-white">
                            {formatBRL(bill.amount)}
                          </span>
                          {onPayBill && (
                            <button
                              type="button"
                              onClick={() => onPayBill(bill)}
                              className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[10px] rounded-lg active:scale-95"
                            >
                              Pagar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* STEP 2: Conferência de Comprovantes */}
              <div className={`p-4 rounded-2xl border transition-all ${
                checkedReceipts 
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300/80 dark:border-emerald-800/60' 
                  : 'bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => setCheckedReceipts(!checkedReceipts)}
                      className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                        checkedReceipts 
                          ? 'bg-emerald-500 text-white shadow-xs' 
                          : 'border-2 border-slate-300 dark:border-slate-600 hover:border-amber-500'
                      }`}
                    >
                      {checkedReceipts && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase text-amber-600 dark:text-amber-400">Passo 2</span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          Conferir comprovantes de pagamento
                        </h4>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        {missingReceipts.length === 0 ? (
                          <>Todos os pagamentos realizados já têm comprovante anexado! 📎✨</>
                        ) : (
                          <>
                            Existem <strong>{missingReceipts.length} {missingReceipts.length === 1 ? 'conta paga' : 'contas pagas'}</strong> ainda sem comprovante anexado.
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {missingReceipts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowMissingReceiptsList(!showMissingReceiptsList)}
                      className="px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1"
                    >
                      <span>{showMissingReceiptsList ? 'Ocultar' : 'Ver pendentes'}</span>
                      {showMissingReceiptsList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {/* Collapsible list of missing receipts */}
                {showMissingReceiptsList && missingReceipts.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/60 space-y-2">
                    {missingReceipts.map((bill) => (
                      <div 
                        key={bill.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-white truncate">
                            {bill.name}
                          </div>
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            Pago • Falta foto/PDF do comprovante
                          </div>
                        </div>

                        {onOpenBillDetail && (
                          <button
                            type="button"
                            onClick={() => onOpenBillDetail(bill)}
                            className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold text-[10px] rounded-lg active:scale-95 flex-shrink-0"
                          >
                            Anexar agora
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* STEP 3: Sobra Projetada do Mês */}
              <div className={`p-4 rounded-2xl border transition-all ${
                checkedSurplus 
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300/80 dark:border-emerald-800/60' 
                  : 'bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700'
              }`}>
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setCheckedSurplus(!checkedSurplus)}
                    className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                      checkedSurplus 
                        ? 'bg-emerald-500 text-white shadow-xs' 
                        : 'border-2 border-slate-300 dark:border-slate-600 hover:border-amber-500'
                    }`}
                  >
                    {checkedSurplus && <Check className="w-4 h-4 stroke-[3]" />}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase text-amber-600 dark:text-amber-400">Passo 3</span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Sobra Projetada do Mês ({selectedMonthLabel})
                      </h4>
                    </div>

                    <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Receitas − Dívidas
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400">
                          {formatBRL(grandTotalRevenue)} − {formatBRL(totalValidDebts)}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">
                          {isSurplus ? 'Sobra Estimada' : 'Falta Estimada'}
                        </div>
                        <div className={`text-base font-black ${isSurplus ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {isSurplus ? '+' : ''}{formatBRL(projectedSurplus)}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                      {isSurplus ? (
                        <>👍 Saldo positivo! Casal em acordo com o direcionamento da sobra para reserva/metas.</>
                      ) : (
                        <>⚠️ As dívidas superam a receita no mês. Hora de cortar gastos supérfluos da semana.</>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* STEP 4: Alinhamento de Gastos Extras da Próxima Semana */}
              <div className={`p-4 rounded-2xl border transition-all ${
                checkedExtras 
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300/80 dark:border-emerald-800/60' 
                  : 'bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700'
              }`}>
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setCheckedExtras(!checkedExtras)}
                    className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                      checkedExtras 
                        ? 'bg-emerald-500 text-white shadow-xs' 
                        : 'border-2 border-slate-300 dark:border-slate-600 hover:border-amber-500'
                    }`}
                  >
                    {checkedExtras && <Check className="w-4 h-4 stroke-[3]" />}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase text-amber-600 dark:text-amber-400">Passo 4</span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Alinhar gastos extras previstos para a semana
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Compras de supermercado, lazer do final de semana, farmácia ou compromissos.
                    </p>

                    {/* Quick Add Form */}
                    <form onSubmit={handleAddExpense} className="mt-3 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Ex: Supermercado sábado, farmácia..."
                        value={newExpenseDesc}
                        onChange={(e) => setNewExpenseDesc(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="R$ 0,00"
                        value={newExpenseAmount}
                        onChange={(e) => setNewExpenseAmount(e.target.value)}
                        className="w-24 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-right focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!newExpenseDesc.trim()}
                        className="px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1 active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar</span>
                      </button>
                    </form>

                    {/* List of Extra Expenses */}
                    {extraExpenses.length > 0 && (
                      <div className="mt-2 space-y-1.5 pt-2">
                        {extraExpenses.map((exp) => (
                          <div 
                            key={exp.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs"
                          >
                            <span className="font-medium text-slate-800 dark:text-slate-200">{exp.description}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white">{formatBRL(exp.amount)}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveExpense(exp.id)}
                                className="text-slate-400 hover:text-rose-500 p-1"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                        <div className="text-right text-[11px] font-bold text-slate-700 dark:text-slate-300 pt-1">
                          Total previsto: <span className="text-amber-600 dark:text-amber-400">{formatBRL(extraExpensesTotal)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes & Participants Section */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                    <span>Quem participou do café hoje?</span>
                  </label>
                  <div className="flex items-center gap-1">
                    {[
                      `${userProfileName} & ${spouseProfileName}`,
                      userProfileName,
                      spouseProfileName,
                    ].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setCompletedBy(opt)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          completedBy === opt
                            ? 'bg-amber-500 text-slate-950 shadow-2xs'
                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    💬 Anotações / Combinados do casal para a semana:
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Segurar delivery no sábado; reservar R$ 300 para o IPVA..."
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* History View */
            <div className="space-y-3">
              {pastRoutines.length === 0 ? (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
                  <Coffee className="w-8 h-8 mx-auto text-amber-500/50" />
                  <p className="text-xs font-bold">Nenhum Café com Finanças registrado ainda.</p>
                  <p className="text-[11px]">
                    Complete o primeiro checklist semanal de 2 minutos para iniciar sua sequência!
                  </p>
                </div>
              ) : (
                pastRoutines.map((routine, idx) => (
                  <div
                    key={routine.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center">
                          <Coffee className="w-4 h-4 fill-current" />
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-900 dark:text-white">
                            Semana: {routine.weekRange}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(routine.completedAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })} • Por {routine.completedBy}
                          </div>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                        🔥 #{routine.streakCount}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-1 text-[11px]">
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40">
                        <div className="text-[9px] text-slate-500 uppercase font-bold">Contas Semana</div>
                        <div className="font-extrabold text-slate-800 dark:text-slate-200">
                          {formatBRL(routine.billsDueTotal)}
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40">
                        <div className="text-[9px] text-slate-500 uppercase font-bold">Sobra Mês</div>
                        <div className={`font-extrabold ${routine.projectedSurplus >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {routine.projectedSurplus >= 0 ? '+' : ''}{formatBRL(routine.projectedSurplus)}
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40">
                        <div className="text-[9px] text-slate-500 uppercase font-bold">Extras</div>
                        <div className="font-extrabold text-slate-800 dark:text-slate-200">
                          {formatBRL((routine.extraExpenses || []).reduce((a, b) => a + b.amount, 0))}
                        </div>
                      </div>
                    </div>

                    {routine.notes && (
                      <div className="text-xs text-slate-600 dark:text-slate-300 italic bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-200/50 dark:border-amber-900/40">
                        💬 "{routine.notes}"
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        {activeTab === 'alignment' && !showCelebration && (
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-shrink-0">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-bold text-slate-700 dark:text-slate-200">{checkedCount} de 4</span> passos conferidos
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs active:scale-95 transition-all"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={handleCompleteRoutine}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
              >
                <Coffee className="w-4 h-4 fill-current" />
                <span>Concluir Café com Finanças</span>
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
