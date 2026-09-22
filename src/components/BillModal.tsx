import React, { useState, useEffect } from 'react';
import { X, Barcode, QrCode, Upload, FileText, Trash2, Camera, Sparkles, ClipboardPaste, CheckCircle2, Building2 } from 'lucide-react';
import { Bill, PixKeyType, RecurrenceType } from '../types/finance';
import { parsePixInput, ParsedPixResult, parseScannedBoletoOrPix, sanitizeCompanyName, parseBarcodeBoleto } from '../utils/pixParser';

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    billData: Partial<Bill>,
    installmentConfig?: {
      totalInstallments: number;
      currentInstallment: number;
      valueIsPerInstallment: boolean;
    }
  ) => void;
  initialBill?: Bill | null;
  defaultMonth?: string;
}

const CATEGORIES = [
  'Moradia & Condomínio',
  'Água, Luz & Gás',
  'Alimentação & Mercado',
  'Transporte & Combustível',
  'Saúde & Farmácia',
  'Lazer & Assinaturas',
  'Financiamentos & Empréstimos',
  'Educação',
  'Outras Despesas',
];

const PIX_TYPES: PixKeyType[] = ['CNPJ', 'CPF', 'Celular', 'E-mail', 'Pix Copia e Cola', 'Aleatória'];
const RECURRENCE_OPTIONS: RecurrenceType[] = ['Mensal Fixa', 'Parcelada', 'Única / Pontual'];

