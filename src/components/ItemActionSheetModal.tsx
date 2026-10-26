import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Edit2, Trash2, CheckCircle2, RotateCcw, Share2, 
  Calendar, FileText, Paperclip, Copy, SlidersHorizontal, 
  Sparkles, ExternalLink, ArrowRight, Check
} from 'lucide-react';
import { Bill, Revenue } from '../types/finance';

export type ActionSheetTarget =
  | { type: 'bill'; data: Bill }
  | { type: 'revenue'; data: Revenue }
  | { type: 'quick_action'; data: { id: string; label: string; icon: string; description: string } };

interface ItemActionSheetModalProps {
  target: ActionSheetTarget | null;
  onClose: () => void;
  // Bill actions
  onEditBill?: (bill: Bill) => void;
  onDeleteBill?: (bill: Bill) => void;
  onTogglePaidBill?: (bill: Bill) => void;
  onViewReceiptBill?: (bill: Bill) => void;
  onAttachReceiptBill?: (bill: Bill) => void;
  onShareBill?: (bill: Bill) => void;
  onMoveMonthBill?: (bill: Bill) => void;
  // Revenue actions
  onEditRevenue?: (rev: Revenue) => void;
  onDeleteRevenue?: (rev: Revenue) => void;
  // Quick Action actions
  onExecuteQuickAction?: (actionId: string) => void;
  onOpenReorderQuickActions?: () => void;
}

