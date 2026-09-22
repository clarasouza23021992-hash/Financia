import React, { useState, useEffect } from 'react';
import { X, Check, Wallet, Sparkles, User, Heart } from 'lucide-react';

interface EditCoupleSalariesModalProps {
  isOpen: boolean;
  onClose: () => void;
  carlosCurrentSalary: number;
  paulaCurrentSalary: number;
  selectedMonth: string;
  onSaveSalaries: (carlosAmount: number, paulaAmount: number) => void;
  userLabel?: string;
  spouseLabel?: string;
}

export const EditCoupleSalariesModal: React.FC<EditCoupleSalariesModalProps> = ({
  isOpen,
  onClose,
  carlosCurrentSalary,
  paulaCurrentSalary,
  selectedMonth,
  onSaveSalaries,
  userLabel = 'Meu Salário (Você)',
  spouseLabel = 'Salário da Esposa',
}) => {
  const [carlosInput, setCarlosInput] = useState('');
  const [paulaInput, setPaulaInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCarlosInput(carlosCurrentSalary > 0 ? carlosCurrentSalary.toFixed(2).replace('.', ',') : '');
      setPaulaInput(paulaCurrentSalary > 0 ? paulaCurrentSalary.toFixed(2).replace('.', ',') : '');
      setError(null);
    }
  }, [isOpen, carlosCurrentSalary, paulaCurrentSalary]);

  if (!isOpen) return null;

  const parseValue = (str: string): number => {
    if (!str) return 0;
    const cleaned = str.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
  };

  const parsedCarlos = parseValue(carlosInput);
  const parsedPaula = parseValue(paulaInput);
  const totalCombined = parsedCarlos + parsedPaula;

  const formatBRL = (val: number) => {
    return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedCarlos < 0 || parsedPaula < 0) {
      setError('Os salários não podem ser valores negativos.');
      return;
    }

    onSaveSalaries(parsedCarlos, parsedPaula);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="edit-couple-salaries-modal"
        className="w-full max-w-md bg-white dark:bg-[#101935] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0A1128] to-[#172554] p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-[#00C49F] flex items-center justify-center font-bold">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-1.5">
                Editar Receitas do Casal
              </h2>
              <p className="text-xs text-slate-300">
                Salários do Casal • {selectedMonth}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Sum Card */}
        <div className="p-4 bg-slate-50 dark:bg-[#0c142b] border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Total Somado da Renda Familiar:
            </span>
            <span className="text-lg font-black text-teal-600 dark:text-teal-400">
              {formatBRL(totalCombined)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Os valores informados serão salvos e sincronizados automaticamente na nuvem.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* Carlos Salary Input */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <span className="text-base">👨🏻‍💻</span>
                <span>{userLabel}</span>
              </label>
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                50% Despesas
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                R$
              </span>
              <input
                id="input-carlos-salary"
                type="text"
                inputMode="decimal"
                value={carlosInput}
                onChange={(e) => setCarlosInput(e.target.value)}
                placeholder="0,00"
                className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-[#131D38] border border-slate-300 dark:border-slate-700 rounded-xl text-base font-extrabold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Paula Salary Input */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <span className="text-base">👩🏻‍💼</span>
                <span>{spouseLabel}</span>
              </label>
              <span className="text-[10px] font-semibold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/60 px-2 py-0.5 rounded-md">
                50% Despesas
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                R$
              </span>
              <input
                id="input-paula-salary"
                type="text"
                inputMode="decimal"
                value={paulaInput}
                onChange={(e) => setPaulaInput(e.target.value)}
                placeholder="0,00"
                className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-[#131D38] border border-slate-300 dark:border-slate-700 rounded-xl text-base font-extrabold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Ajuste rápido:
            </span>
            <button
              type="button"
              onClick={() => {
                setCarlosInput('7000,00');
                setPaulaInput('7000,00');
              }}
              className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-lg hover:bg-slate-200"
            >
              7k cada
            </button>
            <button
              type="button"
              onClick={() => {
                setCarlosInput('6850,00');
                setPaulaInput('7240,00');
              }}
              className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-lg hover:bg-slate-200"
            >
              Padrão
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-2xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all active-press"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Salários</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
