import React, { useState, useEffect } from 'react';
import { X, DollarSign, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react';
import { Revenue, UserProfile } from '../types/finance';

interface RevenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (revData: Partial<Revenue> & { name: string; amount: number; date: string; category: string; applyToFutureMonths?: boolean }) => void;
  profiles: UserProfile[];
  initialRevenue?: Revenue | null;
  defaultMonth?: string;
  onSwitchToBill?: (prefilledName?: string, prefilledAmount?: string) => void;
}

const REVENUE_CATEGORIES = [
  'Salário & Renda',
  'Investimentos & Rendimentos',
  'Freelance & Extras',
  'Reembolsos & Bonificações',
  'Aluguel Recebido',
  'Outras Entradas',
];

export const RevenueModal: React.FC<RevenueModalProps> = ({
  isOpen,
  onClose,
  onSave,
  profiles,
  initialRevenue,
  defaultMonth,
  onSwitchToBill,
}) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('Salário & Renda');
  const [recurrence, setRecurrence] = useState<'Mensal' | 'Única'>('Mensal');
  const [profileName, setProfileName] = useState(profiles[0]?.name || 'Carlos');
  const [notes, setNotes] = useState('');
  const [applyToFutureMonths, setApplyToFutureMonths] = useState(true);

  // Track modal open state and active revenue ID to initialize ONLY on modal open or explicit revenue selection
  const prevIsOpenRef = React.useRef(false);
  const initialRevenueIdRef = React.useRef<string | undefined>(undefined);

  const isLikelyDebt = Boolean(
    name &&
    !name.toLowerCase().includes('receb') &&
    !name.toLowerCase().includes('renda') &&
    !name.toLowerCase().includes('salário') &&
    !name.toLowerCase().includes('salario') &&
    (
      name.toLowerCase().startsWith('conta') ||
      name.toLowerCase().startsWith('boleto') ||
      name.toLowerCase().startsWith('fatura') ||
      name.toLowerCase().includes('jupiter') ||
      name.toLowerCase().includes('água') ||
      name.toLowerCase().includes('agua') ||
      name.toLowerCase().includes('saneamento') ||
      name.toLowerCase().includes('luz') ||
      name.toLowerCase().includes('energia') ||
      name.toLowerCase().includes('enel') ||
      name.toLowerCase().includes('sabesp') ||
      name.toLowerCase().includes('condom') ||
      name.toLowerCase().includes('internet')
    )
  );

  useEffect(() => {
    const justOpened = isOpen && !prevIsOpenRef.current;
    const revenueSwitched = isOpen && initialRevenue?.id !== initialRevenueIdRef.current;

    // ONLY initialize form when modal just opened or when a different revenue is selected
    // NEVER re-initialize while the user is actively typing!
    if (justOpened || revenueSwitched) {
      if (initialRevenue) {
        setName(initialRevenue.name || '');
        setAmount(initialRevenue.amount != null ? initialRevenue.amount.toString() : '');
        setDate(initialRevenue.date || (defaultMonth ? `${defaultMonth}-05` : new Date().toISOString().split('T')[0]));
        setCategory(initialRevenue.category || 'Salário & Renda');
        setRecurrence(initialRevenue.recurrence || 'Mensal');
        setProfileName(initialRevenue.profileName || profiles[0]?.name || 'Carlos');
        setNotes(initialRevenue.notes || '');
        setApplyToFutureMonths(true);
      } else {
        setName('');
        setAmount('');
        const defaultDateStr = defaultMonth ? `${defaultMonth}-05` : new Date().toISOString().split('T')[0];
        setDate(defaultDateStr);
        setCategory('Salário & Renda');
        setRecurrence('Mensal');
        setProfileName(profiles[0]?.name || 'Carlos');
        setNotes('');
        setApplyToFutureMonths(true);
      }
    }

    prevIsOpenRef.current = isOpen;
    initialRevenueIdRef.current = initialRevenue?.id;
  }, [isOpen, initialRevenue?.id]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount.replace(',', '.')) || 0;
    onSave({
      id: initialRevenue?.id,
      name: name.trim() || 'Receita sem nome',
      amount: parsed,
      date,
      category,
      recurrence,
      profileName,
      notes: notes.trim(),
      applyToFutureMonths,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#0E172F] w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto">
        <div className="bg-[#0b2b24] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold tracking-tight">
              {initialRevenue ? 'Editar Receita' : 'Adicionar Nova Receita / Entrada'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nome da Receita / Fonte *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Salário Carlos, Rendimento CDI, Venda"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {isLikelyDebt && (
              <div className="mt-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 p-2.5 rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-900 dark:text-amber-200">
                  <span className="font-bold">Atenção:</span> Esta tela é para <b>RECEITAS</b> (salários/entradas). O nome informado parece uma <b>CONTA / DÍVIDA</b>. Ao salvar, ela será direcionada automaticamente para Dívidas.
                  {onSwitchToBill && (
                    <button
                      type="button"
                      onClick={() => {
                        onSwitchToBill(name, amount);
                        onClose();
                      }}
                      className="mt-1 flex items-center gap-1 font-bold text-teal-700 dark:text-teal-300 underline"
                    >
                      <span>Mudar para Nova Conta / Dívida</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Valor da Entrada (R$) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">R$</span>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-emerald-700 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Data do Crédito *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Titular / Recebedor
              </label>
              <select
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.avatar} {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              >
                {REVENUE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Recorrência
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as 'Mensal' | 'Única')}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              >
                <option value="Mensal">Mensal Recorrente</option>
                <option value="Única">Única / Eventual</option>
              </select>
            </div>
          </div>

          {recurrence === 'Mensal' && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/70 shadow-xs">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="applyRevenueToFutureMonths"
                  checked={applyToFutureMonths}
                  onChange={(e) => setApplyToFutureMonths(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="applyRevenueToFutureMonths" className="text-xs text-slate-700 dark:text-slate-200 cursor-pointer">
                  <span className="font-bold text-emerald-900 dark:text-emerald-200 block">
                    🔁 Preencher automaticamente nos meses subsequentes
                  </span>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300 leading-snug block mt-0.5">
                    {initialRevenue
                      ? 'Ao salvar, este valor será atualizado para este mês e todos os meses futuros.'
                      : 'Esta receita recorrente será criada automaticamente nos meses seguintes com este valor.'}
                  </span>
                </label>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Observações (Opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Depositado no Itaú Conta Salário"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md active-press"
            >
              Salvar Receita
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
