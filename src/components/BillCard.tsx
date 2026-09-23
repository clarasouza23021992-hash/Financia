import React, { useState } from 'react';
import { 
  Copy, Check, Share2, Edit2, Trash2, CheckCircle2, 
  QrCode, Barcode, FileText, Paperclip, Undo2, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Bill } from '../types/finance';
import { getCategoryInfo } from '../utils/categories';

interface BillCardProps {
  bill: Bill;
  onEdit: (bill: Bill) => void;
  onDelete: (id: string) => void;
  onTogglePaid: (bill: Bill) => void;
  onViewReceipt: (bill: Bill) => void;
  onAttachReceipt: (bill: Bill) => void;
}

export const BillCard: React.FC<BillCardProps> = ({
  bill,
  onEdit,
  onDelete,
  onTogglePaid,
  onViewReceipt,
  onAttachReceipt,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, fieldName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareText = `*Conta da Casa: ${bill.name}*\n` +
      `💰 Valor: R$ ${bill.amount.toFixed(2)}\n` +
      `📅 Vencimento: ${bill.dueDate}\n` +
      `🏢 Favorecido: ${bill.favored}\n` +
      (bill.pixKey ? `🔑 Chave Pix (${bill.pixType}): ${bill.pixKey}\n` : '') +
      (bill.barcode ? `📄 Código de Barras: ${bill.barcode}\n` : '') +
      `👥 Divisão: Carlos 50% e Paula 50%`;

    if (navigator.share) {
      navigator.share({ title: bill.name, text: shareText }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Dados da conta copiados para a área de transferência!');
    }
  };

  const categoryInfo = getCategoryInfo(bill.category);
  const CategoryIcon = categoryInfo.icon;

  return (
    <div className={`bg-white dark:bg-[#131D38] rounded-2xl border ${
      bill.status === 'overdue' 
        ? 'border-rose-200 dark:border-rose-900/60 shadow-xs' 
        : bill.status === 'paid'
        ? 'border-emerald-200/80 dark:border-emerald-900/40 opacity-90'
        : 'border-slate-200/80 dark:border-slate-800 shadow-xs'
    } p-4 transition-all w-full max-w-full min-w-0 overflow-hidden`}>
      {/* Top Header: Category Tag & Status Tag */}
      <div className="flex items-start justify-between gap-2 mb-2 w-full min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
          {/* Category Badge with Icon */}
          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5 ${categoryInfo.badgeBg} ${categoryInfo.badgeText} ${categoryInfo.badgeBorder}`}>
            <CategoryIcon className={`w-3.5 h-3.5 shrink-0 ${categoryInfo.iconColor}`} />
            <span className="truncate max-w-[130px] sm:max-w-none">{bill.category}</span>
          </span>

          {/* Carried Over Debt Badge */}
          {bill.isCarriedOver && (
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 dark:bg-purple-950/70 dark:text-purple-200 border border-purple-300 dark:border-purple-800 flex items-center gap-1" title={bill.originalDueDate ? `Vencimento original: ${bill.originalDueDate}` : 'Dívida transferida do mês anterior'}>
              <span>↪️</span>
              <span>Dívida Transferida</span>
            </span>
          )}

          {/* Recurrence Badge (Mensal Fixa) */}
          {bill.recurrence === 'Mensal Fixa' && (
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
              bill.fixedValueType === 'variable_value'
                ? 'bg-blue-100 text-blue-900 dark:bg-blue-950/70 dark:text-blue-200 border border-blue-300 dark:border-blue-800'
                : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
            }`}>
              <span>🔁</span>
              <span>{bill.fixedValueType === 'variable_value' ? 'Mensal (Variável)' : 'Mensal (Fixo)'}</span>
            </span>
          )}

          {/* Installment Badge (Parcelada) */}
          {(bill.recurrence === 'Parcelada' || bill.installmentNumber) && (
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
              <span>🗓️</span>
              {bill.installmentNumber && bill.totalInstallments
                ? `Parcela ${bill.installmentNumber} de ${bill.totalInstallments}`
                : 'Parcelada'}
              {bill.endMonth ? ` • Até ${bill.endMonth}` : ''}
            </span>
          )}

          {/* Status Badge with Smooth Motion Transition Animation */}
          <AnimatePresence mode="wait" initial={false}>
            {bill.status === 'overdue' && (
              <motion.span
                key="overdue"
                initial={{ opacity: 0, scale: 0.88, y: -2 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.88, y: 2 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-400 border border-rose-300 dark:border-rose-800 flex items-center gap-1 shrink-0"
              >
                <span>⚠️</span> Atrasado
              </motion.span>
            )}
            {bill.status === 'pending' && (
              <motion.span
                key={`pending-${bill.dueDate}`}
                initial={{ opacity: 0, scale: 0.88, y: -2 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.88, y: 2 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${
                  bill.dueDate.endsWith('17')
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bold'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {bill.dueDate.endsWith('17') ? (
                  <>
                    <span>⏰</span> <span>Vence Hoje!</span>
                  </>
                ) : (
                  <span>Vence em {bill.dueDate.split('-').reverse().slice(0, 2).join('/')}</span>
                )}
              </motion.span>
            )}
            {bill.status === 'paid' && (
              <motion.span
                key="paid"
                initial={{ opacity: 0, scale: 0.88, y: -2 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.88, y: 2 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 shadow-xs shrink-0"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Pago</span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Amount & Copy Amount Button */}
        <div className="text-right flex-shrink-0">
          <div className="text-[19px] font-black text-slate-900 dark:text-white tracking-tight leading-none">
            R$ {bill.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <button
            onClick={(e) => copyToClipboard(`R$ ${bill.amount.toFixed(2)}`, 'amount', e)}
            className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mt-1"
          >
            {copiedField === 'amount' ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                <Check className="w-3 h-3" /> Copiado
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Copy className="w-3 h-3" /> Copiar R$
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Bill Name & Favored */}
      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-0.5">
        {bill.name}
      </h3>
      <div className="text-xs text-slate-500 dark:text-slate-400 mb-2.5">
        Favorecido: <span className="font-medium text-slate-700 dark:text-slate-300">{bill.favored}</span>
      </div>

      {/* Tip / Reminder Callout (Light Bulb Box) */}
      {bill.notes && (
        <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded-xl p-2.5 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2 mb-3">
          <span className="text-sm">💡</span>
          <span className="leading-snug">{bill.notes}</span>
        </div>
      )}

      {/* CÓDIGO DE BARRAS / BOLETO BOX */}
      {bill.barcode && (
        <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 mb-2 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 tracking-wider">
              <Barcode className="w-3.5 h-3.5" />
              <span>CÓDIGO DE BARRAS / BOLETO</span>
            </div>
            <div className="text-[11px] font-mono text-slate-800 dark:text-slate-200 truncate mt-0.5 select-all">
              {bill.barcode}
            </div>
          </div>
          <button
            onClick={(e) => copyToClipboard(bill.barcode, 'barcode', e)}
            className="flex-shrink-0 px-3 py-1.5 bg-slate-900 dark:bg-slate-700 hover:bg-black text-white text-xs font-semibold rounded-lg active-press flex items-center gap-1 shadow-xs"
          >
            {copiedField === 'barcode' ? (
              <>
                <Check className="w-3 h-3 text-teal-400" />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copiar Código</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* CHAVE PIX BOX */}
      {bill.pixKey && (
        <div className="bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/50 rounded-xl p-2.5 mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-teal-700 dark:text-teal-400 tracking-wider">
              <QrCode className="w-3.5 h-3.5" />
              <span>CHAVE PIX ({bill.pixType})</span>
            </div>
            <div className="text-[11px] font-mono font-medium text-slate-800 dark:text-slate-200 truncate mt-0.5 select-all">
              {bill.pixKey}
            </div>
          </div>
          <button
            onClick={(e) => copyToClipboard(bill.pixKey, 'pix', e)}
            className="flex-shrink-0 px-3 py-1.5 bg-[#00C49F] hover:bg-[#00b290] text-[#0A1128] text-xs font-bold rounded-lg active-press flex items-center gap-1 shadow-xs"
          >
            {copiedField === 'pix' ? (
              <>
                <Check className="w-3 h-3 text-slate-900" />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copiar Pix</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Comprovante de Pagamento Attachment Indicator & Compact Audit Trail */}
      <div className="flex items-center justify-between pt-1.5 pb-2 border-t border-slate-100 dark:border-slate-800/80 mb-2 gap-1.5 text-xs w-full min-w-0 max-w-full overflow-hidden">
        <div className="min-w-0 flex-1 overflow-hidden">
          {bill.receiptName ? (
            <button
              id={`btn-view-receipt-${bill.id}`}
              onClick={() => onViewReceipt(bill)}
              className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:underline active-press min-w-0 max-w-full truncate"
              title="Visualizar Comprovante Anexado"
            >
              <Eye className="w-3.5 h-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
              <span className="font-bold underline shrink-0">Comprovante</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-normal">
                ({bill.receiptName})
              </span>
            </button>
          ) : (
            <button
              id={`btn-attach-receipt-${bill.id}`}
              onClick={() => onAttachReceipt(bill)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 active-press min-w-0 truncate"
            >
              <Paperclip className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">+ Comprovante</span>
            </button>
          )}
        </div>
        
        {/* Mostra data e hora de alteração de forma ultra-compacta e discreta, sem esticar a largura da tela */}
        {Boolean(bill.isEdited && bill.lastEditedAt) ? (
          <div 
            className="flex items-center gap-1 text-[10px] text-amber-800 dark:text-amber-300 font-mono bg-amber-50/90 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200/70 dark:border-amber-900/50 shrink-0 whitespace-nowrap"
            title={`Alterado por ${bill.updatedByDevice || 'Carlos'} em ${(() => {
              try {
                const d = new Date(bill.lastEditedAt!);
                return isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR');
              } catch {
                return '';
              }
            })()}`}
          >
            <span className="text-[9px]">✏️</span>
            <span className="font-semibold">Editado</span>
            <span className="text-slate-500 dark:text-slate-400 font-normal">
              {(() => {
                try {
                  const d = new Date(bill.lastEditedAt!);
                  if (!isNaN(d.getTime())) {
                    const day = String(d.getDate()).padStart(2, '0');
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const hours = String(d.getHours()).padStart(2, '0');
                    const minutes = String(d.getMinutes()).padStart(2, '0');
                    return `${day}/${month} ${hours}:${minutes}`;
                  }
                } catch {
                  // ignore
                }
                return '';
              })()}
            </span>
          </div>
        ) : (
          <div className="shrink-0" />
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between gap-2 pt-1">
        {/* Primary Status Toggle Button */}
        {bill.status === 'paid' ? (
          <button
            onClick={() => onTogglePaid(bill)}
            className="flex-1 py-2 px-3 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-xl active-press flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Conta Paga (Desfazer)</span>
          </button>
        ) : (
          <button
            onClick={() => onTogglePaid(bill)}
            className="flex-1 py-2.5 px-3 bg-[#00C49F] hover:bg-[#00b290] text-[#0A1128] text-xs font-extrabold rounded-xl active-press flex items-center justify-center gap-1.5 shadow-sm shadow-teal-500/20"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Marcar como Pago</span>
          </button>
        )}

        {/* Secondary Icons (Share, Edit, Delete) */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleShare}
            title="Compartilhar"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 active-press"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(bill)}
            title="Editar Conta"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 active-press"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(bill.id)}
            title="Excluir Conta"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 active-press"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
