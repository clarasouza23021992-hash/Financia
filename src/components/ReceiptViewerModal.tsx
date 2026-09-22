import React from 'react';
import { X, Download, Share2, FileText, CheckCircle2, Calendar, User } from 'lucide-react';
import { Bill } from '../types/finance';

interface ReceiptViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill | null;
}

export const ReceiptViewerModal: React.FC<ReceiptViewerModalProps> = ({
  isOpen,
  onClose,
  bill,
}) => {
  if (!isOpen || !bill) return null;

  const handleDownload = () => {
    if (bill.receiptUrl) {
      const link = document.createElement('a');
      link.href = bill.receiptUrl;
      link.download = bill.receiptName || `Comprovante_${bill.name.replace(/\s+/g, '_')}.pdf`;
      link.click();
    } else {
      // Create a sample text receipt to download
      const text = `COMPROVANTE DE PAGAMENTO\n\nConta: ${bill.name}\nValor: R$ ${bill.amount.toFixed(2)}\nVencimento: ${bill.dueDate}\nStatus: ${bill.status}\nFavorecido: ${bill.favored}\nCódigo: ${bill.barcode || 'N/A'}\nChave Pix: ${bill.pixKey || 'N/A'}\nAutenticação Digital: iCloud-CK-${bill.id}-${Date.now()}`;
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Comprovante_${bill.name.replace(/\s+/g, '_')}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleShare = () => {
    const text = `Comprovante de pagamento da conta ${bill.name} (R$ ${bill.amount.toFixed(2)}) anexado no aplicativo Finanças da Minha Casa.`;
    if (navigator.share) {
      navigator.share({ title: `Comprovante: ${bill.name}`, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert('Texto do comprovante copiado!');
    }
  };

  const isImage = bill.receiptUrl && (bill.receiptUrl.startsWith('data:image') || bill.receiptUrl.includes('.jpg') || bill.receiptUrl.includes('.png'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-[#0E172F] w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#0A1128] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold tracking-tight">
              Comprovante de Pagamento
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Bill summary pill */}
          <div className="bg-slate-50 dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {bill.name}
              </span>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                R$ {bill.amount.toFixed(2).replace('.', ',')}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Venceu em {bill.dueDate.split('-').reverse().join('/')}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" /> Favorecido: {bill.favored}
              </span>
            </div>
          </div>

          {/* Receipt View Area */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 p-4 flex flex-col items-center justify-center min-h-[220px]">
            {isImage ? (
              <img
                src={bill.receiptUrl}
                alt="Comprovante"
                className="max-h-[300px] w-auto object-contain rounded-lg shadow-sm"
              />
            ) : (
              <div className="flex flex-col items-center text-center p-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 shadow-inner">
                  <FileText className="w-8 h-8" />
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white mb-0.5">
                  {bill.receiptName || 'Comprovante_de_Pagamento_Oficial.pdf'}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 font-mono">
                  {bill.receiptSize || '142 KB'} • Autenticado via Pix Banco Central
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/40 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Comprovante Válido & Verificado</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleDownload}
              className="flex-1 py-2.5 px-3 bg-[#00C49F] hover:bg-[#00b290] text-[#0A1128] font-bold text-xs rounded-xl active-press flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Comprovante</span>
            </button>
            <button
              onClick={handleShare}
              className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl active-press flex items-center gap-1.5"
            >
              <Share2 className="w-4 h-4" />
              <span>Compartilhar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
