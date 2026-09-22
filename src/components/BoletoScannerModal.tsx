import React, { useState } from 'react';
import { X, Camera, ScanLine, Sparkles, CheckCircle2, ArrowRight, ClipboardCopy, Building2, Calendar, DollarSign } from 'lucide-react';
import { Bill } from '../types/finance';
import { parseScannedBoletoOrPix } from '../utils/pixParser';

interface BoletoScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBoletoScanned: (data: Partial<Bill>) => void;
  fallbackMonth?: string;
}

export const BoletoScannerModal: React.FC<BoletoScannerModalProps> = ({
  isOpen,
  onClose,
  onBoletoScanned,
  fallbackMonth = '2026-09',
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<Partial<Bill> | null>(null);
  const [rawPastedText, setRawPastedText] = useState('');

  if (!isOpen) return null;

  const handleProcessPasted = () => {
    if (!rawPastedText.trim()) return;
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      const processed = parseScannedBoletoOrPix(rawPastedText, fallbackMonth);
      setScannedResult(processed as Partial<Bill>);
    }, 400);
  };

  const simulateScan = (type: 'sabesp' | 'condominio' | 'vivo') => {
    setIsScanning(true);
    setScannedResult(null);

    setTimeout(() => {
      setIsScanning(false);
      if (type === 'sabesp') {
        const raw = {
          name: 'Conta de Água e Esgoto (Sabesp)',
          amount: 88.50,
          dueDate: `${fallbackMonth}-24`,
          category: 'Água, Luz & Gás',
          favored: 'Sabesp - Cia de Saneamento Básico SP',
          barcode: '836000000018 885001380004 000192837465 1',
          pixKey: 'financeiro@sabesp.sp.gov.br',
          pixType: 'E-mail' as const,
          notes: 'Leitura IA: Hidrômetro 14m³ consumidos. Sem juros até o vencimento.',
          recurrence: 'Mensal Fixa' as const,
          splitHousehold: false,
        };
        setScannedResult(parseScannedBoletoOrPix(raw, fallbackMonth) as Partial<Bill>);
      } else if (type === 'vivo') {
        const raw = {
          name: 'Vivo Fibra Residencial 500 Mega',
          amount: 119.99,
          dueDate: `${fallbackMonth}-21`,
          category: 'Moradia & Condomínio',
          favored: 'Telefônica Brasil S.A. (Vivo)',
          barcode: '23793.38128 60032.190284 31000.123456 8',
          pixKey: 'pix.vivo@telefonica.com',
          pixType: 'E-mail' as const,
          notes: 'Plano com desconto fidelidade aplicado.',
          recurrence: 'Mensal Fixa' as const,
          splitHousehold: false,
        };
        setScannedResult(parseScannedBoletoOrPix(raw, fallbackMonth) as Partial<Bill>);
      } else {
        const raw = {
          name: 'Taxa Condominial Extra (Fundo Reserva)',
          amount: 150.00,
          dueDate: `${fallbackMonth}-20`,
          category: 'Moradia & Condomínio',
          favored: 'Condomínio Residencial Parque dos Ipês',
          barcode: '34191.09001 02043.510047 91020.150008 5',
          pixKey: '04.999.888/0001-12',
          pixType: 'CNPJ' as const,
          notes: 'Chamada de capital para reforma da portaria eletrônica.',
          recurrence: 'Parcelada' as const,
          splitHousehold: false,
        };
        setScannedResult(parseScannedBoletoOrPix(raw, fallbackMonth) as Partial<Bill>);
      }
    }, 600);
  };

  const handleApply = () => {
    if (scannedResult) {
      onBoletoScanned(scannedResult);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-[#0E172F] w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#0A1128] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-[#FFD166]">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                Ler Boleto ou Pix com IA
              </h2>
              <p className="text-[11px] text-slate-400">
                Extração inteligente de linha digitável, valor e favorecido
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Scanner Viewfinder Simulation */}
          <div className="relative h-48 bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-700 flex flex-col items-center justify-center text-white p-4">
            {/* Corner brackets */}
            <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-amber-400"></div>
            <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-amber-400"></div>
            <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-amber-400"></div>
            <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-amber-400"></div>

            {/* Scanning line animation */}
            {isScanning && (
              <div className="absolute inset-x-0 h-1 bg-amber-400/80 shadow-lg shadow-amber-400 animate-bounce"></div>
            )}

            <Camera className="w-8 h-8 text-slate-400 mb-2" />
            <span className="text-xs font-semibold text-slate-300">
              {isScanning ? 'Analisando documento com IA...' : 'Aponte a câmera para o código de barras ou QR Pix'}
            </span>
          </div>

          {/* Quick simulated scans */}
          <div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Ou selecione um exemplo para testar:
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => simulateScan('sabesp')}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:border-amber-400 text-left active-press"
              >
                <div className="text-[11px] font-bold text-slate-900 dark:text-white truncate">💧 Sabesp</div>
                <div className="text-[10px] text-slate-500">R$ 88,50</div>
              </button>
              <button
                type="button"
                onClick={() => simulateScan('vivo')}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:border-amber-400 text-left active-press"
              >
                <div className="text-[11px] font-bold text-slate-900 dark:text-white truncate">📶 Vivo Fibra</div>
                <div className="text-[10px] text-slate-500">R$ 119,99</div>
              </button>
              <button
                type="button"
                onClick={() => simulateScan('condominio')}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:border-amber-400 text-left active-press"
              >
                <div className="text-[11px] font-bold text-slate-900 dark:text-white truncate">🏢 Condomínio</div>
                <div className="text-[10px] text-slate-500">R$ 150,00</div>
              </button>
            </div>
          </div>

          {/* Paste Pix or Boleto Text Area */}
          <div className="bg-slate-50 dark:bg-slate-900/90 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ClipboardCopy className="w-3.5 h-3.5 text-amber-500" />
                Colar Texto de Boleto, Pix ou Linha Digitável:
              </span>
              {rawPastedText && (
                <button
                  type="button"
                  onClick={() => setRawPastedText('')}
                  className="text-[10px] text-slate-400 hover:text-slate-600"
                >
                  Limpar
                </button>
              )}
            </div>
            <textarea
              value={rawPastedText}
              onChange={(e) => setRawPastedText(e.target.value)}
              placeholder="Cole aqui o texto recebido no WhatsApp/E-mail, Pix Copia e Cola, ou linha digitável (Ex: Sabesp R$ 88,50 Vencimento 24/09/2026)..."
              rows={2}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131D38] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
            <button
              type="button"
              onClick={handleProcessPasted}
              disabled={!rawPastedText.trim() || isScanning}
              className="w-full py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 active-press transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Extrair Empresa, Valor e Vencimento com IA</span>
            </button>
          </div>

          {/* Scanned Result Preview */}
          {scannedResult && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Dados Extraídos com Separação Rigorosa
                </span>
                <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                  Pronto para o Formulário
                </span>
              </div>

              {/* Grid with clearly separated company, amount, and due date */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* 1. Empresa / Favorecido (Separado do valor) */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1 uppercase">
                    <Building2 className="w-3 h-3 text-blue-500" />
                    Empresa / Favorecido:
                  </span>
                  <div className="font-extrabold text-slate-900 dark:text-white mt-0.5 truncate" title={scannedResult.favored}>
                    {scannedResult.favored || 'Não especificado'}
                  </div>
                </div>

                {/* 2. Valor Total (Separado da empresa) */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1 uppercase">
                    <DollarSign className="w-3 h-3 text-emerald-500" />
                    Valor Total:
                  </span>
                  <div className="font-black text-emerald-600 dark:text-emerald-400 mt-0.5 text-sm">
                    R$ {scannedResult.amount ? scannedResult.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                  </div>
                </div>

                {/* 3. Data de Vencimento Extraída */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 col-span-2 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1 uppercase">
                    <Calendar className="w-3 h-3 text-amber-500" />
                    Vencimento Extraído do Texto:
                  </span>
                  <div className="font-extrabold text-amber-700 dark:text-amber-400">
                    {scannedResult.dueDate ? scannedResult.dueDate.split('-').reverse().join('/') : 'A definir'}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 dark:text-slate-300">
                <span className="font-bold text-slate-900 dark:text-white">Nome da Conta:</span> {scannedResult.name}
              </div>

              {scannedResult.barcode && (
                <div className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-lg truncate">
                  {scannedResult.barcode}
                </div>
              )}

              {scannedResult.pixKey && (
                <div className="text-[10px] font-mono text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 p-1.5 rounded-lg truncate">
                  Pix: {scannedResult.pixKey} ({scannedResult.pixType || 'Chave'})
                </div>
              )}

              <button
                type="button"
                onClick={handleApply}
                className="w-full mt-2 py-2.5 bg-[#00C49F] hover:bg-[#00b290] text-[#0A1128] font-bold text-xs rounded-xl active-press flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Usar estes dados e Preencher Formulário</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
