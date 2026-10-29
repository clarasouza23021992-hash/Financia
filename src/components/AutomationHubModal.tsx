import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Zap, Sparkles, CreditCard, Calendar, TrendingDown, 
  CheckCircle2, ArrowRight, Copy, Check, Download, ExternalLink, 
  SlidersHorizontal, ShieldCheck, ChevronRight, AlertCircle, ShoppingBag, Bell
} from 'lucide-react';
import { Bill } from '../types/finance';
import { parseBankNotificationText, buildCardInstallmentPlan, GeneratedInstallmentPlan } from '../utils/cardNotificationParser';
import { downloadICalendarFile, getGoogleCalendarLink, CalendarExportOptions } from '../utils/calendarExporter';
import { getCategoryInfo } from '../utils/categories';

interface AutomationHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  bills: Bill[];
  selectedMonthLabel: string;
  onAddBills: (newBills: Array<Omit<Bill, 'id'> & { id?: string }>) => void;
  onBulkUpdateBillsStatus?: (billIds: string[], status: 'paid') => void;
  onShowToast: (message: string) => void;
}

export const AutomationHubModal: React.FC<AutomationHubModalProps> = ({
  isOpen,
  onClose,
  bills,
  selectedMonthLabel,
  onAddBills,
  onBulkUpdateBillsStatus,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'card_import' | 'calendar_sync' | 'early_payoff'>('card_import');

  // --- TAB 1: CARD NOTIFICATION PARSER STATE ---
  const [inputText, setInputText] = useState('');
  const [purchasedBy, setPurchasedBy] = useState('Casal 50%/50%');
  const [dueDay, setDueDay] = useState(15);
  const [closingDay, setClosingDay] = useState(5);
  const [manualCategory, setManualCategory] = useState<string>('');

  // Sample templates for one-click testing
  const samplePushes = [
    {
      title: 'Nubank 3x',
      text: 'Compra de R$ 450,00 aprovada no Nubank em 3x na Drogaria São Paulo final 5821',
    },
    {
      title: 'Itaú Combustível',
      text: 'Compra aprovada no seu Cartão Itaú de R$ 180,00 no Posto Shell final 4022',
    },
    {
      title: 'Mercado Livre 10x',
      text: 'Mercado Livre: Compra de R$ 1.200,00 em 10x de R$ 120,00 no cartão final 9012',
    },
  ];

  const parsedInfo = useMemo(() => {
    return parseBankNotificationText(inputText);
  }, [inputText]);

  const installmentPlan: GeneratedInstallmentPlan | null = useMemo(() => {
    if (!parsedInfo.detected || parsedInfo.totalAmount <= 0) return null;

    return buildCardInstallmentPlan({
      merchant: parsedInfo.merchant,
      totalAmount: parsedInfo.totalAmount,
      installments: parsedInfo.installments,
      installmentAmount: parsedInfo.installmentAmount,
      closingDay,
      dueDay,
      cardName: parsedInfo.cardName,
      cardLast4: parsedInfo.cardLast4,
      purchasedBy,
      category: manualCategory || parsedInfo.category,
    });
  }, [parsedInfo, closingDay, dueDay, purchasedBy, manualCategory]);

  const handleConfirmAddInstallments = () => {
    if (!installmentPlan || installmentPlan.bills.length === 0) return;

    const nowIso = new Date().toISOString();
    const billsToCreate: Array<Omit<Bill, 'id'> & { id?: string }> = installmentPlan.bills.map((item) => ({
      name: item.name,
      amount: item.amount,
      dueDate: item.dueDate,
      category: item.category,
      favored: item.favored,
      barcode: '',
      pixKey: '',
      pixType: 'Pix Copia e Cola',
      recurrence: (installmentPlan.installments > 1 ? 'Parcelada' : 'Única / Pontual'),
      installmentNumber: item.installmentNumber,
      totalInstallments: item.totalInstallments,
      notes: item.notes,
      status: 'pending',
      splitHousehold: true,
      splitDetails: [
        { name: 'Titular', percentage: 50, amount: item.amount / 2 },
        { name: 'Cônjuge', percentage: 50, amount: item.amount / 2 },
      ],
      version: 1,
      updatedAt: nowIso,
      updatedByDevice: 'Importação de Cartão',
      isSynced: true,
    }));

    onAddBills(billsToCreate);
    onShowToast(`🎉 ${billsToCreate.length} conta(s) cadastradas com sucesso nas faturas certas!`);
    setInputText('');
    onClose();
  };

  // --- TAB 2: CALENDAR SYNC STATE ---
  const [calendarFilter, setCalendarFilter] = useState<'pending' | 'all'>('pending');
  const [reminderOption, setReminderOption] = useState<CalendarExportOptions['reminderOption']>('same_day_9am');

  const calendarEligibleBills = useMemo(() => {
    return calendarFilter === 'pending'
      ? bills.filter(b => b.status !== 'paid')
      : bills;
  }, [bills, calendarFilter]);

  const handleExportICS = () => {
    if (calendarEligibleBills.length === 0) {
      onShowToast('Nenhuma conta elegível encontrada para exportação.');
      return;
    }

    const ok = downloadICalendarFile(calendarEligibleBills, selectedMonthLabel, {
      reminderOption,
      includeOnlyPending: calendarFilter === 'pending',
    });

    if (ok) {
      onShowToast('📅 Calendário (.ics) gerado! Abra o arquivo para adicionar à sua agenda.');
    }
  };

  // --- TAB 3: EARLY PAYOFF / DISCOUNT SIMULATOR STATE ---
  // Collect all active installment groups across bills
  const installmentGroups = useMemo(() => {
    const map = new Map<string, { baseName: string; totalInst: number; bills: Bill[] }>();

    bills.forEach(b => {
      if (b.recurrence === 'Parcelada' || (b.installmentNumber && b.installmentNumber > 0)) {
        const raw = b.name.replace(/\s*\(\d+\/\d+\)/, '').trim();
        const key = raw.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            baseName: raw,
            totalInst: b.totalInstallments || 1,
            bills: [],
          });
        }
        map.get(key)!.bills.push(b);
      }
    });

    return Array.from(map.values()).map(g => {
      g.bills.sort((a, b) => (a.installmentNumber || 1) - (b.installmentNumber || 1));
      return g;
    });
  }, [bills]);

  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number>(0);
  const [selectedBillIdsToAnticipate, setSelectedBillIdsToAnticipate] = useState<string[]>([]);
  const [annualDiscountRate, setAnnualDiscountRate] = useState<number>(8.5); // 8.5% a.a. typical Nubank rate

  const activeGroup = installmentGroups[selectedGroupIndex] || installmentGroups[0] || null;

  // Toggle selection
  const toggleBillAnticipation = (billId: string) => {
    setSelectedBillIdsToAnticipate(prev => 
      prev.includes(billId) ? prev.filter(id => id !== billId) : [...prev, billId]
    );
  };

  // Discount calculation
  const payoffCalculation = useMemo(() => {
    if (!activeGroup) {
      return { originalTotal: 0, discountedTotal: 0, totalSaved: 0, items: [] };
    }

    const chosenBills = activeGroup.bills.filter(b => selectedBillIdsToAnticipate.includes(b.id));
    const monthlyRate = Math.pow(1 + annualDiscountRate / 100, 1 / 12) - 1;

    let originalTotal = 0;
    let discountedTotal = 0;

    const items = chosenBills.map((b, idx) => {
      const orig = Number(b.amount || 0);
      originalTotal += orig;
      // Discount based on how many months early: idx + 1
      const monthsEarly = Math.max(1, idx + 1);
      const pv = orig / Math.pow(1 + monthlyRate, monthsEarly);
      discountedTotal += pv;

      return {
        bill: b,
        original: orig,
        discounted: pv,
        saved: orig - pv,
      };
    });

    return {
      originalTotal,
      discountedTotal,
      totalSaved: Math.max(0, originalTotal - discountedTotal),
      items,
    };
  }, [activeGroup, selectedBillIdsToAnticipate, annualDiscountRate]);

  const handleExecutePayoff = () => {
    if (selectedBillIdsToAnticipate.length === 0) return;
    if (onBulkUpdateBillsStatus) {
      onBulkUpdateBillsStatus(selectedBillIdsToAnticipate, 'paid');
    }
    onShowToast(`🎉 ${selectedBillIdsToAnticipate.length} parcelas liquidadas com economia de R$ ${payoffCalculation.totalSaved.toFixed(2).replace('.', ',')}!`);
    setSelectedBillIdsToAnticipate([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#0E172F] w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                  Automação & Redução de Digitação
                </h2>
                <span className="text-[10px] font-extrabold bg-teal-500/15 text-teal-600 dark:text-teal-300 px-2 py-0.5 rounded-full shrink-0">
                  Inteligente
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Importação de SMS de cartão, sincronia de agenda e desconto de parcelas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-3 sm:px-4 shrink-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('card_import')}
            className={`py-3 px-3.5 text-xs font-black border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'card_import'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>1. Importar SMS / Cartão</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calendar_sync')}
            className={`py-3 px-3.5 text-xs font-black border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'calendar_sync'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>2. Sincronizar com Agenda</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('early_payoff')}
            className={`py-3 px-3.5 text-xs font-black border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'early_payoff'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            <span>3. Desconto de Parcelas</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* TAB 1: CARD NOTIFICATION IMPORT */}
          {activeTab === 'card_import' && (
            <div className="space-y-4">
              {/* Quick sample chips */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Copie a notificação do seu banco ou teste com 1 clique:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {samplePushes.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setInputText(sample.text)}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition-all border border-slate-200 dark:border-slate-700 active:scale-95"
                    >
                      💡 {sample.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Text Area */}
              <div>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Cole aqui a mensagem recebida por SMS, WhatsApp ou Push do banco (Nubank, Itaú, Bradesco, etc.)..."
                  rows={3}
                  className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Real-time Parsed Detection Card */}
              {parsedInfo.detected ? (
                <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <span className="text-xs font-black text-teal-900 dark:text-teal-200 uppercase tracking-wide">
                        Compra Identificada com Sucesso!
                      </span>
                    </div>
                    <span className="text-[11px] font-black text-teal-700 dark:text-teal-300">
                      R$ {parsedInfo.totalAmount.toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-teal-100 dark:border-teal-900/40">
                      <span className="text-[10px] text-slate-400 block font-semibold">Estabelecimento</span>
                      <span className="font-extrabold text-slate-900 dark:text-white truncate block">
                        {parsedInfo.merchant}
                      </span>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-teal-100 dark:border-teal-900/40">
                      <span className="text-[10px] text-slate-400 block font-semibold">Parcelamento</span>
                      <span className="font-extrabold text-teal-600 dark:text-teal-400 block">
                        {parsedInfo.installments > 1 
                          ? `${parsedInfo.installments}x de R$ ${parsedInfo.installmentAmount.toFixed(2).replace('.', ',')}` 
                          : 'À Vista (1x)'}
                      </span>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-teal-100 dark:border-teal-900/40">
                      <span className="text-[10px] text-slate-400 block font-semibold">Cartão / Banco</span>
                      <span className="font-extrabold text-slate-900 dark:text-white truncate block">
                        {parsedInfo.cardName}
                      </span>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-teal-100 dark:border-teal-900/40">
                      <span className="text-[10px] text-slate-400 block font-semibold">Categoria Sugerida</span>
                      <span className="font-extrabold text-slate-900 dark:text-white truncate block">
                        {parsedInfo.category}
                      </span>
                    </div>
                  </div>

                  {/* Settings for installments */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-teal-200/50 dark:border-teal-800/40 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Quem comprou?
                      </label>
                      <select
                        value={purchasedBy}
                        onChange={(e) => setPurchasedBy(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200"
                      >
                        <option value="Casal 50%/50%">Casal 50% / 50%</option>
                        <option value="Carlos">Carlos</option>
                        <option value="Paula">Paula</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Dia do Vencimento da Fatura
                      </label>
                      <select
                        value={dueDay}
                        onChange={(e) => setDueDay(Number(e.target.value))}
                        className="w-full bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200"
                      >
                        {[5, 10, 15, 20, 25, 28].map(day => (
                          <option key={day} value={day}>Todo dia {day}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Dia de Fechamento da Fatura
                      </label>
                      <select
                        value={closingDay}
                        onChange={(e) => setClosingDay(Number(e.target.value))}
                        className="w-full bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200"
                      >
                        {[1, 3, 5, 7, 10, 12, 15].map(day => (
                          <option key={day} value={day}>Dia {day} (melhor dia de compra)</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Schedule preview */}
                  {installmentPlan && installmentPlan.bills.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[10.5px] font-black text-slate-700 dark:text-slate-300 block mb-1.5 uppercase tracking-wide">
                        📅 Cronograma Automático nas Faturas ({installmentPlan.bills.length} meses):
                      </span>
                      <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                        {installmentPlan.bills.map((inst, i) => (
                          <div 
                            key={i}
                            className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs"
                          >
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {inst.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                Venc: {inst.dueDate.split('-').reverse().join('/')}
                              </span>
                              <span className="font-extrabold text-teal-600 dark:text-teal-400">
                                R$ {inst.amount.toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleConfirmAddInstallments}
                    className="w-full py-3 px-4 rounded-2xl bg-teal-500 hover:bg-teal-600 text-[#0A1128] font-black text-xs flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>Confirmar e Cadastrar {installmentPlan?.bills.length} Conta(s) no App</span>
                  </button>
                </div>
              ) : (
                inputText.trim() && (
                  <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>Não conseguimos identificar o valor na mensagem. Verifique se há um valor em reais (ex: R$ 150,00).</span>
                  </div>
                )
              )}
            </div>
          )}

          {/* TAB 2: CALENDAR SYNC */}
          {activeTab === 'calendar_sync' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-teal-500" />
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      Exportar Vencimentos de {selectedMonthLabel}
                    </span>
                  </div>
                  <span className="text-[11px] font-extrabold text-slate-500">
                    {calendarEligibleBills.length} contas
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Gere um arquivo de calendário padrão (<strong>.ics</strong>) compatível com o <strong>Apple Calendar (iPhone/Mac)</strong>, <strong>Google Agenda (Android)</strong> e Outlook. Todas as contas serão adicionadas com alarme sonoro na data certa!
                </p>

                {/* Filter & Reminder options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Quais contas exportar?
                    </label>
                    <select
                      value={calendarFilter}
                      onChange={(e) => setCalendarFilter(e.target.value as any)}
                      className="w-full bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200"
                    >
                      <option value="pending">Apenas Contas Pendentes ({bills.filter(b => b.status !== 'paid').length})</option>
                      <option value="all">Todas as Contas do Mês ({bills.length})</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Alarme / Notificação do Calendário:
                    </label>
                    <select
                      value={reminderOption}
                      onChange={(e) => setReminderOption(e.target.value as any)}
                      className="w-full bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200"
                    >
                      <option value="same_day_9am">No dia do vencimento às 09:00</option>
                      <option value="day_before_9am">1 dia antes do vencimento</option>
                      <option value="three_days_before">3 dias antes do vencimento</option>
                      <option value="none">Sem alarme (apenas registrar evento)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExportICS}
                  className="w-full py-3 px-4 rounded-2xl bg-teal-500 hover:bg-teal-600 text-[#0A1128] font-black text-xs flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Baixar Calendário (.ics) para iPhone & Android ({calendarEligibleBills.length} contas)</span>
                </button>
              </div>

              {/* Individual Bills with direct Google Calendar link */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                  Ou adicione individualmente no Google Agenda com 1 toque:
                </span>
                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                  {calendarEligibleBills.slice(0, 15).map(b => (
                    <div 
                      key={b.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-slate-900 dark:text-white truncate">
                          {b.name}
                        </div>
                        <div className="text-[10.5px] text-slate-500 dark:text-slate-400">
                          📅 {b.dueDate.split('-').reverse().join('/')} • R$ {Number(b.amount || 0).toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                      <a
                        href={getGoogleCalendarLink(b)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 font-bold text-[11px] shrink-0 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Google Agenda</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EARLY PAYOFF & DISCOUNT SIMULATOR */}
          {activeTab === 'early_payoff' && (
            <div className="space-y-4">
              {installmentGroups.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 space-y-2">
                  <CreditCard className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="font-semibold">Nenhuma compra parcelada ativa encontrada nas finanças.</p>
                  <p className="text-[11px]">Quando você cadastrar compras em parcelas (ex: 1/10, 2/12), o simulador de antecipação com desconto aparecerá aqui!</p>
                </div>
              ) : (
                <>
                  {/* Select installment group */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Escolha a compra parcelada para simular antecipação:
                    </label>
                    <select
                      value={selectedGroupIndex}
                      onChange={(e) => {
                        setSelectedGroupIndex(Number(e.target.value));
                        setSelectedBillIdsToAnticipate([]);
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                    >
                      {installmentGroups.map((g, idx) => (
                        <option key={idx} value={idx}>
                          {g.baseName} ({g.bills.length} parcelas registradas)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Rate Slider */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Taxa de Desconto de Antecipação:
                      </span>
                      <span className="font-black text-teal-600 dark:text-teal-400 text-sm">
                        {annualDiscountRate}% ao ano
                      </span>
                    </div>
                    <input
                      type="range"
                      min={4}
                      max={18}
                      step={0.5}
                      value={annualDiscountRate}
                      onChange={(e) => setAnnualDiscountRate(Number(e.target.value))}
                      className="w-full accent-teal-500 cursor-pointer"
                    />
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>4% a.a. (conservador)</span>
                      <span>8.5% a.a. (média Nubank)</span>
                      <span>18% a.a. (agressivo)</span>
                    </div>
                  </div>

                  {/* Installment selection list */}
                  {activeGroup && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span>Selecione as parcelas que deseja quitar hoje:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const pendingIds = activeGroup.bills.filter(b => b.status !== 'paid').map(b => b.id);
                            if (selectedBillIdsToAnticipate.length === pendingIds.length) {
                              setSelectedBillIdsToAnticipate([]);
                            } else {
                              setSelectedBillIdsToAnticipate(pendingIds);
                            }
                          }}
                          className="text-teal-600 dark:text-teal-400 text-[11px] hover:underline"
                        >
                          {selectedBillIdsToAnticipate.length === activeGroup.bills.filter(b => b.status !== 'paid').length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                        </button>
                      </div>

                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                        {activeGroup.bills.map((b) => {
                          const isPaid = b.status === 'paid';
                          const isSelected = selectedBillIdsToAnticipate.includes(b.id);
                          return (
                            <div
                              key={b.id}
                              onClick={() => !isPaid && toggleBillAnticipation(b.id)}
                              className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                                isPaid
                                  ? 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-50 cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-700 cursor-pointer'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 cursor-pointer'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  disabled={isPaid}
                                  checked={isSelected || isPaid}
                                  onChange={() => {}}
                                  className="w-4 h-4 rounded text-teal-600 accent-teal-500"
                                />
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-white block">
                                    {b.name}
                                  </span>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                    Vencimento original: {b.dueDate.split('-').reverse().join('/')} {isPaid ? '(Já Paga)' : ''}
                                  </span>
                                </div>
                              </div>

                              <span className="font-extrabold text-slate-800 dark:text-slate-200">
                                R$ {Number(b.amount || 0).toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Savings Summary Banner */}
                  {selectedBillIdsToAnticipate.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/20 to-emerald-500/15 border border-emerald-500/30 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-300">Total Original ({selectedBillIdsToAnticipate.length} parcelas):</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          R$ {payoffCalculation.originalTotal.toFixed(2).replace('.', ',')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-slate-900 dark:text-white">Total para Quitar Hoje (com Desconto):</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          R$ {payoffCalculation.discountedTotal.toFixed(2).replace('.', ',')}
                        </span>
                      </div>

                      <div className="pt-1.5 border-t border-emerald-500/30 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase">
                            Economia Total do Casal:
                          </span>
                        </div>
                        <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                          + R$ {payoffCalculation.totalSaved.toFixed(2).replace('.', ',')}
                        </span>
                      </div>

                      {onBulkUpdateBillsStatus && (
                        <button
                          type="button"
                          onClick={handleExecutePayoff}
                          className="w-full mt-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
                        >
                          Marcar {selectedBillIdsToAnticipate.length} Parcela(s) como Liquidadas
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
