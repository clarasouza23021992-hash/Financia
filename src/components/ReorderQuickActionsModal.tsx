import React, { useState } from 'react';
import { 
  X, ArrowUp, ArrowDown, RotateCcw, Check, 
  Target, Bell, Calculator, Tag, ScanLine, Images, 
  SlidersHorizontal, Sparkles, CheckCircle2, GripVertical
} from 'lucide-react';

export interface QuickActionConfig {
  id: string;
  label: string;
  icon: string;
  badge?: string;
  description: string;
}

export const DEFAULT_QUICK_ACTIONS: QuickActionConfig[] = [
  { id: 'scanner', label: 'Escanear Boleto / Pix', icon: 'ScanLine', description: 'Leitor de código de barras e chave Pix com câmera' },
  { id: 'gallery', label: 'Galeria Comprovantes', icon: 'Images', description: 'Visualizador de fotos e prints de comprovantes do mês' },
  { id: 'budget', label: 'Metas & Teto', icon: 'Target', description: 'Metas de economia e tetos por categoria' },
  { id: 'reminders', label: 'Lembretes', icon: 'Bell', description: 'Central de avisos e notificações de vencimento' },
  { id: 'calculator', label: 'Calculadora', icon: 'Calculator', description: 'Calculadora rápida com lançamento direto em conta' },
  { id: 'categories', label: 'Categorias', icon: 'Tag', description: 'Gerenciar categorias de gastos da casa' },
];

const STORAGE_KEY = 'financas_quick_actions_order_v1';

export const getSavedQuickActionsOrder = (): string[] => {
  if (typeof window === 'undefined') return DEFAULT_QUICK_ACTIONS.map(a => a.id);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_QUICK_ACTIONS.map(a => a.id);
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure all current action IDs are present even if new ones were added
      const knownIds = new Set(parsed);
      const missing = DEFAULT_QUICK_ACTIONS.filter(a => !knownIds.has(a.id)).map(a => a.id);
      return [...parsed, ...missing];
    }
  } catch (e) {
    console.error('Error reading quick actions order:', e);
  }
  return DEFAULT_QUICK_ACTIONS.map(a => a.id);
};

export const saveQuickActionsOrder = (order: string[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch (e) {
    console.error('Error saving quick actions order:', e);
  }
};

interface ReorderQuickActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOrder: string[];
  onSaveOrder: (newOrder: string[]) => void;
}

export const ReorderQuickActionsModal: React.FC<ReorderQuickActionsModalProps> = ({
  isOpen,
  onClose,
  currentOrder,
  onSaveOrder,
}) => {
  const [items, setItems] = useState<string[]>(() => {
    return currentOrder && currentOrder.length > 0 ? currentOrder : getSavedQuickActionsOrder();
  });
  const [successToast, setSuccessToast] = useState(false);

  // Sync state when opened
  React.useEffect(() => {
    if (isOpen) {
      setItems(currentOrder && currentOrder.length > 0 ? currentOrder : getSavedQuickActionsOrder());
      setSuccessToast(false);
    }
  }, [isOpen, currentOrder]);

  if (!isOpen) return null;

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[index - 1];
    newItems[index - 1] = temp;
    setItems(newItems);
  };

  const moveDown = (index: number) => {
    if (index >= items.length - 1) return;
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[index + 1];
    newItems[index + 1] = temp;
    setItems(newItems);
  };

  const handleReset = () => {
    const defaultOrder = DEFAULT_QUICK_ACTIONS.map(a => a.id);
    setItems(defaultOrder);
    saveQuickActionsOrder(defaultOrder);
    onSaveOrder(defaultOrder);
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 2500);
  };

  const handleSave = () => {
    saveQuickActionsOrder(items);
    onSaveOrder(items);
    setSuccessToast(true);
    setTimeout(() => {
      setSuccessToast(false);
      onClose();
    }, 400);
  };

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'ScanLine': return <ScanLine className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
      case 'Images': return <Images className="w-4 h-4 text-teal-600 dark:text-[#00E5B5]" />;
      case 'Target': return <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'Bell': return <Bell className="w-4 h-4 text-amber-500" />;
      case 'Calculator': return <Calculator className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
      case 'Tag': return <Tag className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
      default: return <SlidersHorizontal className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#0E172F] w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto max-h-[min(90dvh,calc(100vh-2rem))]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0A1128] text-white px-5 py-4 flex items-center justify-between border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-500/20 text-[#00C49F] flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight">
                Organizar Botões de Acesso
              </h2>
              <p className="text-[11px] text-slate-400">
                Mova cada opção para a posição que você preferir
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success toast */}
        {successToast && (
          <div className="mx-4 mt-3 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Ordem dos botões salva com sucesso!</span>
          </div>
        )}

        {/* Instruction */}
        <div className="px-5 pt-3.5 pb-1 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>Use as setas <strong>▲</strong> e <strong>▼</strong> para reordenar:</span>
          <button
            type="button"
            onClick={handleReset}
            className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
            title="Restaurar posições originais"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restaurar Padrão</span>
          </button>
        </div>

        {/* List of items */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-1 min-h-0 overscroll-contain">
          {items.map((actionId, index) => {
            const config = DEFAULT_QUICK_ACTIONS.find(a => a.id === actionId);
            if (!config) return null;

            const isFirst = index === 0;
            const isLast = index === items.length - 1;

            return (
              <div
                key={config.id}
                className="p-3 bg-slate-50 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-2xs hover:border-teal-500/50 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Position number pill */}
                  <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-black flex items-center justify-center flex-shrink-0">
                    {index + 1}º
                  </span>

                  {/* Icon */}
                  <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 flex-shrink-0 shadow-2xs">
                    {renderIcon(config.icon)}
                  </div>

                  {/* Label & Description */}
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {config.label}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {config.description}
                    </p>
                  </div>
                </div>

                {/* Move buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => moveUp(index)}
                    disabled={isFirst}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                      isFirst
                        ? 'opacity-30 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                        : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 active-press shadow-2xs'
                    }`}
                    title="Mover para cima / para a esquerda"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => moveDown(index)}
                    disabled={isLast}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                      isLast
                        ? 'opacity-30 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                        : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 active-press shadow-2xs'
                    }`}
                    title="Mover para baixo / para a direita"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pinned Footer */}
        <div className="p-3 bg-slate-50 dark:bg-[#0A1128] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl active-press transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="py-2.5 px-6 bg-[#00C49F] hover:bg-[#00b290] text-[#0A1128] font-black text-xs rounded-xl active-press shadow-md shadow-teal-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Salvar Nova Ordem</span>
          </button>
        </div>
      </div>
    </div>
  );
};