export const BillModal: React.FC<BillModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialBill,
  defaultMonth,
}) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('Moradia & Condomínio');
  const [favored, setFavored] = useState('');
  const [barcode, setBarcode] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixType, setPixType] = useState<PixKeyType>('CNPJ');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('Mensal Fixa');
  const [notes, setNotes] = useState('');
  const [receiptName, setReceiptName] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptSize, setReceiptSize] = useState('');
  const [pixDetectedNotice, setPixDetectedNotice] = useState<string | null>(null);
  const [barcodeDetectedNotice, setBarcodeDetectedNotice] = useState<string | null>(null);

  // Installment Tracking State (Parcelada)
  const [totalInstallments, setTotalInstallments] = useState<number>(10);
  const [currentInstallment, setCurrentInstallment] = useState<number>(1);
  const [valueIsPerInstallment, setValueIsPerInstallment] = useState<boolean>(true);

  // Recorrência Mensal Fixa: Dívida e Valor vs Só a Dívida (User explicitly requested)
  const [fixedValueType, setFixedValueType] = useState<'fixed_value' | 'variable_value'>('fixed_value');

  useEffect(() => {
    if (initialBill) {
      setName(initialBill.name);
      setAmount(initialBill.amount.toString());
      setDueDate(initialBill.dueDate);
      setCategory(initialBill.category);
      setFavored(initialBill.favored);
      setBarcode(initialBill.barcode || '');
      setPixKey(initialBill.pixKey || '');
      setPixType(initialBill.pixType || 'CNPJ');
      setRecurrence(initialBill.recurrence || 'Mensal Fixa');
      setFixedValueType(initialBill.fixedValueType || 'fixed_value');
      setNotes(initialBill.notes || '');
      setReceiptName(initialBill.receiptName || '');
      setReceiptUrl(initialBill.receiptUrl || '');
      setReceiptSize(initialBill.receiptSize || '');
      setTotalInstallments(initialBill.totalInstallments || 10);
      setCurrentInstallment(initialBill.installmentNumber || 1);
      setValueIsPerInstallment(true);
      setPixDetectedNotice(null);
      setBarcodeDetectedNotice(null);
    } else {
      // Default for new bill
      setName('');
      setAmount('');
      const defaultDate = defaultMonth ? `${defaultMonth}-10` : new Date().toISOString().split('T')[0];
      setDueDate(defaultDate);
      setCategory('Moradia & Condomínio');
      setFavored('');
      setBarcode('');
      setPixKey('');
      setPixType('CNPJ');
      setRecurrence('Mensal Fixa');
      setFixedValueType('fixed_value');
      setNotes('');
      setReceiptName('');
      setReceiptUrl('');
      setReceiptSize('');
      setTotalInstallments(10);
      setCurrentInstallment(1);
      setValueIsPerInstallment(true);
      setPixDetectedNotice(null);
      setBarcodeDetectedNotice(null);
    }
  }, [initialBill, isOpen]);

  // Handler for automatic Barcode parsing and filling all fields
  const applyBarcodeDetection = (rawBarcode: string) => {
    setBarcode(rawBarcode);
    const targetMonth = defaultMonth || (dueDate ? dueDate.substring(0, 7) : undefined);
    const parsed = parseBarcodeBoleto(rawBarcode, targetMonth);
    if (parsed.detected) {
      if (parsed.amount) {
        setAmount(parsed.amount.toFixed(2).replace('.', ','));
      }
      if (parsed.dueDate) {
        setDueDate(parsed.dueDate);
      }
      if (parsed.billName) {
        setName(parsed.billName);
      }
      if (parsed.favored) {
        setFavored(parsed.favored);
      }
      if (parsed.category) {
        setCategory(parsed.category);
      }
      setBarcodeDetectedNotice(parsed.message || '✨ Boleto identificado com sucesso! Campos preenchidos.');
      setTimeout(() => setBarcodeDetectedNotice(null), 8000);
    }
  };

  const handleClipboardPasteBarcode = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          applyBarcodeDetection(text);
          return;
        }
      }
    } catch {
      // clipboard permission error
    }
    const manualPrompt = window.prompt('Cole aqui o código de barras ou linha digitável (47 ou 48 dígitos):');
    if (manualPrompt) {
      applyBarcodeDetection(manualPrompt);
    }
  };

  // Helper to calculate end month for installments
  const calculateInstallmentSummary = () => {
    const validTotal = Math.max(2, totalInstallments || 2);
    const validCurrent = Math.max(1, Math.min(currentInstallment || 1, validTotal));
    const effectiveDueDate = dueDate || (defaultMonth ? `${defaultMonth}-10` : new Date().toISOString().slice(0, 10));
    
    const [yStr, mStr] = effectiveDueDate.split('-');
    const baseYear = parseInt(yStr, 10) || 2026;
    const baseMonth = parseInt(mStr, 10) || 10; // 1-12

    const remainingMonths = validTotal - validCurrent;
    const endTargetMonthIndex = baseMonth + remainingMonths;
    const endYear = baseYear + Math.floor((endTargetMonthIndex - 1) / 12);
    const endMonthNum = ((endTargetMonthIndex - 1) % 12) + 1;

    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthShort = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];

    const startLabel = `${monthNames[baseMonth - 1]} de ${baseYear}`;
    const endLabel = `${monthNames[endMonthNum - 1]} de ${endYear}`;
    const shortEnd = `${monthShort[endMonthNum - 1]}/${endYear}`;

    const numAmount = parseFloat(amount.replace(',', '.')) || 0;
    const perInstallmentAmount = valueIsPerInstallment ? numAmount : (numAmount / validTotal);

    return {
      startLabel,
      endLabel,
      shortEnd,
      validTotal,
      validCurrent,
      perInstallmentAmount,
    };
  };

  // Handler for parsing pasted Pix string and automatically populating bill fields
  const applyPixDetection = (rawInput: string) => {
    const text = rawInput.trim();
    if (!text) return;

    // Use unified robust parser that separates company from amount and extracts due date
    const processed = parseScannedBoletoOrPix(text, defaultMonth);
    const parsed = parsePixInput(text);

    if (processed.pixKey || processed.barcode || parsed.detected) {
      if (processed.pixKey) {
        setPixKey(processed.pixKey);
      } else if (parsed.pixKey) {
        setPixKey(parsed.pixKey);
      } else {
        setPixKey(text);
      }

      if (processed.pixType) {
        setPixType(processed.pixType as PixKeyType);
      } else if (parsed.pixType) {
        setPixType(parsed.pixType);
      }

      // Strictly separated company/favored
      if (processed.favored) {
        setFavored(sanitizeCompanyName(processed.favored));
      } else if (parsed.favored) {
        setFavored(sanitizeCompanyName(parsed.favored));
      }

      if (processed.name && (!name || name === 'Conta sem nome' || !initialBill)) {
        setName(processed.name);
      } else if (parsed.billName && (!name || name === 'Conta sem nome' || !initialBill)) {
        setName(parsed.billName);
      }

      // Separated total amount
      if (processed.amount && processed.amount > 0) {
        setAmount(processed.amount.toFixed(2));
      } else if (parsed.amount && parsed.amount > 0) {
        setAmount(parsed.amount.toFixed(2));
      }

      if (processed.category) {
        setCategory(processed.category);
      } else if (parsed.category) {
        setCategory(parsed.category);
      }

      if (processed.barcode) {
        setBarcode(processed.barcode);
      }

      // Automatically populate due date from text/barcode/Pix
      if (processed.dueDate) {
        setDueDate(processed.dueDate);
      } else if (parsed.dueDate) {
        setDueDate(parsed.dueDate);
      } else if (!dueDate || dueDate.endsWith('-01')) {
        const targetMonth = defaultMonth || (new Date().toISOString().slice(0, 7));
        setDueDate(`${targetMonth}-10`);
      } else if (defaultMonth && !dueDate.startsWith(defaultMonth)) {
        setDueDate(`${defaultMonth}-10`);
      }

      const cleanEmpresa = processed.favored || parsed.favored;
      const cleanDueDate = processed.dueDate || parsed.dueDate;
      const formattedDate = cleanDueDate ? cleanDueDate.split('-').reverse().join('/') : '';
      
      const successNotice = cleanEmpresa && formattedDate
        ? `✨ Pix Detectado: Empresa "${cleanEmpresa}" e Vencimento (${formattedDate}) preenchidos!`
        : (parsed.message || '✨ Dados da chave Pix e vencimento preenchidos com sucesso!');

      setPixDetectedNotice(successNotice);
      setTimeout(() => setPixDetectedNotice(null), 7000);
    } else {
      setPixKey(text);
      // Even if raw key, extract due date if present or ensure valid default
      if (processed.dueDate) {
        setDueDate(processed.dueDate);
      } else if (!dueDate) {
        const targetMonth = defaultMonth || (new Date().toISOString().slice(0, 7));
        setDueDate(`${targetMonth}-10`);
      }
    }
  };

  const handleClipboardPastePix = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clipboardText = await navigator.clipboard.readText();
        if (clipboardText) {
          applyPixDetection(clipboardText);
          return;
        }
      }
    } catch {
      // Clipboard permissions or not supported
    }
    const manualPrompt = window.prompt('Cole aqui a chave Pix ou o código Pix Copia e Cola:');
    if (manualPrompt) {
      applyPixDetection(manualPrompt);
    }
  };

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setReceiptUrl(reader.result as string);
        setReceiptName(file.name);
        const sizeKb = Math.round(file.size / 1024);
        setReceiptSize(sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount.replace(',', '.')) || 0;
    const halfAmount = parsedAmount / 2;
    const isParcelada = recurrence === 'Parcelada';
    const summary = calculateInstallmentSummary();

    onSave(
      {
        id: initialBill?.id,
        name: name.trim() || 'Conta sem nome',
        amount: parsedAmount,
        dueDate,
        category,
        favored: favored.trim() || 'Não especificado',
        barcode: barcode.trim(),
        pixKey: pixKey.trim(),
        pixType,
        recurrence,
        fixedValueType: recurrence === 'Mensal Fixa' ? fixedValueType : undefined,
        splitHousehold: false,
        splitDetails: [],
        notes: notes.trim(),
        receiptName: receiptName || undefined,
        receiptUrl: receiptUrl || undefined,
        receiptSize: receiptSize || undefined,
        status: initialBill?.status || 'pending',
        installmentNumber: isParcelada ? summary.validCurrent : undefined,
        totalInstallments: isParcelada ? summary.validTotal : undefined,
        endMonth: isParcelada ? summary.shortEnd : undefined,
      },
      isParcelada
        ? {
            totalInstallments: summary.validTotal,
            currentInstallment: summary.validCurrent,
            valueIsPerInstallment,
          }
        : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#0E172F] w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-[#0A1128] text-white px-5 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold tracking-tight">
            {initialBill ? 'Editar Conta da Casa' : 'Cadastrar Nova Conta / Dívida'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Quick Pix Auto-Fill Banner */}
          <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 p-3.5 rounded-2xl border border-teal-200 dark:border-teal-800/60 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900 dark:text-teal-200">
                <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 animate-pulse" />
                <span>Preenchimento Automático por Pix</span>
              </div>
              <button
                type="button"
                onClick={handleClipboardPastePix}
                className="px-2.5 py-1 bg-[#00C49F] hover:bg-[#00b290] text-[#0A1128] text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-transform active:scale-95"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>Colar Pix</span>
              </button>
            </div>
            <p className="text-[11px] text-teal-700 dark:text-teal-300 leading-snug">
              Cole a chave ou código Pix Copia e Cola para identificar automaticamente a <strong>empresa</strong>, o <strong>valor</strong> e a <strong>categoria</strong>.
            </p>
            {pixDetectedNotice && (
              <div className="mt-2.5 p-2 bg-emerald-100/80 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-semibold text-emerald-900 dark:text-emerald-100 flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span>{pixDetectedNotice}</span>
              </div>
            )}
          </div>
          {/* Nome da Conta */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nome da Conta / Despesa *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Financiamento Caixa, Conta de Luz Enel, Fatura Cartão"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Valor Total (R$) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Valor Total (R$) *
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
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Data de Vencimento */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Data de Vencimento *
            </label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Categoria
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Empresa / Beneficiário */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Empresa / Beneficiário
            </label>
            <input
              type="text"
              value={favored}
              onChange={(e) => setFavored(e.target.value)}
              placeholder="Ex: Enel, Sabesp, Caixa, Claro, Imobiliária Alfa"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Código de Barras / Linha Digitável com Preenchimento Automático */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Barcode className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Código de Barras / Linha Digitável</span>
              </div>
              <button
                type="button"
                onClick={handleClipboardPasteBarcode}
                className="text-[11px] font-bold bg-[#00C49F] hover:bg-[#00b290] text-[#0A1128] px-2 py-0.5 rounded-md flex items-center gap-1 active:scale-95"
              >
                <ClipboardPaste className="w-3 h-3" />
                <span>Colar Código</span>
              </button>
            </div>
            <input
              type="text"
              value={barcode}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData('text');
                if (pasted) {
                  applyBarcodeDetection(pasted);
                }
              }}
              onChange={(e) => {
                const val = e.target.value;
                setBarcode(val);
                if (val.replace(/\D/g, '').length >= 44) {
                  applyBarcodeDetection(val);
                }
              }}
              placeholder="Cole a linha digitável (47 ou 48 dígitos do boleto)"
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {barcodeDetectedNotice ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[11px] font-medium p-2 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>{barcodeDetectedNotice}</span>
              </div>
            ) : (
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                ⚡ Ao colar o código de barras, o valor, vencimento, banco e empresa são preenchidos automaticamente!
              </p>
            )}
          </div>

          {/* Chave Pix ou Código Copia e Cola */}
          <div className="bg-teal-50/40 dark:bg-teal-950/20 p-3.5 rounded-2xl border border-teal-200 dark:border-teal-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800 dark:text-teal-300">
                <QrCode className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Chave Pix ou Código Copia e Cola</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleClipboardPastePix}
                  className="text-[11px] font-bold bg-[#00C49F] hover:bg-[#00b290] text-[#0A1128] px-2 py-0.5 rounded-md flex items-center gap-1 active:scale-95"
                >
                  <ClipboardPaste className="w-3 h-3" />
                  <span>Colar</span>
                </button>
                <select
                  value={pixType}
                  onChange={(e) => setPixType(e.target.value as PixKeyType)}
                  className="text-[11px] font-semibold bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200"
                >
                  {PIX_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <input
              type="text"
              value={pixKey}
              onPaste={(e) => {
                const pastedText = e.clipboardData.getData('text');
                if (pastedText) {
                  applyPixDetection(pastedText);
                }
              }}
              onChange={(e) => {
                const val = e.target.value;
                setPixKey(val);
                // If user pasted or typed an EMV or CNPJ/CPF/email, auto-detect
                if (val.length >= 11 && (val.startsWith('000201') || val.includes('@') || val.includes('.') || val.includes('/'))) {
                  applyPixDetection(val);
                }
              }}
              placeholder="Cole aqui o código Pix Copia e Cola, CNPJ, Celular ou E-mail"
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {pixDetectedNotice ? (
              <div className="bg-teal-100 dark:bg-teal-900/50 text-teal-900 dark:text-teal-200 text-[11px] font-medium p-2 rounded-lg border border-teal-300 dark:border-teal-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                <span>{pixDetectedNotice}</span>
              </div>
            ) : (
              <p className="text-[10px] text-teal-700 dark:text-teal-400">
                💡 Ao colar, o sistema detecta a empresa, o valor e a categoria automaticamente.
              </p>
            )}
          </div>

          {/* Recorrência */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tipo de Cobrança / Recorrência
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
              >
                {RECURRENCE_OPTIONS.map((rec) => (
                  <option key={rec} value={rec}>
                    {rec === 'Mensal Fixa' ? '🔁 Mensal Fixa (Repete todo mês automaticamente)' : rec === 'Parcelada' ? '🗓️ Parcelada (Em X vezes com término previsto)' : '⚡ Única / Pontual (Só este mês)'}
                  </option>
                ))}
              </select>
            </div>

            {/* SEÇÃO ESPECIAL PARA RECORRÊNCIA MENSAL FIXA (Escolha entre Só a Dívida ou Dívida e Valor) */}
            {recurrence === 'Mensal Fixa' && (
              <div className="bg-teal-50/70 dark:bg-teal-950/20 border-2 border-teal-300/80 dark:border-teal-800/60 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-950 dark:text-teal-200 flex items-center gap-1.5">
                    <span>🔁</span>
                    <span>Como repetir nos meses seguintes?</span>
                  </span>
                  <span className="text-[10px] font-bold bg-teal-200 dark:bg-teal-900/60 text-teal-900 dark:text-teal-200 px-2 py-0.5 rounded-full">
                    {fixedValueType === 'fixed_value' ? 'Dívida e Valor Fixo' : 'Só a Dívida (Variável)'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFixedValueType('fixed_value')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      fixedValueType === 'fixed_value'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">
                        ✓ Dívida e Valor
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                        fixedValueType === 'fixed_value' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        Valor Fixo
                      </span>
                    </div>
                    <p className={`text-[11px] leading-relaxed ${fixedValueType === 'fixed_value' ? 'text-teal-100' : 'text-slate-500 dark:text-slate-400'}`}>
                      Repete a dívida mantendo o mesmo valor nos próximos meses (R$ {amount || '0,00'}).
                    </p>
                    <span className={`text-[10px] block mt-1 font-medium ${fixedValueType === 'fixed_value' ? 'text-teal-200' : 'text-slate-400'}`}>
                      Ex: Aluguel, Condomínio, Internet, Assinaturas.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFixedValueType('variable_value')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      fixedValueType === 'variable_value'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">
                        ✓ Só a Dívida
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                        fixedValueType === 'variable_value' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        Valor Variável
                      </span>
                    </div>
                    <p className={`text-[11px] leading-relaxed ${fixedValueType === 'variable_value' ? 'text-teal-100' : 'text-slate-500 dark:text-slate-400'}`}>
                      Repete apenas a dívida/compromisso. O valor muda todo mês e você atualiza quando receber a conta.
                    </p>
                    <span className={`text-[10px] block mt-1 font-medium ${fixedValueType === 'variable_value' ? 'text-teal-200' : 'text-slate-400'}`}>
                      Ex: Luz, Água, Gás, Fatura do Cartão.
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* SEÇÃO ESPECIAL PARA DÍVIDA PARCELADA (User requested: quantas vezes e até que mês vai) */}
            {recurrence === 'Parcelada' && (() => {
              const summary = calculateInstallmentSummary();
              return (
                <div className="bg-amber-50/70 dark:bg-amber-950/20 border-2 border-amber-300/80 dark:border-amber-800/60 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <span>🗓️</span>
                      <span>Configuração do Parcelamento</span>
                    </span>
                    <span className="text-[11px] font-bold bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full">
                      Até {summary.shortEnd}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-amber-950 dark:text-amber-300 mb-1">
                        Total de Parcelas:
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="360"
                        value={totalInstallments}
                        onChange={(e) => setTotalInstallments(Math.max(2, parseInt(e.target.value, 10) || 2))}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-sm font-bold text-slate-900 dark:text-white text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-amber-950 dark:text-amber-300 mb-1">
                        Parcela Atual:
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={totalInstallments}
                        value={currentInstallment}
                        onChange={(e) => setCurrentInstallment(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-sm font-bold text-slate-900 dark:text-white text-center"
                      />
                    </div>
                  </div>

                  {/* Atalhos rápidos de quantidade de parcelas */}
                  <div className="flex flex-wrap gap-1.5">
                    {[2, 3, 4, 6, 10, 12, 18, 24, 36, 48].map((qty) => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => setTotalInstallments(qty)}
                        className={`text-[11px] font-bold px-2 py-1 rounded-lg transition-all ${
                          totalInstallments === qty
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                        }`}
                      >
                        {qty}x
                      </button>
                    ))}
                  </div>

                  {/* Escolha se o valor é de cada parcela ou total */}
                  <div className="space-y-1.5 bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/40">
                    <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      O valor informado acima (R$ {amount || '0,00'}) é:
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setValueIsPerInstallment(true)}
                        className={`p-2 rounded-lg font-bold text-left transition-all ${
                          valueIsPerInstallment
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        ✓ De CADA parcela
                        <span className="block text-[10px] font-normal opacity-90 mt-0.5">
                          R$ {amount || '0,00'} / mês
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setValueIsPerInstallment(false)}
                        className={`p-2 rounded-lg font-bold text-left transition-all ${
                          !valueIsPerInstallment
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        ✓ Valor TOTAL da compra
                        <span className="block text-[10px] font-normal opacity-90 mt-0.5">
                          R$ {(summary.perInstallmentAmount || 0).toFixed(2).replace('.', ',')} / mês
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Banner Explicativo de término (Até que mês vai) */}
                  <div className="bg-amber-100/90 dark:bg-amber-900/40 p-3 rounded-xl border border-amber-300 dark:border-amber-700/60 text-amber-950 dark:text-amber-100 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold">
                      <span>📅</span>
                      <span>Cronograma: Vai de {summary.startLabel} até {summary.endLabel}</span>
                    </div>
                    <p className="text-[11px] font-medium leading-relaxed">
                      Serão <strong>{summary.validTotal} parcelas mensais</strong> de{' '}
                      <strong>R$ {(summary.perInstallmentAmount || 0).toFixed(2).replace('.', ',')}</strong>.
                      O sistema lança automaticamente a dívida nos meses seguintes para você nunca esquecer!
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Anexar Comprovante de Pagamento (User explicitly requested) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Comprovante de Pagamento (PDF ou Imagem)
            </label>
            {receiptName ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {receiptName}
                    </p>
                    <p className="text-[10.5px] text-emerald-700 dark:text-emerald-400">
                      {receiptSize || 'Anexado com sucesso'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReceiptName('');
                    setReceiptUrl('');
                    setReceiptSize('');
                  }}
                  className="text-slate-400 hover:text-rose-600 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-teal-500 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-50/50 dark:bg-slate-900/40 transition-colors">
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Toque para anexar o comprovante
                </span>
                <span className="text-[10px] text-slate-400">
                  PDF, JPG ou PNG de até 15MB
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Observações ou Lembrete */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Observações ou Lembrete
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Multa de 2% se passar de 5 dias de atraso."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 active-press"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#00C49F] hover:bg-[#00b290] text-[#0A1128] font-bold text-xs rounded-xl active-press shadow-md shadow-teal-500/20"
            >
              {initialBill ? 'Salvar Alterações' : 'Cadastrar Conta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