export const ItemActionSheetModal: React.FC<ItemActionSheetModalProps> = ({
  target,
  onClose,
  onEditBill,
  onDeleteBill,
  onTogglePaidBill,
  onViewReceiptBill,
  onAttachReceiptBill,
  onShareBill,
  onMoveMonthBill,
  onEditRevenue,
  onDeleteRevenue,
  onExecuteQuickAction,
  onOpenReorderQuickActions,
}) => {
  const [copiedCode, setCopiedCode] = React.useState(false);

  if (!target) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => {
      setCopiedCode(false);
      onClose();
    }, 900);
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-xs p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-[#0E172F] w-full max-w-lg rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-5 flex flex-col max-h-[88dvh] overflow-hidden"
        >
          {/* Top Drag Indicator for mobile */}
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3 shrink-0" />

          {/* Header depending on target type */}
          {target.type === 'bill' && (() => {
            const bill = target.data;
            const isPaid = bill.status === 'paid';
            return (
              <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    isPaid 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-teal-500/15 text-teal-400'
                  }`}>
                    {isPaid ? <CheckCircle2 className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
                        {bill.name}
                      </h3>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                        isPaid
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                      }`}>
                        {isPaid ? 'Liquidada ✓' : 'Pendente'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      R$ {bill.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} • Vence {bill.dueDate.split('-').reverse().join('/')}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            );
          })()}

          {target.type === 'revenue' && (() => {
            const rev = target.data;
            return (
              <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 text-xl">
                    💰
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
                      {rev.name}
                    </h3>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                      + R$ {rev.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} • {rev.profileName || 'Família'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            );
          })()}

          {target.type === 'quick_action' && (() => {
            const act = target.data;
            return (
              <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                    <SlidersHorizontal className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
                      {act.label}
                    </h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {act.description}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            );
          })()}

          {/* Action List Container */}
          <div className="py-2 space-y-1.5 overflow-y-auto flex-1">
            {/* BILL ACTIONS */}
            {target.type === 'bill' && (() => {
              const bill = target.data;
              const isPaid = bill.status === 'paid';
              return (
                <>
                  {/* 1. Toggle Paid */}
                  {onTogglePaidBill && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onTogglePaidBill(bill);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-colors cursor-pointer ${
                        isPaid
                          ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isPaid ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'
                      }`}>
                        {isPaid ? <RotateCcw className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-black">
                          {isPaid ? 'Desfazer Pagamento (Voltar p/ Pendente)' : 'Marcar como Paga (Liquidar Dívida)'}
                        </div>
                        <div className="text-[10.5px] opacity-80">
                          {isPaid ? 'Reabre esta conta no mês atual' : 'Atualiza saldo do casal e notifica aparelhos'}
                        </div>
                      </div>
                    </button>
                  )}

                  {/* 2. Edit Bill */}
                  {onEditBill && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onEditBill(bill);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-800 dark:text-slate-200 text-left transition-colors cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                        <Edit2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-bold">Editar Dados da Conta</div>
                        <div className="text-[10.5px] text-slate-500 dark:text-slate-400">Alterar valor, nome, vencimento ou categoria</div>
                      </div>
                    </button>
                  )}

                  {/* 3. Move Month */}
                  {onMoveMonthBill && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onMoveMonthBill(bill);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-800 dark:text-slate-200 text-left transition-colors cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 text-indigo-500 flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-bold">Mudar Mês de Pagamento</div>
                        <div className="text-[10.5px] text-slate-500 dark:text-slate-400">Antecipar ou adiar conta para outro mês</div>
                      </div>
                    </button>
                  )}

                  {/* 4. Receipt */}
                  {bill.receiptUrl ? (
                    onViewReceiptBill && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onViewReceiptBill(bill);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-800 dark:text-slate-200 text-left transition-colors cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 text-emerald-500 flex items-center justify-center shrink-0">
                          <Paperclip className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-bold">Visualizar Comprovante Anexado</div>
                          <div className="text-[10.5px] text-slate-500 dark:text-slate-400">Ver foto ou PDF do pagamento</div>
                        </div>
                      </button>
                    )
                  ) : (
                    onAttachReceiptBill && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onAttachReceiptBill(bill);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-800 dark:text-slate-200 text-left transition-colors cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 text-teal-500 flex items-center justify-center shrink-0">
                          <Paperclip className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-bold">Anexar Comprovante / Print</div>
                          <div className="text-[10.5px] text-slate-500 dark:text-slate-400">Salvar comprovante oficial no histórico</div>
                        </div>
                      </button>
                    )
                  )}

                  {/* 5. Share */}
                  {onShareBill && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onShareBill(bill);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-800 dark:text-slate-200 text-left transition-colors cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 text-emerald-500 flex items-center justify-center shrink-0">
                        <Share2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-bold">Compartilhar no WhatsApp</div>
                        <div className="text-[10.5px] text-slate-500 dark:text-slate-400">Enviar resumo da dívida para o cônjuge</div>
                      </div>
                    </button>
                  )}

                  {/* 6. Copy Code if barcode or pix is present */}
                  {(bill.barcode || bill.pixKey) && (
                    <button
                      type="button"
                      onClick={() => handleCopy(bill.barcode || bill.pixKey || '')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-800 dark:text-slate-200 text-left transition-colors cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 text-cyan-500 flex items-center justify-center shrink-0">
                        {copiedCode ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-bold">
                          {copiedCode ? 'Código Copiado com Sucesso!' : bill.barcode ? 'Copiar Linha Digitável / Boleto' : 'Copiar Chave Pix'}
                        </div>
                        <div className="text-[10.5px] text-slate-500 dark:text-slate-400">
                          {bill.barcode || bill.pixKey}
                        </div>
                      </div>
                    </button>
                  )}

                  {/* 7. Delete Bill (Danger) */}
                  {onDeleteBill && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onDeleteBill(bill);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-left transition-colors cursor-pointer border border-rose-200/60 dark:border-rose-900/40"
                    >
                      <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-black">Excluir Dívida</div>
                        <div className="text-[10.5px] opacity-80">Remover esta conta do mês ou da série fixa</div>
                      </div>
                    </button>
                  )}
                </>
              );
            })()}

            {/* REVENUE ACTIONS */}
            {target.type === 'revenue' && (() => {
              const rev = target.data;
              return (
                <>
                  {onEditRevenue && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onEditRevenue(rev);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-800 dark:text-slate-200 text-left transition-colors cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 text-emerald-500 flex items-center justify-center shrink-0">
                        <Edit2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-bold">Editar Receita</div>
                        <div className="text-[10.5px] text-slate-500 dark:text-slate-400">Alterar valor, titular ou recorrência</div>
                      </div>
                    </button>
                  )}

                  {onDeleteRevenue && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onDeleteRevenue(rev);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-left transition-colors cursor-pointer border border-rose-200/60 dark:border-rose-900/40"
                    >
                      <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-black">Excluir Receita</div>
                        <div className="text-[10.5px] opacity-80">Remover este salário ou entrada do extrato</div>
                      </div>
                    </button>
                  )}
                </>
              );
            })()}

            {/* QUICK ACTION / ATALHO ACTIONS */}
            {target.type === 'quick_action' && (() => {
              const act = target.data;
              return (
                <>
                  {onExecuteQuickAction && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onExecuteQuickAction(act.id);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-800 dark:text-slate-200 text-left transition-colors cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                        <ExternalLink className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-bold">Abrir {act.label}</div>
                        <div className="text-[10.5px] text-slate-500 dark:text-slate-400">Executar esta funcionalidade agora</div>
                      </div>
                    </button>
                  )}

                  {onOpenReorderQuickActions && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenReorderQuickActions();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-800 dark:text-slate-200 text-left transition-colors cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                        <SlidersHorizontal className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-bold">Mudar Ordem / Personalizar Botões</div>
                        <div className="text-[10.5px] text-slate-500 dark:text-slate-400">Reorganizar os atalhos da tela inicial</div>
                      </div>
                    </button>
                  )}
                </>
              );
            })()}
          </div>

          {/* Footer Cancel Button */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer active-press"
            >
              Cancelar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
