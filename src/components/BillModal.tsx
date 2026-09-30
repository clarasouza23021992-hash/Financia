import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, Barcode, QrCode, Upload, FileText, Trash2, Camera, Sparkles, 
  ClipboardPaste, CheckCircle2, Building2, Calendar, History, 
  TrendingUp, Check, ArrowRight, Wallet
} from 'lucide-react';
import { Bill, PixKeyType, RecurrenceType, getMonthNamePtBr, getMonthShortPtBr } from '../types/finance';
import { parsePixInput, ParsedPixResult, parseScannedBoletoOrPix, sanitizeCompanyName, parseBarcodeBoleto } from '../utils/pixParser';
import { CATEGORIES_LIST, getCategoryInfo, inferCategoryFromName, getStoredCategories } from '../utils/categories';
import { getFavoredHistory, getFrequentFavoreds, FavoredHistorySummary, FrequentFavoredItem } from '../utils/historySuggestions';
import { cloudkit } from '../services/cloudkitSync';

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    billData: Partial<Bill> & { applyToFutureMonths?: boolean; previousName?: string },
    installmentConfig?: {
      totalInstallments: number;
      currentInstallment: number;
      valueIsPerInstallment: boolean;
    }
  ) => void;
  initialBill?: Bill | null;
  defaultMonth?: string;
  onOpenManageCategories?: () => void;
  existingBills?: Bill[];
}

const PIX_TYPES: PixKeyType[] = ['CNPJ', 'CPF', 'Celular', 'E-mail', 'Pix Copia e Cola', 'Aleatória'];
const RECURRENCE_OPTIONS: RecurrenceType[] = ['Mensal Fixa', 'Parcelada', 'Única / Pontual'];

