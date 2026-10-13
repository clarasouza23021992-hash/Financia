import React, { useState } from 'react';
import { Palette, Check, Sparkles, X, Sun, Moon, ShieldCheck, Heart } from 'lucide-react';
import { ACCENT_THEMES, AccentTheme, getStoredThemeId, applyTheme } from '../utils/theme';

interface ThemePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onThemeChanged?: (theme: AccentTheme) => void;
}

export const ThemePickerModal: React.FC<ThemePickerModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  onToggleDarkMode,
  onThemeChanged,
}) => {
  const [selectedThemeId, setSelectedThemeId] = useState<string>(() => getStoredThemeId());

  if (!isOpen) return null;

  const handleSelectTheme = (theme: AccentTheme) => {
    setSelectedThemeId(theme.id);
    const applied = applyTheme(theme.id);
    onThemeChanged?.(applied);
  };

  const currentTheme = ACCENT_THEMES.find(t => t.id === selectedThemeId) || ACCENT_THEMES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-[#0E1528] rounded-3xl max-w-md w-full shadow-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white dark:from-[#0E1528] dark:to-[#131D38]">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs transition-colors"
              style={{ backgroundColor: currentTheme.subtleBg, color: currentTheme.primary }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Personalizar Paleta Global</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Tudo em Conjunto
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mude a cor de tudo em conjunto (cabeçalho, cartões, botões e barras)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center transition-colors active:scale-95"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Light / Dark Mode Quick Switcher */}
          <div className="bg-slate-50 dark:bg-[#131D38]/70 p-3 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-200/70 dark:bg-slate-700/60 flex items-center justify-center text-slate-700 dark:text-slate-200">
                {isDarkMode ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                  Modo {isDarkMode ? 'Escuro (Dark)' : 'Claro (Light)'}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {isDarkMode ? 'Economiza bateria e reduz fadiga visual' : 'Visual límpido e alto contraste diurno'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleDarkMode}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active-press ${
                isDarkMode 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'bg-white text-slate-700 border border-slate-200 shadow-2xs'
              }`}
            >
              {isDarkMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              <span>{isDarkMode ? 'Ativo' : 'Claro'}</span>
            </button>
          </div>

          {/* Theme Palette Cards */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
              Paletas de Cores Principais
            </label>

            <div className="grid grid-cols-1 gap-2.5">
              {ACCENT_THEMES.map((theme) => {
                const isSelected = theme.id === selectedThemeId;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleSelectTheme(theme)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between group active-press ${
                      isSelected
                        ? 'border-2 shadow-md bg-white dark:bg-[#15203D]'
                        : 'border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-[#10172E]/60 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                    style={{
                      borderColor: isSelected ? theme.primary : undefined,
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Color swatch circle with metallic ring */}
                      <div 
                        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md relative overflow-hidden group-hover:scale-105 transition-transform"
                        style={{ backgroundColor: theme.primary }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-white/30 pointer-events-none" />
                        {isSelected && (
                          <Check className="w-5 h-5 relative z-10 drop-shadow" style={{ color: theme.textOnPrimary }} />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-800 dark:text-white truncate">
                            {theme.name}
                          </span>
                          {isSelected && (
                            <span 
                              className="text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider"
                              style={{ backgroundColor: theme.subtleBg, color: theme.primary }}
                            >
                              Ativo
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {theme.subtitle}
                        </p>
                      </div>
                    </div>

                    {/* Miniature live preview pill */}
                    <div className="shrink-0 flex items-center gap-1.5">
                      <div 
                        className="w-5 h-5 rounded-full border-2 border-white dark:border-[#0E1528] shadow-xs"
                        style={{ backgroundColor: theme.primary }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Preview of the Chosen Theme Changing Everything Together */}
          <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-3 border border-slate-800 shadow-inner">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" style={{ color: currentTheme.primary }} />
                <span>Prévia: Tudo Muda em Conjunto</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400 font-bold">{currentTheme.name}</span>
            </div>

            {/* Mini Header Simulation */}
            <div 
              className="p-2 rounded-xl flex items-center justify-between border transition-all"
              style={{ background: currentTheme.headerGradient, borderColor: currentTheme.headerBorder }}
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-5 h-5 rounded-md flex items-center justify-center font-black text-[10px]"
                  style={{ backgroundColor: currentTheme.primary, color: currentTheme.textOnPrimary }}
                >
                  🏠
                </div>
                <span className="text-[10px] font-bold text-white">Finanças da Casa</span>
              </div>
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: currentTheme.subtleBg, color: currentTheme.primary }}>
                Cabeçalho
              </span>
            </div>

            {/* Mini Progress Bar Simulation */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-300 font-semibold">
                <span>Progresso de Quitação</span>
                <span style={{ color: currentTheme.primary }} className="font-bold">75% Pago</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ background: currentTheme.progressGradient, width: '75%' }}
                />
              </div>
            </div>

            {/* Action Buttons & Status Badges */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div 
                className="px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md flex-1 justify-center transition-all"
                style={{ backgroundColor: currentTheme.primary, color: currentTheme.textOnPrimary }}
              >
                <span>Marcar como Pago</span>
              </div>

              <div 
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold border flex items-center gap-1 shrink-0 transition-all"
                style={{ backgroundColor: currentTheme.subtleBg, borderColor: currentTheme.borderSubtle, color: currentTheme.primary }}
              >
                <Check className="w-3 h-3" />
                <span>Aba Ativa</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#0A1128]/70 flex items-center justify-between">
          <div className="text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Salvo automaticamente no seu dispositivo</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-all"
            style={{ backgroundColor: currentTheme.primary, color: currentTheme.textOnPrimary }}
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
