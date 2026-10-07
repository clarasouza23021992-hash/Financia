import React, { useState } from 'react';
import { 
  Copy, Check, Share2, Edit2, Trash2, CheckCircle2, 
  QrCode, Barcode, FileText, Paperclip, Undo2, Eye, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Bill, getBillEffectiveMonth, isBillRescheduled, getMonthNamePtBr, getMonthShortPtBr } from '../types/finance';
import { getCategoryInfo } from '../utils/categories';
import { cloudkit } from '../services/cloudkitSync';

interface BillCardProps {
  bill: Bill;
  onEdit: (bill: Bill) => void;
  onDelete: (bill: Bill) => void;
  onTogglePaid: (bill: Bill) => void;
  onViewReceipt: (bill: Bill) => void;
  onAttachReceipt: (bill: Bill) => void;
  onMoveMonth?: (bill: Bill, targetMonth: string) => void;
  onRestoreDueMonth?: (bill: Bill) => void;
}

export const BillCard: React.FC<BillCardProps> = ({
  bill,
  onEdit,
  onDelete,
  onTogglePaid,
  onViewReceipt,
  onAttachReceipt,
  onMoveMonth,
  onRestoreDueMonth,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

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
      `👥 Divisão: Casal 50% / 50%`;

    if (navigator.share) {
      navigator.share({ title: bill.name, text: shareText }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Dados da conta copiados para a área de transferência!');
    }
  };

  const categoryInfo = getCategoryInfo(bill.category);
  const CategoryIcon = categoryInfo.icon;

  const dueMonth = (bill.dueDate || '').substring(0, 7);
  const effectiveMonth = getBillEffectiveMonth(bill);
  const isRescheduled = Boolean(bill.paymentMonth && effectiveMonth !== dueMonth);
  const isPaidEarly = isRescheduled && effectiveMonth < dueMonth;
  const isPaidLater = isRescheduled && effectiveMonth > dueMonth;
  const formattedDueDate = bill.dueDate ? bill.dueDate.split('-').reverse().join('/') : '';
  const dueDayMonth = bill.dueDate ? bill.dueDate.split('-').reverse().slice(0, 2).join('/') : '';

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
              <motion.button
                type="button"
                onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                key={`pending-${bill.dueDate}`}
                initial={{ opacity: 0, scale: 0.88, y: -2 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.88, y: 2 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                title="Clique para escolher em qual mês quer pagar esta conta"
                className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0 active-press hover:opacity-85 cursor-pointer ${
                  bill.dueDate.endsWith('17')
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bold'
                    : isRescheduled
                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 font-bold'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>📅 Vence em {dueDayMonth} ({getMonthShortPtBr(dueMonth)})</span>
              </motion.button>
            )}
            {bill.status === 'paid' && (
              <motion.button
                type="button"
                key="paid"
                initial={{ opacity: 0, scale: 0.88, y: -2 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.88, y: 2 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePaid(bill);
                }}
                title="Conta marcada como paga. Toque para desfazer e voltar para pendente."
                className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 shadow-xs shrink-0 hover:bg-emerald-200 dark:hover:bg-emerald-900 cursor-pointer active-press transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Pago (Desfazer)</span>
              </motion.button>
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
            title="Copiar valor exato"
          >
            {copiedField === 'amount' ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                <Check className="w-3 h-3" /> Copiado!
              </span>
            ) : (
              <span className="flex items-center gap-0.5">
                <Copy className="w-3 h-3" /> Copiar
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Banner Informativo se a conta foi programada para pagar em outro mês (Antecipada ou Adiada) */}
      {isRescheduled && (
        <div className={`mt-1.5 mb-2.5 p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
          isPaidEarly
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
            : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
        }`}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-base shrink-0">{isPaidEarly ? '⚡' : '⏳'}</span>
            <div className="min-w-0">
              <span className="font-extrabold block text-xs">
                {isPaidEarly
                  ? `Conta Antecipada para pagar em ${getMonthShortPtBr(effectiveMonth)}!`
                  : `Conta Adiada para pagar em ${getMonthShortPtBr(effectiveMonth)}!`}
              </span>
              <span className="text-[11px] opacity-85 block truncate mt-0.5">
                Vencimento original: <strong>{formattedDueDate}</strong> ({getMonthNamePtBr(dueMonth)})
              </span>
            </div>
          </div>
          {onRestoreDueMonth && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRestoreDueMonth(bill);
              }}
              title="Voltar a conta para o mês de vencimento original"
              className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-[10.5px] shrink-0 active-press shadow-2xs"
            >
              ↩️ Restaurar p/ {getMonthShortPtBr(dueMonth)}
            </button>
          )}
        </div>
      )}

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
        
        {/* Identificação de quem fez a alteração / registrou a dívida (Ultra compacto, sem aumentar o tamanho da tela) */}
        {(() => {
          const rawActor = (bill.lastEditedBy || (bill.status === 'paid' ? bill.paidBy : '') || bill.updatedByDevice || '').trim();
          const lower = rawActor.toLowerCase();

          const wifeName = cloudkit.getWifeName();
          const wifeLower = wifeName.toLowerCase();
          const titularName = cloudkit.getTitularName();

          // Identifica QUEM FOI DE FATO (reconhece a esposa e Carlos com precisão)
          let displayName = titularName;
          let isWife = false;

          if (lower.includes(wifeLower) || lower.includes('esposa') || lower.includes('cônjuge') || lower.includes('clara') || lower.includes('paula')) {
            displayName = wifeName;
            isWife = true;
          } else if (lower.includes('carlos') || lower.includes('você') || lower.includes('titular') || lower.includes('meu')) {
            displayName = titularName;
            isWife = false;
          } else if (rawActor && !/iphone|android|celular|computador|smartphone|dispositivo|dev_/i.test(rawActor)) {
            displayName = rawActor.trim();
            isWife = false;
          }

          // Data e hora exatas da alteração/pagamento/criação (DD/MM HH:mm)
          let dateStr = '';
          let timeStr = '';
          const dateSource = bill.lastEditedAt || bill.paidAt || bill.updatedAt;
          if (dateSource) {
            try {
              const d = new Date(dateSource);
              if (!isNaN(d.getTime())) {
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const hours = String(d.getHours()).padStart(2, '0');
                const minutes = String(d.getMinutes()).padStart(2, '0');
                dateStr = `${day}/${month}`;
                timeStr = `${hours}:${minutes}`;
              }
            } catch {}
          }

          // Fallback caso seja dívida legada sem timestamp
          if (!dateStr || !timeStr) {
            const d = new Date();
            dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
            timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          }

          const isPaid = bill.status === 'paid';
          const isEdited = Boolean(bill.isEdited && bill.lastEditedAt);
          
          let icon = isWife ? '👩🏻' : '👤';
          let actionLabel = 'Cadastrado por';
          let badgeStyle = isWife
            ? 'bg-pink-50/90 dark:bg-pink-950/40 text-pink-900 dark:text-pink-300 border-pink-200/80 dark:border-pink-800/60'
            : 'bg-slate-100/90 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/60';

          if (isPaid) {
            icon = '✅';
            actionLabel = 'Pago por';
            badgeStyle = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60';
          } else if (isEdited) {
            icon = isWife ? '👩🏻' : '✏️';
            actionLabel = bill.lastActionDescription || 'Alterado por';
            badgeStyle = isWife
              ? 'bg-pink-50/90 dark:bg-pink-950/40 text-pink-900 dark:text-pink-300 border-pink-200/80 dark:border-pink-800/60'
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-amber-200/80 dark:border-amber-900/60';
          }

          const tooltip = `${actionLabel} ${displayName} em ${dateStr} às ${timeStr}`;

          return (
            <div
              className={`inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-md border shrink-0 whitespace-nowrap font-medium shadow-2xs ${badgeStyle}`}
              title={tooltip}
            >
              <span className="text-[10px] shrink-0 leading-none">{icon}</span>
              <span className="font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
                {displayName}
              </span>
              <span className="text-[9.5px] opacity-80 font-mono leading-none tracking-tight">
                • {dateStr} {timeStr}
              </span>
            </div>
          );
        })()}
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

        {/* Secondary Icons (Share, Move Month, Edit, Delete) */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleShare}
            title="Compartilhar"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 active-press"
          >
            <Share2 className="w-4 h-4" />
          </button>
          {onMoveMonth && (
            <button
              onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
              title="Mudar mês de vencimento"
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors active-press ${
                isMonthPickerOpen
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onEdit(bill)}
            title="Editar Conta"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 active-press"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(bill)}
            title="Excluir Conta"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 active-press"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Month Switcher Popover Tray */}
      {isMonthPickerOpen && onMoveMonth && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-800/80 space-y-2"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11.5px] font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <span>🗓️</span> Em qual mês você quer pagar/visualizar esta conta?
              </span>
              <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block mt-0.5">
                Vencimento oficial permanecerá: <strong>{formattedDueDate}</strong> ({getMonthNamePtBr(dueMonth)})
              </span>
            </div>
            <button
              onClick={() => setIsMonthPickerOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-600 font-bold px-1.5 py-0.5"
            >
              ✕
            </button>
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
            ].map(m => {
              const isCurrentDisplayMonth = effectiveMonth === m.id;
              const isDueMonth = dueMonth === m.id;
              const isBeforeDue = m.id < dueMonth;
              const isAfterDue = m.id > dueMonth;

              return (
                <button
                  key={m.id}
                  onClick={() => {
                    onMoveMonth(bill, m.id);
                    setIsMonthPickerOpen(false);
                  }}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all active-press flex items-center gap-1 ${
                    isCurrentDisplayMonth
                      ? 'bg-amber-600 text-white shadow-xs'
                      : isDueMonth
                      ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 border border-teal-300 dark:border-teal-700 hover:bg-teal-100'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>{m.label}</span>
                  {isDueMonth && <span className="text-[10px] opacity-80">(Venc.)</span>}
                  {isBeforeDue && !isDueMonth && <span className="text-[10px] opacity-80">(Antes ⚡)</span>}
                  {isAfterDue && !isDueMonth && <span className="text-[10px] opacity-80">(Depois ⏳)</span>}
                  {isCurrentDisplayMonth && <span>✓ Exibindo</span>}
                </button>
              );
            })}
          </div>

          {isRescheduled && onRestoreDueMonth && (
            <div className="pt-1 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  onRestoreDueMonth(bill);
                  setIsMonthPickerOpen(false);
                }}
                className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
              >
                <span>↩️ Restaurar para aparecer no mês de vencimento ({getMonthShortPtBr(dueMonth)})</span>
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};