export const BillModal: React.FC<BillModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialBill,
  defaultMonth,
  onOpenManageCategories,
  existingBills,
}) => {
  const [availableCategories, setAvailableCategories] = useState<string[]>(() => {
    return getStoredCategories().map(c => c.name);
  });

  // Keep categories updated if user creates/renames categories
  useEffect(() => {
    const handleUpdate = () => {
      setAvailableCategories(getStoredCategories().map(c => c.name));
    };
    handleUpdate();
    window.addEventListener('financas-categories-updated', handleUpdate);
    return () => window.removeEventListener('financas-categories-updated', handleUpdate);
  }, [isOpen]);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('Financiamentos & Empréstimos');
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
  const [categoryNotice, setCategoryNotice] = useState<string | null>(null);
  const [applyToFutureMonths, setApplyToFutureMonths] = useState<boolean>(true);

  // Installment Tracking State (Parcelada)
  const [totalInstallments, setTotalInstallments] = useState<number>(10);
  const [currentInstallment, setCurrentInstallment] = useState<number>(1);
  const [valueIsPerInstallment, setValueIsPerInstallment] = useState<boolean>(true);

  // Recorrência Mensal Fixa: Dívida e Valor vs Só a Dívida (User explicitly requested)
  const [fixedValueType, setFixedValueType] = useState<'fixed_value' | 'variable_value'>('fixed_value');

  // Mês em que o usuário quer pagar (caso queira pagar antes ou depois do mês de vencimento)
  const [paymentMonth, setPaymentMonth] = useState<string>('');
  const [customPaymentMonthEnabled, setCustomPaymentMonthEnabled] = useState<boolean>(false);

  // History suggestions state & notice
  const [historyNotice, setHistoryNotice] = useState<string | null>(null);

  // Compute all bills list
  const allBillsList = useMemo(() => {
    return existingBills && existingBills.length > 0 ? existingBills : cloudkit.getBills();
  }, [existingBills, isOpen]);

  // Frequent past favored companies (for 1-tap quick suggestions when favored is empty)
  const frequentFavoreds = useMemo(() => {
    return getFrequentFavoreds(allBillsList, 6);
  }, [allBillsList]);

  // Query to find history: checks both favored and name
  const historyQuery = favored.trim() || name.trim();

  const favoredHistory = useMemo(() => {
    if (!historyQuery) return null;
    return getFavoredHistory(historyQuery, allBillsList, initialBill?.id);
  }, [historyQuery, allBillsList, initialBill?.id]);

  const handleApplySuggestedCategory = (catName: string) => {
    setCategory(catName);
    setHistoryNotice(`📁 Categoria "${catName}" aplicada do histórico!`);
    setTimeout(() => setHistoryNotice(null), 4000);
  };

  const handleApplySuggestedAmount = (val: number, label?: string) => {
    setAmount(val.toFixed(2).replace('.', ','));
    setHistoryNotice(`💰 Valor R$ ${val.toFixed(2).replace('.', ',')}${label ? ` (${label})` : ''} aplicado!`);
    setTimeout(() => setHistoryNotice(null), 4000);
  };

  const handleApplyDueDay = (day: number) => {
    const currentBase = dueDate || (defaultMonth ? `${defaultMonth}-10` : new Date().toISOString().split('T')[0]);
    const [y, m] = currentBase.split('-').map(Number);
    const maxDays = new Date(y, m, 0).getDate();
    const safeDay = String(Math.min(day, maxDays)).padStart(2, '0');
    setDueDate(`${String(y)}-${String(m).padStart(2, '0')}-${safeDay}`);
    setHistoryNotice(`📅 Vencimento ajustado para o dia ${safeDay}!`);
    setTimeout(() => setHistoryNotice(null), 4000);
  };

  const handleApplyAllFromHistory = (hist: FavoredHistorySummary) => {
    if (hist.suggestedCategory) {
      setCategory(hist.suggestedCategory);
    }
    if (hist.lastAmount && hist.lastAmount > 0) {
      setAmount(hist.lastAmount.toFixed(2).replace('.', ','));
    }
    if (hist.matchedFavored && !favored) {
      setFavored(hist.matchedFavored);
    }
    if (hist.lastPixKey && !pixKey) {
      setPixKey(hist.lastPixKey);
      if (hist.lastPixType) setPixType(hist.lastPixType as any);
    }
    if (hist.lastBarcode && !barcode) {
      setBarcode(hist.lastBarcode);
    }
    if (hist.commonDueDay) {
      const currentBase = dueDate || (defaultMonth ? `${defaultMonth}-10` : new Date().toISOString().split('T')[0]);
      const [y, m] = currentBase.split('-').map(Number);
      const maxDays = new Date(y, m, 0).getDate();
      const safeDay = String(Math.min(hist.commonDueDay, maxDays)).padStart(2, '0');
      setDueDate(`${String(y)}-${String(m).padStart(2, '0')}-${safeDay}`);
    }
    setHistoryNotice(`✨ Dados do último pagamento aplicados com sucesso!`);
    setTimeout(() => setHistoryNotice(null), 4500);
  };

  const handleSelectFrequentFavored = (item: FrequentFavoredItem) => {
    setFavored(item.favored);
    if (!name || name === 'Conta sem nome') {
      setName(item.favored);
    }
    if (item.category) {
      setCategory(item.category);
    }
    if (item.lastAmount && item.lastAmount > 0 && !amount) {
      setAmount(item.lastAmount.toFixed(2).replace('.', ','));
    }
    setHistoryNotice(`⚡ Favorecido "${item.favored}" e histórico carregados!`);
    setTimeout(() => setHistoryNotice(null), 4000);
  };

  const prevIsOpenRef = React.useRef(false);
  const initialBillIdRef = React.useRef<string | undefined>(undefined);

  useEffect(() => {
    const justOpened = isOpen && !prevIsOpenRef.current;
    const billChanged = isOpen && initialBill?.id !== initialBillIdRef.current;

    if (justOpened || billChanged) {
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
        const dueM = (initialBill.dueDate || '').substring(0, 7);
        const payM = initialBill.paymentMonth || '';
        if (payM && payM !== dueM) {
          setCustomPaymentMonthEnabled(true);
          setPaymentMonth(payM);
        } else {
          setCustomPaymentMonthEnabled(false);
          setPaymentMonth(dueM || defaultMonth || '2026-09');
        }
        setNotes(initialBill.notes || '');
        setReceiptName(initialBill.receiptName || '');
        setReceiptUrl(initialBill.receiptUrl || '');
        setReceiptSize(initialBill.receiptSize || '');
        setTotalInstallments(initialBill.totalInstallments || 10);
        setCurrentInstallment(initialBill.installmentNumber || 1);
        setValueIsPerInstallment(true);
        setPixDetectedNotice(null);
        setBarcodeDetectedNotice(null);
        setCategoryNotice(null);
        setApplyToFutureMonths(true);
      } else {
        // Default for new bill
        setName('');
        setAmount('');
        const defaultDate = defaultMonth ? `${defaultMonth}-10` : new Date().toISOString().split('T')[0];
        setDueDate(defaultDate);
        setCategory('Outras Despesas');
        setFavored('');
        setBarcode('');
        setPixKey('');
        setPixType('CNPJ');
        setRecurrence('Mensal Fixa');
        setFixedValueType('fixed_value');
        setCustomPaymentMonthEnabled(false);
        setPaymentMonth(defaultMonth || '2026-09');
        setNotes('');
        setReceiptName('');
        setReceiptUrl('');
        setReceiptSize('');
        setTotalInstallments(10);
        setCurrentInstallment(1);
        setValueIsPerInstallment(true);
        setPixDetectedNotice(null);
        setBarcodeDetectedNotice(null);
        setCategoryNotice(null);
        setApplyToFutureMonths(true);
      }
    }

    prevIsOpenRef.current = isOpen;
    initialBillIdRef.current = initialBill?.id;
  }, [defaultMonth, initialBill?.id, isOpen]);

  // Handler for typing name and auto-detecting category intelligently
  const handleNameChange = (val: string) => {
    setName(val);
    const smart = inferCategoryFromName(val);
    if (smart) {
      setCategory(smart.name);
      setCategoryNotice(`✨ Categoria identificada: ${smart.shortName || smart.name}`);
    }
  };

  const handleFavoredChange = (val: string) => {
    setFavored(val);
    if (!name || name === 'Conta sem nome') {
      const smart = inferCategoryFromName(val);
      if (smart) {
        setCategory(smart.name);
        setCategoryNotice(`✨ Categoria identificada: ${smart.shortName || smart.name}`);
      }
    }
  };

  // Handler for automatic Barcode parsing and filling all fields
  const applyBarcodeDetection = (rawBarcode: string) => {
    if (!rawBarcode) return;
    const cleanDigits = rawBarcode.replace(/[^\d]/g, '');
    setBarcode(cleanDigits.length >= 20 ? cleanDigits : rawBarcode.trim());

    const targetMonth = (dueDate ? dueDate.substring(0, 7) : defaultMonth);
    const parsed = parseBarcodeBoleto(rawBarcode, targetMonth);
    if (parsed.detected) {
      if (parsed.amount && parsed.amount > 0) {
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
      if (parsed.recurrence) {
        setRecurrence(parsed.recurrence);
      }
      if (parsed.fixedValueType) {
        setFixedValueType(parsed.fixedValueType);
      }
      setBarcodeDetectedNotice(parsed.message || '✨ Boleto identificado com sucesso! Nome, Favorecido, Valor e Vencimento preenchidos.');
      setTimeout(() => setBarcodeDetectedNotice(null), 8000);
    }
  };

  const handleClipboardPasteBarcode = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          applyBarcodeDetection(text.trim());
          return;
        }
      }
    } catch {
      // clipboard permission error
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

      // Automatically populate due date from text/barcode/Pix ONLY if found or if dueDate is empty
      if (processed.dueDate) {
        setDueDate(processed.dueDate);
      } else if (parsed.dueDate) {
        setDueDate(parsed.dueDate);
      } else if (!dueDate) {
        const targetMonth = defaultMonth || (new Date().toISOString().slice(0, 7));
        setDueDate(`${targetMonth}-10`);
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

    const effectivePaymentMonth = customPaymentMonthEnabled && paymentMonth && paymentMonth !== (dueDate || '').substring(0, 7)
      ? paymentMonth
      : undefined;

    onSave(
      {
        id: initialBill?.id,
        name: name.trim() || 'Conta sem nome',
        amount: parsedAmount,
        dueDate,
        originalDueDate: initialBill?.originalDueDate || dueDate,
        paymentMonth: effectivePaymentMonth,
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
        applyToFutureMonths,
        previousName: initialBill?.name,
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

          {/* Feedback Notice for Applied History Suggestions */}
          {historyNotice && (
            <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl text-xs font-bold flex items-center justify-between gap-2 shadow-md animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
                <span>{historyNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setHistoryNotice(null)}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Nome da Conta */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Nome da Conta / Despesa *
              </label>
              {categoryNotice && (
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                  {categoryNotice}
                </span>
              )}
            </div>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: Financiamento da Casa, Conta de Luz Enel, Fatura Cartão"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
            />
          </div>

          {/* Empresa / Beneficiário */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Empresa / Favorecido (Para sugestões do histórico)
              </label>
              {favored && (
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  <span>Favorecido</span>
                </span>
              )}
            </div>
            <input
              type="text"
              value={favored}
              onChange={(e) => handleFavoredChange(e.target.value)}
              placeholder="Ex: Caixa Econômica, Enel, Sabesp, Claro, Netflix, Imobiliária"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
            />

            {/* Favorecidos Frequentes (Atalhos rápidos para 1 clique) */}
            {(!favored || favored.length < 2) && frequentFavoreds.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                    <span>Favorecidos Frequentes (toque para carregar histórico):</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {frequentFavoreds.map((item) => (
                    <button
                      key={item.favored}
                      type="button"
                      onClick={() => handleSelectFrequentFavored(item)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-teal-50 dark:bg-slate-800 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 border border-slate-200 dark:border-slate-700 hover:border-teal-300 transition-all flex items-center gap-1.5 flex-shrink-0 active:scale-95 shadow-2xs"
                      title={`Carregar histórico de ${item.favored} (${item.count} pagamentos)`}
                    >
                      <span>{item.favored}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {item.count}x
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SEÇÃO DE SUGESTÕES COM BASE NO HISTÓRICO DE PAGAMENTOS ANTERIORES PARA O MESMO FAVORECIDO */}
          {favoredHistory && (
            <div className="rounded-2xl border-2 border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/70 via-white to-teal-50/50 dark:from-[#111c38] dark:via-[#0e172f] dark:to-[#0f242e] p-3.5 space-y-3 shadow-xs animate-in fade-in duration-200">
              {/* Header do Card com Título e Botão 'Preencher Tudo' */}
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950 dark:text-indigo-200">
                    <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                    <span className="truncate">Histórico de {favoredHistory.matchedFavored}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    {favoredHistory.totalBillsFound} {favoredHistory.totalBillsFound === 1 ? 'pagamento anterior encontrado' : 'pagamentos anteriores encontrados'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleApplyAllFromHistory(favoredHistory)}
                  className="px-2.5 py-1.5 bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 flex-shrink-0"
                  title="Preencher valor, categoria, vencimento e dados com base no histórico"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span>Preencher Tudo</span>
                </button>
              </div>

              {/* Grid de Sugestões de Valores e Categorias */}
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                {/* 1. Sugestão do Último Valor Pago */}
                {favoredHistory.lastAmount !== undefined && favoredHistory.lastAmount > 0 && (
                  <div className="bg-white/90 dark:bg-slate-900/80 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex flex-col justify-between shadow-2xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                        Último Valor Pago
                      </span>
                      <div className="text-sm font-extrabold text-indigo-950 dark:text-indigo-100">
                        R$ {favoredHistory.lastAmount.toFixed(2).replace('.', ',')}
                      </div>
                      {favoredHistory.lastBill?.dueDate && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          Em {getMonthShortPtBr(favoredHistory.lastBill.dueDate.substring(0, 7))}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplySuggestedAmount(favoredHistory.lastAmount!, 'Último')}
                      className="mt-2 w-full py-1 px-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1"
                    >
                      <span>Usar este valor</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* 2. Sugestão da Média Histórica dos Pagamentos */}
                {favoredHistory.averageAmount !== undefined && favoredHistory.averageAmount > 0 && (
                  <div className="bg-white/90 dark:bg-slate-900/80 p-2.5 rounded-xl border border-teal-100 dark:border-teal-900/50 flex flex-col justify-between shadow-2xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                        Média Histórica
                      </span>
                      <div className="text-sm font-extrabold text-teal-950 dark:text-teal-100">
                        R$ {favoredHistory.averageAmount.toFixed(2).replace('.', ',')}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Média de {favoredHistory.totalBillsFound} contas
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplySuggestedAmount(favoredHistory.averageAmount!, 'Média')}
                      className="mt-2 w-full py-1 px-2 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/80 text-teal-700 dark:text-teal-300 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1"
                    >
                      <span>Usar média</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* 3. Sugestão de Categoria Habitual */}
                {favoredHistory.suggestedCategory && (
                  <div className="bg-white/90 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-2xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                        Categoria Habitual
                      </span>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {favoredHistory.suggestedCategory}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Mais usada no histórico
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplySuggestedCategory(favoredHistory.suggestedCategory!)}
                      className={`mt-2 w-full py-1 px-2 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1 ${
                        category === favoredHistory.suggestedCategory
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {category === favoredHistory.suggestedCategory ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Selecionada</span>
                        </>
                      ) : (
                        <>
                          <span>Aplicar</span>
                          <ArrowRight className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* 4. Sugestão do Dia Habitual de Vencimento */}
                {favoredHistory.commonDueDay && (
                  <div className="bg-white/90 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-2xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                        Dia de Vencimento
                      </span>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Todo dia {String(favoredHistory.commonDueDay).padStart(2, '0')}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Dia habitual desta conta
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyDueDay(favoredHistory.commonDueDay!)}
                      className="mt-2 w-full py-1 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1"
                    >
                      <span>Dia {String(favoredHistory.commonDueDay).padStart(2, '0')}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Histórico Recente de Pagamentos (Timeline dos últimos meses) */}
              {favoredHistory.recentRecords && favoredHistory.recentRecords.length > 0 && (
                <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/40">
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center justify-between">
                    <span>Últimos pagamentos anteriores:</span>
                    <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                      Toque no valor para aplicar
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {favoredHistory.recentRecords.map((rec) => (
                      <button
                        key={rec.id}
                        type="button"
                        onClick={() => handleApplySuggestedAmount(rec.amount, rec.monthLabel)}
                        className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-left transition-all flex-shrink-0 active:scale-95 group shadow-2xs"
                        title={`Usar valor R$ ${rec.amount.toFixed(2).replace('.', ',')} de ${rec.monthLabel}`}
                      >
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <span>{rec.monthLabel}</span>
                          {rec.status === 'paid' && (
                            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">✓ Pago</span>
                          )}
                        </div>
                        <div className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                          {rec.formattedAmount}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Reutilizar Chave Pix ou Código de Barras do Histórico */}
              {((favoredHistory.lastPixKey && !pixKey) || (favoredHistory.lastBarcode && !barcode)) && (
                <div className="bg-indigo-50/80 dark:bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-between gap-2">
                  <div className="min-w-0 text-[11px] text-indigo-900 dark:text-indigo-200">
                    <span className="font-bold">🔑 Dados de pagamento salvos: </span>
                    <span className="text-[10.5px] opacity-90 truncate block">
                      {favoredHistory.lastPixKey ? `Pix (${favoredHistory.lastPixType || 'Chave'}): ${favoredHistory.lastPixKey}` : 'Código de barras do último boleto'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (favoredHistory.lastPixKey && !pixKey) {
                        setPixKey(favoredHistory.lastPixKey);
                        if (favoredHistory.lastPixType) setPixType(favoredHistory.lastPixType as any);
                      }
                      if (favoredHistory.lastBarcode && !barcode) {
                        setBarcode(favoredHistory.lastBarcode);
                      }
                      setHistoryNotice('⚡ Dados de pagamento importados do histórico!');
                      setTimeout(() => setHistoryNotice(null), 4000);
                    }}
                    className="px-2.5 py-1 bg-indigo-600 text-white text-[11px] font-bold rounded-lg hover:bg-indigo-700 transition-colors flex-shrink-0 active:scale-95"
                  >
                    Reutilizar
                  </button>
                </div>
              )}
            </div>
          )}

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

          {/* Data de Vencimento com Seletor Rápido de Mês */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Data de Vencimento *
              </label>
              {dueDate && (
                <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                  {(() => {
                    try {
                      const [y, m, d] = dueDate.split('-');
                      const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
                      const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                      return `Mês: ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
                    } catch {
                      return '';
                    }
                  })()}
                </span>
              )}
            </div>

            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
            />

            {/* Quick Month Selector Buttons */}
            <div className="pt-1">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                📅 Trocar mês rapidamente (mantém o dia):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: '2026-09', label: 'Set/26' },
                  { id: '2026-10', label: 'Out/26' },
                  { id: '2026-11', label: 'Nov/26' },
                  { id: '2026-12', label: 'Dez/26' },
                  { id: '2027-01', label: 'Jan/27' },
                  { id: '2027-02', label: 'Fev/27' },
                ].map(item => {
                  const currentMonthId = (dueDate || '').substring(0, 7);
                  const isSelected = currentMonthId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        const currentDay = (dueDate && dueDate.split('-')[2]) ? dueDate.split('-')[2] : '10';
                        const [y, m] = item.id.split('-').map(Number);
                        const maxDays = new Date(y, m, 0).getDate();
                        const safeDay = String(Math.min(parseInt(currentDay, 10), maxDays)).padStart(2, '0');
                        setDueDate(`${item.id}-${safeDay}`);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all active-press ${
                        isSelected
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60'
                      }`}
                    >
                      {item.label}
                      {isSelected && ' ✓'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Confirmation indicator if bill is in a different month */}
            {dueDate && defaultMonth && !dueDate.startsWith(defaultMonth) && !customPaymentMonthEnabled && (
              <div className="p-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-[11px] text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                <span>💡</span>
                <span>
                  Esta conta tem vencimento em{' '}
                  <strong>{dueDate.split('-').reverse().join('/')}</strong> ({getMonthNamePtBr(dueDate.substring(0, 7))}).
                </span>
              </div>
            )}
          </div>

          {/* Opção para pagar antes ou depois (onde a dívida deve aparecer) */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Mês em que vai pagar (onde a conta vai aparecer)</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setCustomPaymentMonthEnabled(false);
                }}
                className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-left flex flex-col justify-between active-press ${
                  !customPaymentMonthEnabled
                    ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                }`}
              >
                <div className="flex items-center gap-1 font-extrabold">
                  <span>{!customPaymentMonthEnabled ? '✓' : '○'}</span>
                  <span>No mês do vencimento</span>
                </div>
                <div className={`text-[11px] mt-1 font-medium truncate ${!customPaymentMonthEnabled ? 'text-teal-100' : 'text-slate-500 dark:text-slate-400'}`}>
                  {getMonthNamePtBr((dueDate || '').substring(0, 7)) || 'Mês do vencimento'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCustomPaymentMonthEnabled(true);
                  if (!paymentMonth || paymentMonth === (dueDate || '').substring(0, 7)) {
                    // Default to current viewed month or next/previous
                    setPaymentMonth(defaultMonth || '2026-09');
                  }
                }}
                className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-left flex flex-col justify-between active-press ${
                  customPaymentMonthEnabled
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                }`}
              >
                <div className="flex items-center gap-1 font-extrabold">
                  <span>{customPaymentMonthEnabled ? '✓' : '○'}</span>
                  <span>Pagar antes ou depois</span>
                </div>
                <div className={`text-[11px] mt-1 font-medium truncate ${customPaymentMonthEnabled ? 'text-amber-100' : 'text-slate-500 dark:text-slate-400'}`}>
                  Escolher outro mês
                </div>
              </button>
            </div>

            {customPaymentMonthEnabled && (
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 space-y-2">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  🗓️ Escolha o mês onde quer pagar (a conta aparecerá lá):
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: '2026-08', label: 'Ago/26' },
                    { id: '2026-09', label: 'Set/26' },
                    { id: '2026-10', label: 'Out/26' },
                    { id: '2026-11', label: 'Nov/26' },
                    { id: '2026-12', label: 'Dez/26' },
                    { id: '2027-01', label: 'Jan/27' },
                    { id: '2027-02', label: 'Fev/27' },
                    { id: '2027-03', label: 'Mar/27' },
                  ].map(item => {
                    const isSelected = paymentMonth === item.id;
                    const dueM = (dueDate || '').substring(0, 7);
                    const isDue = item.id === dueM;
                    const isBefore = item.id < dueM;
                    const isAfter = item.id > dueM;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setPaymentMonth(item.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all active-press flex items-center gap-1 ${
                          isSelected
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <span>{item.label}</span>
                        {isDue && <span className="text-[10px] opacity-80">(Venc.)</span>}
                        {isBefore && !isDue && <span className="text-[10px] opacity-80">(Antes ⚡)</span>}
                        {isAfter && !isDue && <span className="text-[10px] opacity-80">(Depois ⏳)</span>}
                        {isSelected && <span>✓</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Explanatory callout */}
                {(() => {
                  const dueM = (dueDate || '').substring(0, 7);
                  const dueMonthName = getMonthNamePtBr(dueM);
                  const payMonthName = getMonthNamePtBr(paymentMonth);
                  const isBefore = paymentMonth < dueM;
                  const isAfter = paymentMonth > dueM;
                  const formattedDate = (dueDate || '').split('-').reverse().join('/');

                  if (paymentMonth && paymentMonth !== dueM) {
                    return (
                      <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <span>{isBefore ? '⚡' : '⏳'}</span>
                          <span>
                            {isBefore ? 'Pagamento Antecipado' : 'Pagamento Postergado'}
                          </span>
                        </div>
                        <p className="text-[11.5px] leading-relaxed">
                          Esta dívida vence em <strong>{dueMonthName}</strong> ({formattedDate}), mas você programou para pagar no mês de <strong>{payMonthName}</strong>. A conta aparecerá no mês escolhido e o mês de vencimento continuará sempre visível!
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[11px] text-slate-600 dark:text-slate-400">
                      O mês selecionado coincide com o mês do vencimento. A conta aparecerá em {dueMonthName}.
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Categoria */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Categoria
              </label>
              <div className="flex items-center gap-2">
                {onOpenManageCategories && (
                  <button
                    type="button"
                    onClick={onOpenManageCategories}
                    className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 active-press"
                    title="Criar, renomear ou excluir categorias"
                  >
                    <span>⚙️ Gerenciar Categorias</span>
                  </button>
                )}
                {(() => {
                  const info = getCategoryInfo(category);
                  const IconComp = info.icon;
                  return (
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full border ${info.badgeBg} ${info.badgeText} ${info.badgeBorder}`}>
                      <IconComp className={`w-3.5 h-3.5 ${info.iconColor}`} />
                      <span>{info.shortName || info.name}</span>
                    </span>
                  );
                })()}
              </div>
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
            >
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
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
                  e.preventDefault();
                  applyBarcodeDetection(pasted);
                }
              }}
              onChange={(e) => {
                const val = e.target.value;
                setBarcode(val);
                const digits = val.replace(/\D/g, '');
                if (digits.length >= 30) {
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

          {/* Sincronização Automática com Meses Futuros (Dívidas Recorrentes / Parceladas) */}
          {(recurrence === 'Mensal Fixa' || recurrence === 'Parcelada' || initialBill?.recurrence === 'Mensal Fixa' || initialBill?.recurrence === 'Parcelada') && (
            <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 p-3.5 rounded-2xl border border-teal-200 dark:border-teal-800/70 shadow-xs">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="applyToFutureMonths"
                  checked={applyToFutureMonths}
                  onChange={(e) => setApplyToFutureMonths(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-teal-600 rounded border-teal-300 focus:ring-teal-500 cursor-pointer"
                />
                <label htmlFor="applyToFutureMonths" className="text-xs text-slate-700 dark:text-slate-200 cursor-pointer">
                  <span className="font-bold text-teal-900 dark:text-teal-200 block">
                    🔁 Atualizar automaticamente nos próximos meses
                  </span>
                  <span className="text-[11px] text-teal-700 dark:text-teal-300 leading-snug block mt-0.5">
                    {initialBill
                      ? 'Ao alterar o nome, categoria, valor ou favorecido, todos os meses seguintes desta dívida serão atualizados automaticamente sem você precisar fazer nada!'
                      : 'Esta dívida recorrente será replicada automaticamente nos próximos meses.'}
                  </span>
                </label>
              </div>
            </div>
          )}

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
