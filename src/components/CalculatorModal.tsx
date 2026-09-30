import React, { useState, useEffect } from 'react';
import { X, Calculator, Copy, Check, Plus, Divide, RotateCcw } from 'lucide-react';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToNewBill?: (amount: number) => void;
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({
  isOpen,
  onClose,
  onApplyToNewBill,
}) => {
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [copied, setCopied] = useState(false);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setDisplay('0');
      setExpression('');
      setWaitingForOperand(false);
      setPreviousValue(null);
      setOperation(null);
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentNumber = parseFloat(display.replace(/\./g, '').replace(',', '.')) || 0;

  const handleDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      if (display === '0') {
        setDisplay(digit);
      } else {
        if (display.replace(/\D/g, '').length < 12) {
          setDisplay(display + digit);
        }
      }
    }
  };

  const handleDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0,');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes(',')) {
      setDisplay(display + ',');
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setExpression('');
    setWaitingForOperand(false);
    setPreviousValue(null);
    setOperation(null);
  };

  const handleBackspace = () => {
    if (waitingForOperand) return;
    if (display.length === 1 || (display.length === 2 && display.startsWith('-'))) {
      setDisplay('0');
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  const performCalculation = (op: string, a: number, b: number): number => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '×': return a * b;
      case '÷': return b !== 0 ? a / b : 0;
      default: return b;
    }
  };

  const handleOperator = (nextOp: string) => {
    const inputValue = currentNumber;

    if (previousValue === null) {
      setPreviousValue(inputValue);
      setExpression(`${display} ${nextOp}`);
    } else if (operation) {
      if (waitingForOperand) {
        setOperation(nextOp);
        setExpression(`${display} ${nextOp}`);
        return;
      }
      const result = performCalculation(operation, previousValue, inputValue);
      const formatted = result.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
      setPreviousValue(result);
      setDisplay(formatted);
      setExpression(`${formatted} ${nextOp}`);
    }

    setWaitingForOperand(true);
    setOperation(nextOp);
  };

  const handleEquals = () => {
    if (operation === null || previousValue === null) return;
    const inputValue = currentNumber;
    const result = performCalculation(operation, previousValue, inputValue);
    const formatted = result.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
    setExpression(`${previousValue.toLocaleString('pt-BR')} ${operation} ${display} =`);
    setDisplay(formatted);
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(true);
  };

  const handlePercentage = () => {
    const val = currentNumber / 100;
    setDisplay(val.toLocaleString('pt-BR', { maximumFractionDigits: 4 }));
  };

  const handleSplit5050 = () => {
    const half = currentNumber / 2;
    const formatted = half.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setExpression(`50% de R$ ${display} =`);
    setDisplay(formatted);
    setWaitingForOperand(true);
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(display);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToBill = () => {
    if (onApplyToNewBill) {
      onApplyToNewBill(currentNumber);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 modal-safe-overlay bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-[#0A1128] text-white w-full max-w-sm rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col m-auto max-h-[calc(100vh-2.5rem)]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-teal-500/20 text-[#00E5B5] flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white tracking-tight">Calculadora Financeira</h3>
              <p className="text-[10px] text-slate-400">Contas e divisão do casal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Display Screen */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800/80 text-right space-y-1">
          <div className="text-[11px] font-mono text-slate-400 min-h-[16px] truncate">
            {expression || '\u00A0'}
          </div>
          <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white truncate">
            <span className="text-sm text-teal-400 font-bold mr-1">R$</span>
            {display}
          </div>
        </div>

        {/* Quick Couple / Finance Actions Bar */}
        <div className="px-3 py-2 bg-slate-900/80 border-b border-slate-800/60 flex items-center gap-2">
          <button
            type="button"
            onClick={handleSplit5050}
            className="flex-1 py-1.5 px-2 bg-teal-500/20 hover:bg-teal-500/30 text-[#00E5B5] rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 active-press transition-colors"
            title="Dividir o valor atual igualmente por 2 (50% / 50% Casal)"
          >
            <Divide className="w-3.5 h-3.5" />
            <span>Dividir 50/50</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[11px] font-medium flex items-center gap-1 active-press transition-colors"
            title="Copiar resultado"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>

          {onApplyToNewBill && (
            <button
              type="button"
              onClick={handleSendToBill}
              className="py-1.5 px-2.5 bg-[#00C49F] hover:bg-[#00B290] text-[#0A1128] rounded-xl text-[11px] font-extrabold flex items-center gap-1 active-press transition-colors shadow-xs"
              title="Lançar este valor como nova conta/dívida"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Criar Conta</span>
            </button>
          )}
        </div>

        {/* Keypad Grid */}
        <div className="p-3.5 grid grid-cols-4 gap-2">
          {/* Row 1 */}
          <button
            type="button"
            onClick={handleClear}
            className="py-3 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-extrabold text-sm active-press transition-colors"
          >
            C
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm active-press transition-colors flex items-center justify-center"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handlePercentage}
            className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm active-press transition-colors"
          >
            %
          </button>
          <button
            type="button"
            onClick={() => handleOperator('÷')}
            className="py-3 rounded-2xl bg-teal-600/30 hover:bg-teal-600/40 text-teal-300 font-extrabold text-base active-press transition-colors"
          >
            ÷
          </button>

          {/* Row 2 */}
          <button
            type="button"
            onClick={() => handleDigit('7')}
            className="py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-base active-press transition-colors"
          >
            7
          </button>
          <button
            type="button"
            onClick={() => handleDigit('8')}
            className="py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-base active-press transition-colors"
          >
            8
          </button>
          <button
            type="button"
            onClick={() => handleDigit('9')}
            className="py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-base active-press transition-colors"
          >
            9
          </button>
          <button
            type="button"
            onClick={() => handleOperator('×')}
            className="py-3 rounded-2xl bg-teal-600/30 hover:bg-teal-600/40 text-teal-300 font-extrabold text-base active-press transition-colors"
          >
            ×
          </button>

          {/* Row 3 */}
          <button
            type="button"
            onClick={() => handleDigit('4')}
            className="py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-base active-press transition-colors"
          >
            4
          </button>
          <button
            type="button"
            onClick={() => handleDigit('5')}
            className="py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-base active-press transition-colors"
          >
            5
          </button>
          <button
            type="button"
            onClick={() => handleDigit('6')}
            className="py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-base active-press transition-colors"
          >
            6
          </button>
          <button
            type="button"
            onClick={() => handleOperator('-')}
            className="py-3 rounded-2xl bg-teal-600/30 hover:bg-teal-600/40 text-teal-300 font-extrabold text-base active-press transition-colors"
          >
            −
          </button>

          {/* Row 4 */}
          <button
            type="button"
            onClick={() => handleDigit('1')}
            className="py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-base active-press transition-colors"
          >
            1
          </button>
          <button
            type="button"
            onClick={() => handleDigit('2')}
            className="py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-base active-press transition-colors"
          >
            2
          </button>
          <button
            type="button"
            onClick={() => handleDigit('3')}
            className="py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-base active-press transition-colors"
          >
            3
          </button>
          <button
            type="button"
            onClick={() => handleOperator('+')}
            className="py-3 rounded-2xl bg-teal-600/30 hover:bg-teal-600/40 text-teal-300 font-extrabold text-base active-press transition-colors"
          >
            +
          </button>

          {/* Row 5 */}
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="col-span-2 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-base active-press transition-colors"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDecimal}
            className="py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-base active-press transition-colors"
          >
            ,
          </button>
          <button
            type="button"
            onClick={handleEquals}
            className="py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-[#00C49F] hover:from-teal-600 hover:to-[#00B290] text-[#0A1128] font-black text-xl active-press transition-all shadow-md"
          >
            =
          </button>
        </div>
      </div>
    </div>
  );
};
