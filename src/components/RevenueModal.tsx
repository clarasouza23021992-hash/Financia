import React, { useState, useEffect } from 'react';
import { X, DollarSign, TrendingUp } from 'lucide-react';
import { Revenue, UserProfile } from '../types/finance';

interface RevenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (revData: Partial<Revenue> & { name: string; amount: number; date: string; category: string }) => void;
  profiles: UserProfile[];
  initialRevenue?: Revenue | null;
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
}) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('Salário & Renda');
  const [recurrence, setRecurrence] = useState<'Mensal' | 'Única'>('Mensal');
  const [profileName, setProfileName] = useState('Carlos');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialRevenue) {
      setName(initialRevenue.name);
      setAmount(initialRevenue.amount.toString());
      setDate(initialRevenue.date);
      setCategory(initialRevenue.category);
      setRecurrence(initialRevenue.recurrence);
      setProfileName(initialRevenue.profileName);
      setNotes(initialRevenue.notes || '');
    } else {
      setName('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setCategory('Salário & Renda');
      setRecurrence('Mensal');
      setProfileName(profiles[0]?.name || 'Carlos');
      setNotes('');
    }
  }, [initialRevenue, isOpen, profiles]);

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
                <option value="Casa Compartilhada">🏡 Casa Compartilhada</option>
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
