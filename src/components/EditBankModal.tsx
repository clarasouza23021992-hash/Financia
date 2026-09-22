import React, { useState } from 'react';
import { X, Building2, CreditCard, Wallet, Plus, Trash2, Edit3, Check, DollarSign, Calendar, ShieldCheck } from 'lucide-react';
import { BankConnection } from '../types/finance';
import { SUPPORTED_INSTITUTIONS } from '../services/bankSync';

interface EditBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (connection: BankConnection) => void;
  initialData?: BankConnection | null;
}

export const EditBankModal: React.FC<EditBankModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [institution, setInstitution] = useState(initialData?.institution || 'Banco Itaú');
  const [customInstitution, setCustomInstitution] = useState('');
  const [accountType, setAccountType] = useState<'Conta Corrente' | 'Cartão de Crédito' | 'Investimento'>(
    initialData?.accountType || 'Conta Corrente'
  );
  const [accountNumber, setAccountNumber] = useState(initialData?.accountNumber || '');
  const [balance, setBalance] = useState(initialData?.balance?.toString() || '0.00');
  const [availableLimit, setAvailableLimit] = useState(initialData?.availableLimit?.toString() || '');
  const [usedLimit, setUsedLimit] = useState(initialData?.usedLimit?.toString() || '');
  const [cardHolder, setCardHolder] = useState(initialData?.cardHolder || 'Paula');
  const [closingDay, setClosingDay] = useState(initialData?.closingDay?.toString() || '5');
  const [dueDay, setDueDay] = useState(initialData?.dueDay?.toString() || '15');

  // Reset when opening
  React.useEffect(() => {
    if (initialData) {
      setInstitution(initialData.institution);
      setAccountType(initialData.accountType);
      setAccountNumber(initialData.accountNumber);
      setBalance(initialData.balance.toString());
      setAvailableLimit(initialData.availableLimit?.toString() || '');
      setUsedLimit(initialData.usedLimit?.toString() || '');
      setCardHolder(initialData.cardHolder || 'Paula');
      setClosingDay(initialData.closingDay?.toString() || '5');
      setDueDay(initialData.dueDay?.toString() || '15');
    } else {
      setInstitution('Banco Itaú');
      setAccountType('Conta Corrente');
      setAccountNumber('');
      setBalance('0.00');
      setAvailableLimit('');
      setUsedLimit('');
      setCardHolder('Paula');
      setClosingDay('5');
      setDueDay('15');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalInstitution = institution === 'outro' && customInstitution ? customInstitution : institution;
    const parsedBalance = parseFloat(balance.replace(',', '.')) || 0;
    const parsedAvailLimit = availableLimit ? parseFloat(availableLimit.replace(',', '.')) : undefined;
    const parsedUsedLimit = usedLimit ? parseFloat(usedLimit.replace(',', '.')) : undefined;

    const newConnection: BankConnection = {
      id: initialData?.id || `bank-${Date.now()}`,
      institution: finalInstitution,
      accountType,
      accountNumber: accountNumber.trim() || (accountType === 'Cartão de Crédito' ? 'Final 0000' : 'Ag 0001 • C/C 00000-0'),
      balance: parsedBalance,
      availableLimit: parsedAvailLimit,
      usedLimit: parsedUsedLimit,
      status: 'connected',
      lastSync: 'Atualizado manualmente',
      securityHash: `sha256-real-${Date.now()}`,
      cardHolder: cardHolder.trim() || undefined,
      closingDay: closingDay ? parseInt(closingDay, 10) : undefined,
      dueDay: dueDay ? parseInt(dueDay, 10) : undefined,
    };

    onSave(newConnection);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#0E172F] w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#0A1128] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 flex items-center justify-center text-[#00C49F]">
              {accountType === 'Cartão de Crédito' ? <CreditCard className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
            </div>
            <h2 className="text-sm font-bold tracking-tight">
              {initialData ? 'Editar Dados Bancários / Cartão' : 'Adicionar Conta ou Cartão Real'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 overflow-y-auto flex-1 text-xs">
          {/* Tipo de Conta */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tipo de Instrumento Financeiro *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAccountType('Conta Corrente')}
                className={`p-2.5 rounded-xl border text-center font-bold flex flex-col items-center gap-1 transition-all ${
                  accountType === 'Conta Corrente'
                    ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 ring-2 ring-teal-500/30'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span className="text-[11px]">Conta Corrente</span>
              </button>

              <button
                type="button"
                onClick={() => setAccountType('Cartão de Crédito')}
                className={`p-2.5 rounded-xl border text-center font-bold flex flex-col items-center gap-1 transition-all ${
                  accountType === 'Cartão de Crédito'
                    ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 ring-2 ring-teal-500/30'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span className="text-[11px]">Cartão de Crédito</span>
              </button>

              <button
                type="button"
                onClick={() => setAccountType('Investimento')}
                className={`p-2.5 rounded-xl border text-center font-bold flex flex-col items-center gap-1 transition-all ${
                  accountType === 'Investimento'
                    ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 ring-2 ring-teal-500/30'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span className="text-[11px]">Investimento</span>
              </button>
            </div>
          </div>

          {/* Instituição Financeira */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Instituição Financeira / Banco *
            </label>
            <select
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
            >
              {SUPPORTED_INSTITUTIONS.map((inst) => (
                <option key={inst.id} value={inst.name}>
                  {inst.icon} {inst.name}
                </option>
              ))}
              <option value="outro">➕ Outro Banco / Cooperativa</option>
            </select>
          </div>

          {institution === 'outro' && (
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nome do Banco / Cartão Personalizado
              </label>
              <input
                type="text"
                required
                value={customInstitution}
                onChange={(e) => setCustomInstitution(e.target.value)}
                placeholder="Ex: Sicredi, C6 Carbon, XP Investimentos..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
              />
            </div>
          )}

          {/* Titular */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Titular / Responsável
              </label>
              <select
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="Paula">👩🏻‍💼 Paula</option>
                <option value="Carlos">👨🏻‍💻 Carlos</option>
                <option value="Conjunta">👫 Conjunta (Casal)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {accountType === 'Cartão de Crédito' ? 'Identificação / Final' : 'Agência & Conta'}
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder={accountType === 'Cartão de Crédito' ? 'Ex: Final 4821 (Mastercard Black)' : 'Ex: Ag 0142 • C/C 89210-4'}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          {/* Saldo ou Fatura Atual */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              {accountType === 'Cartão de Crédito' ? 'Valor da Fatura Atual (R$)' : 'Saldo Atual Disponível (R$)'} *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold">R$</span>
              <input
                type="text"
                required
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0,00"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-extrabold text-sm"
              />
            </div>
          </div>

          {/* Se for Cartão de Crédito: Limite, Dia de Fechamento e Vencimento */}
          {accountType === 'Cartão de Crédito' && (
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="font-bold text-slate-900 dark:text-white text-[11px] uppercase tracking-wide">
                Configurações da Fatura & Limites do Cartão
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 text-[10.5px] mb-1">
                    Limite Total / Disponível (R$)
                  </label>
                  <input
                    type="text"
                    value={availableLimit}
                    onChange={(e) => setAvailableLimit(e.target.value)}
                    placeholder="Ex: 15000.00"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 text-[10.5px] mb-1">
                    Limite Já Utilizado (R$)
                  </label>
                  <input
                    type="text"
                    value={usedLimit}
                    onChange={(e) => setUsedLimit(e.target.value)}
                    placeholder="Ex: 1200.00"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 text-[10.5px] mb-1">
                    Melhor Dia / Fechamento
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={closingDay}
                    onChange={(e) => setClosingDay(e.target.value)}
                    placeholder="Dia (Ex: 5)"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 text-[10.5px] mb-1">
                    Dia do Vencimento da Fatura
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    placeholder="Dia (Ex: 15)"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-500 dark:text-slate-400 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#00C49F] hover:bg-[#00b290] text-[#0A1128] font-bold rounded-xl active-press shadow-xs"
            >
              {initialData ? 'Salvar Alterações' : 'Adicionar Instrumento Real'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
