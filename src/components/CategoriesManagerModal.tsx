import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Tag, Plus, Edit2, Trash2, Check, RefreshCw, 
  Sparkles, AlertCircle, ArrowRight, ShieldAlert,
  Search, Palette, CheckCircle2
} from 'lucide-react';
import { 
  CustomCategory, 
  AVAILABLE_ICONS, 
  COLOR_THEMES, 
  getCategoryIcon, 
  getStoredCategories, 
  saveStoredCategories, 
  resetToDefaultCategories 
} from '../utils/categories';
import { Bill } from '../types/finance';

interface CategoriesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bills: Bill[];
  onMigrateBillsCategory?: (oldCategory: string, newCategory: string) => void;
  onCategoriesUpdated?: (categories: CustomCategory[]) => void;
}

export const CategoriesManagerModal: React.FC<CategoriesManagerModalProps> = ({
  isOpen,
  onClose,
  bills,
  onMigrateBillsCategory,
  onCategoriesUpdated,
}) => {
  const [categories, setCategories] = useState<CustomCategory[]>(() => getStoredCategories());
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formShortName, setFormShortName] = useState('');
  const [formIconName, setFormIconName] = useState('Tag');
  const [formColor, setFormColor] = useState('teal');
  const [originalNameBeforeEdit, setOriginalNameBeforeEdit] = useState('');

  // Delete Confirmation State
  const [deletingCategory, setDeletingCategory] = useState<CustomCategory | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const feedbackTimeoutRef = useRef<any>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Sync with storage on open
  useEffect(() => {
    if (isOpen) {
      setCategories(getStoredCategories());
      setIsEditing(false);
      setEditingId(null);
      setDeletingCategory(null);
      setShowResetConfirm(false);
      setSearch('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showFeedback = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // Bill count map per category
  const billCountPerCategory: Record<string, number> = {};
  bills.forEach(b => {
    const cat = b.category || 'Outras Despesas';
    billCountPerCategory[cat] = (billCountPerCategory[cat] || 0) + 1;
  });

  const handleStartCreate = () => {
    setIsEditing(true);
    setEditingId(null);
    setFormName('');
    setFormShortName('');
    setFormIconName('Tag');
    setFormColor('teal');
    setOriginalNameBeforeEdit('');
  };

  const handleStartEdit = (cat: CustomCategory) => {
    setIsEditing(true);
    setEditingId(cat.id);
    setFormName(cat.name);
    setFormShortName(cat.shortName || cat.name);
    setFormIconName(cat.iconName || 'Tag');
    setFormColor(cat.color || 'teal');
    setOriginalNameBeforeEdit(cat.name);
  };

  const handleCancelForm = () => {
    setIsEditing(false);
    setEditingId(null);
  };

  const handleSaveForm = () => {
    const trimmedName = formName.trim();
    if (!trimmedName) {
      showFeedback('Por favor, informe o nome da categoria.', 'error');
      return;
    }

    // Check duplicate name
    const isDuplicate = categories.some(
      c => c.name.toLowerCase() === trimmedName.toLowerCase() && c.id !== editingId
    );
    if (isDuplicate) {
      showFeedback('Já existe uma categoria com este nome.', 'error');
      return;
    }

    const trimmedShort = formShortName.trim() || trimmedName.substring(0, 14);

    let updatedList: CustomCategory[];

    if (editingId) {
      // Renaming / Updating
      updatedList = categories.map(c => {
        if (c.id === editingId) {
          return {
            ...c,
            name: trimmedName,
            shortName: trimmedShort,
            iconName: formIconName,
            color: formColor,
          };
        }
        return c;
      });

      // If category name changed, migrate bills automatically
      if (originalNameBeforeEdit && originalNameBeforeEdit !== trimmedName && onMigrateBillsCategory) {
        onMigrateBillsCategory(originalNameBeforeEdit, trimmedName);
      }

      showFeedback(`Categoria "${trimmedName}" atualizada com sucesso!`, 'success');
    } else {
      // Creating new
      const newCat: CustomCategory = {
        id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: trimmedName,
        shortName: trimmedShort,
        iconName: formIconName,
        color: formColor,
        isDefault: false,
      };
      updatedList = [...categories, newCat];
      showFeedback(`Nova categoria "${trimmedName}" criada!`, 'success');
    }

    setCategories(updatedList);
    saveStoredCategories(updatedList);
    if (onCategoriesUpdated) onCategoriesUpdated(updatedList);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleRequestDelete = (cat: CustomCategory) => {
    if (cat.name === 'Outras Despesas' || cat.id === 'outras') {
      showFeedback('A categoria padrão "Outras Despesas" não pode ser excluída.', 'error');
      return;
    }
    setDeletingCategory(cat);
  };

  const handleConfirmDelete = () => {
    if (!deletingCategory) return;

    const catNameToDelete = deletingCategory.name;
    const catCount = billCountPerCategory[catNameToDelete] || 0;

    // Migrate bills to "Outras Despesas" if any exist
    if (catCount > 0 && onMigrateBillsCategory) {
      onMigrateBillsCategory(catNameToDelete, 'Outras Despesas');
    }

    const updatedList = categories.filter(c => c.id !== deletingCategory.id);
    setCategories(updatedList);
    saveStoredCategories(updatedList);
    if (onCategoriesUpdated) onCategoriesUpdated(updatedList);

    showFeedback(
      catCount > 0
        ? `Categoria excluída. ${catCount} conta(s) foram movidas para "Outras Despesas".`
        : `Categoria "${catNameToDelete}" excluída com sucesso.`,
      'info'
    );
    setDeletingCategory(null);
  };

  const handleResetDefaults = () => {
    const defaults = resetToDefaultCategories();
    setCategories(defaults);
    if (onCategoriesUpdated) onCategoriesUpdated(defaults);
    showFeedback('Categorias restauradas para os padrões de fábrica.', 'info');
    setShowResetConfirm(false);
  };

  // Filter categories by search
  const filteredCategories = categories.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.shortName && c.shortName.toLowerCase().includes(q));
  });

  // Selected icon preview
  const PreviewIcon = getCategoryIcon(formIconName);
  const previewTheme = COLOR_THEMES[formColor] || COLOR_THEMES.teal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in overflow-y-auto overscroll-contain">
      <div 
        className="bg-white dark:bg-[#10182F] w-full max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col my-auto max-h-[min(92dvh,calc(100vh-2rem))] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Gerenciar Categorias de Despesas
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Crie, personalize ou exclua categorias para seus boletos e despesas
              </p>
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

        {/* Feedback Alert Toast */}
        {feedbackMsg && (
          <div className={`px-4 py-2 text-xs font-bold text-center animate-fade-in ${
            feedbackMsg.type === 'error'
              ? 'bg-rose-500 text-white'
              : feedbackMsg.type === 'info'
              ? 'bg-amber-500 text-slate-950'
              : 'bg-emerald-500 text-white'
          }`}>
            {feedbackMsg.text}
          </div>
        )}

        {/* Action Controls & Search Bar */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 w-full sm:w-auto flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar categorias..."
              className="bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none w-full"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {!showResetConfirm ? (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="px-2.5 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-semibold flex items-center gap-1 cursor-pointer"
                title="Restaurar lista original de categorias"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Padrões</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/50 px-2 py-1 rounded-xl border border-amber-300 dark:border-amber-800 text-[11px]">
                <span className="text-amber-800 dark:text-amber-200 font-bold">Restaurar padrões?</span>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="font-black text-rose-600 dark:text-rose-400 underline cursor-pointer"
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 cursor-pointer"
                >
                  Não
                </button>
              </div>
            )}

            {!isEditing && (
              <button
                type="button"
                onClick={handleStartCreate}
                className="px-3.5 py-1.5 bg-[#00C49F] hover:bg-[#00b290] text-[#0A1128] font-bold text-xs rounded-xl flex items-center gap-1 active-press shadow-xs"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Nova Categoria</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Create / Edit Form Drawer */}
          {isEditing && (
            <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border-2 border-teal-400 dark:border-teal-700 space-y-3.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-teal-950 dark:text-teal-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>{editingId ? 'Editar Categoria' : 'Criar Nova Categoria'}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
              </div>

              {/* Form Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Nome Completo da Categoria *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Streaming & Jogos, Academia"
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Nome Curto / Tag (opcional)
                  </label>
                  <input
                    type="text"
                    value={formShortName}
                    onChange={(e) => setFormShortName(e.target.value)}
                    placeholder="Ex: Streaming, Esportes"
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Color Palette Selector */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1">
                  <Palette className="w-3 h-3 text-teal-600" />
                  <span>Cor de Destaque</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(COLOR_THEMES).map(([colorKey, theme]) => {
                    const isSelected = formColor === colorKey;
                    return (
                      <button
                        key={colorKey}
                        type="button"
                        onClick={() => setFormColor(colorKey)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1 ${theme.bg} ${theme.text} ${theme.border} ${
                          isSelected ? 'ring-2 ring-teal-500 scale-105 shadow-xs font-black' : 'opacity-85 hover:opacity-100'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        <span className="capitalize">{colorKey}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Icon Picker Grid */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Ícone Representativo (selecione um)
                </label>
                <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5 max-h-36 overflow-y-auto p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  {AVAILABLE_ICONS.map((item) => {
                    const IconComp = item.icon;
                    const isSelected = formIconName === item.name;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setFormIconName(item.name)}
                        title={item.label}
                        className={`h-9 rounded-xl flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-[#00C49F] text-[#0A1128] scale-110 shadow-xs'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Real-time Badge Preview */}
              <div className="pt-2 border-t border-teal-200 dark:border-teal-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Prévia do Selo:</span>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${previewTheme.bg} ${previewTheme.text} ${previewTheme.border}`}>
                    <PreviewIcon className={`w-3.5 h-3.5 ${previewTheme.icon}`} />
                    <span>{formShortName.trim() || formName.trim() || 'Exemplo'}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveForm}
                    className="px-4 py-1.5 bg-[#00C49F] hover:bg-[#00b290] text-[#0A1128] font-bold text-xs rounded-xl flex items-center gap-1 active-press shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Salvar Categoria</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Warning Confirmation Box */}
          {deletingCategory && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-400 dark:border-rose-800 space-y-3 animate-fade-in">
              <div className="flex items-start gap-2.5 text-rose-900 dark:text-rose-200">
                <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold">
                    Excluir a categoria "{deletingCategory.name}"?
                  </h4>
                  <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
                    {(billCountPerCategory[deletingCategory.name] || 0) > 0 ? (
                      <span>
                        Existem <strong>{billCountPerCategory[deletingCategory.name]}</strong> conta(s) cadastradas nesta categoria. 
                        Ao confirmar, essas contas serão automaticamente reclassificadas para <strong>"Outras Despesas"</strong>.
                      </span>
                    ) : (
                      <span>Nenhuma despesa está vinculada a esta categoria no momento.</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDeletingCategory(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 active-press shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Sim, Excluir Categoria</span>
                </button>
              </div>
            </div>
          )}

          {/* Categories List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
              <span>{filteredCategories.length} categorias cadastradas</span>
              <span>{bills.length} contas totais</span>
            </div>

            {filteredCategories.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nenhuma categoria encontrada para "{search}"
                </p>
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
                >
                  Limpar busca
                </button>
              </div>
            ) : (
              filteredCategories.map((cat) => {
                const IconComp = getCategoryIcon(cat.iconName);
                const theme = COLOR_THEMES[cat.color] || COLOR_THEMES.teal;
                const count = billCountPerCategory[cat.name] || 0;
                const isProtected = cat.name === 'Outras Despesas' || cat.id === 'outras';

                return (
                  <div
                    key={cat.id}
                    className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${theme.bg} ${theme.border}`}>
                        <IconComp className={`w-4 h-4 ${theme.icon}`} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {cat.name}
                          </h4>
                          {cat.shortName && cat.shortName !== cat.name && (
                            <span className="text-[10px] text-slate-400 hidden sm:inline">
                              ({cat.shortName})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className={count > 0 ? 'text-teal-600 dark:text-teal-400 font-semibold' : ''}>
                            {count} conta{count !== 1 ? 's' : ''}
                          </span>
                          <span>•</span>
                          <span className="capitalize">{cat.color}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(cat)}
                        className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-300 border border-slate-200 dark:border-slate-700 active-press transition-colors shadow-2xs"
                        title="Renomear ou editar categoria"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {!isProtected && (
                        <button
                          type="button"
                          onClick={() => handleRequestDelete(cat)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Excluir categoria"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Salvo automaticamente no dispositivo
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-teal-500 text-white dark:text-[#0A1128] font-bold text-xs rounded-xl active-press"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
