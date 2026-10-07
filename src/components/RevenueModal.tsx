import React, { useState, useEffect } from 'react';
import { X, DollarSign, TrendingUp, AlertTriangle, ArrowRight, Check } from 'lucide-react';
import { Revenue, UserProfile } from '../types/finance';

interface RevenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (revData: Partial<Revenue> & { name: string; amount: number; date: string; category: string; applyToFutureMonths?: boolean }) => void;
  onDelete?: (id: string) => void;
  onDeleteRequest?: (revenue: Revenue) => void;
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
  onDelete,
  onDeleteRequest,
  profiles = [],
  initialRevenue,
  defaultMonth,
  onSwitchToBill,
}) => {
  const defaultProfName = profiles[0]?.name || 'Você';
  const spouseProfName = profiles[1]?.name || 'Esposa';

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('Salário & Renda');
  const [recurrence, setRecurrence] = useState<'Mensal' | 'Única'>('Mensal');
  const [profileName, setProfileName] = useState(defaultProfName);
  const [notes, setNotes] = useState('');
  const [applyToFutureMonths, setApplyToFutureMonths] = useState(true);

  const isLikelyDebt = Boolean(
    name &&
    (
      name.toLowerCase().startsWith('conta de luz') ||
      name.toLowerCase().startsWith('conta de agua') ||
      name.toLowerCase().startsWith('conta de água') ||
      name.toLowerCase().startsWith('boleto condomin') ||
      name.toLowerCase().startsWith('fatura cartao') ||
      name.toLowerCase().startsWith('fatura cartão')
    )
  );

  const prevIsOpenRef = React.useRef(false);
  const prevRevIdRef = React.useRef<string | undefined>(undefined);

  useEffect(() => {
    const justOpened = isOpen && !prevIsOpenRef.current;
    const revChanged = isOpen && initialRevenue?.id !== prevRevIdRef.current;

    if (justOpened || revChanged) {
      if (initialRevenue) {
        setName(initialRevenue.name || '');
        setAmount(initialRevenue.amount ? initialRevenue.amount.toString().replace('.', ',') : '');
        setDate(initialRevenue.date || (defaultMonth ? `${defaultMonth}-05` : new Date().toISOString().split('T')[0]));
        setCategory(initialRevenue.category || 'Salário & Renda');
        setRecurrence(initialRevenue.recurrence || 'Mensal');
        setProfileName(initialRevenue.profileName || defaultProfName);
        setNotes(initialRevenue.notes || '');
        setApplyToFutureMonths(true);
      } else {
        setName('');
        setAmount('');
        const defaultDateStr = defaultMonth ? `${defaultMonth}-05` : new Date().toISOString().split('T')[0];
        setDate(defaultDateStr);
        setCategory('Salário & Renda');
        setRecurrence('Mensal');
        setProfileName(defaultProfName);
        setNotes('');
        setApplyToFutureMonths(true);
      }
    }
    prevIsOpenRef.current = isOpen;
    prevRevIdRef.current = initialRevenue?.id;
  }, [isOpen, initialRevenue?.id, defaultMonth, defaultProfName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = amount.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
    const parsed = parseFloat(cleaned) || 0;

    onSave({
      id: initialRevenue?.id,
      name: name.trim() || 'Receita',
      amount: parsed,
      date: date || (defaultMonth ? `${defaultMonth}-05` : new Date().toISOString().split('T')[0]),
      category,
      recurrence,
      profileName: profileName.trim() || defaultProfName,
      notes: notes.trim(),
      applyToFutureMonths,
    });
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#0E172F] w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[min(92dvh,calc(100vh-2rem))] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pinned Header */}
        <div className="bg-[#0b2b24] text-white px-5 py-4 flex items-center justify-between flex-shrink-0 border-b border-emerald-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                {initialRevenue ? 'Editar Receita / Salário' : 'Adicionar Nova Receita / Salário'}
              </h2>
              <p className="text-[11px] text-emerald-300/80">
                Entradas financeiras da casa
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="revenue-form" onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 min-h-0 overscroll-contain">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nome da Receita / Fonte *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Salário, Renda Extra, Investimentos..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            {/* Quick Name suggestions */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[
                `Salário (${defaultProfName})`,
                `Salário (${spouseProfName})`,
                'Renda Extra / Freelance',
                'Rendimentos / Investimentos',
                'Aluguel Recebido',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setName(suggestion);
                    if (suggestion.includes(spouseProfName)) {
                      setProfileName(spouseProfName);
                    } else if (suggestion.includes(defaultProfName)) {
                      setProfileName(defaultProfName);
                    }
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all active-press"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {isLikelyDebt && onSwitchToBill && (
              <div className="mt-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 p-2.5 rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-900 dark:text-amber-200">
                  <span className="font-bold">Aviso:</span> Esta tela é para <b>RECEITAS / ENTRADAS</b>. Se esta for uma conta a pagar, você pode cadastrá-la em Dívidas:
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
                type="text"
                inputMode="decimal"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-base font-extrabold text-emerald-700 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Quem Recebeu / Titular (com opções rápidas de todos os moradores e campo livre) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span>Quem Recebeu / Titular *</span>
              <span className="text-[10.5px] text-slate-400 font-normal">Selecione ou digite abaixo</span>
            </label>
            <input
              type="text"
              required
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Digite o nome de quem recebeu..."
              list="profile-suggestions"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <datalist id="profile-suggestions">
              {profiles.map(p => (
                <option key={p.id} value={p.name} />
              ))}
              <option value="Carlos" />
              <option value="Clara" />
              <option value="Esposa" />
              <option value="Você" />
              <option value="Casal / Conjunta" />
            </datalist>

            {/* Quick chips para preenchimento com 1 toque */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {profiles.length > 0 ? (
                profiles.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProfileName(p.name)}
                    className={`text-xs px-3 py-1.5 rounded-xl font-bold border transition-all active-press ${
                      profileName.toLowerCase() === p.name.toLowerCase()
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {p.avatar ? `${p.avatar} ` : ''}{p.name}
                  </button>
                ))
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setProfileName('Carlos')}
                    className={`text-xs px-3 py-1.5 rounded-xl font-bold border transition-all active-press ${
                      profileName.toLowerCase() === 'carlos'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    👨🏻‍💻 Carlos
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileName('Clara')}
                    className={`text-xs px-3 py-1.5 rounded-xl font-bold border transition-all active-press ${
                      profileName.toLowerCase() === 'clara'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    👩🏻‍💼 Clara (Esposa)
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setProfileName('Casal / Conjunta')}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold border transition-all active-press ${
                  profileName.toLowerCase() === 'casal / conjunta'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                }`}
              >
                👫 Casal / Conjunta
              </button>
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
              <option value="Mensal">Mensal Recorrente (Repete todo mês)</option>
              <option value="Única">Única / Eventual (Só neste mês)</option>
            </select>
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
              placeholder="Ex: Depositado no Itaú, Pix, etc."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
            />
          </div>
        </form>

        {/* Pinned Action Buttons Footer - 100% visible on all devices */}
        <div className="flex-shrink-0 p-3.5 sm:p-4 bg-slate-50 dark:bg-[#0c142b] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2.5 z-20">
          {initialRevenue && (onDeleteRequest || onDelete) ? (
            <button
              type="button"
              onClick={() => {
                if (onDeleteRequest) {
                  onDeleteRequest(initialRevenue);
                  onClose();
                } else if (onDelete) {
                  if (confirm(`Excluir a receita "${initialRevenue.name}"?`)) {
                    onDelete(initialRevenue.id);
                    onClose();
                  }
                }
              }}
              className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors active-press"
            >
              Excluir
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 active-press"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="revenue-form"
              onClick={handleSubmit}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-600/25 active-press flex items-center gap-1.5 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Receita</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
