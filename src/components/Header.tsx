import React, { useState, useEffect, useRef } from 'react';
import { 
  Cloud, RefreshCw, Calculator, Bell, Calendar, 
  Clock, ShieldCheck, MessageCircle, Palette, MoreHorizontal, X, Check
} from 'lucide-react';
import { CloudDevice } from '../types/finance';

interface HeaderProps {
  activeDevice?: CloudDevice;
  selectedMonth?: string;
  onOpenNewBill?: () => void;
  onOpenNewRevenue?: () => void;
  onOpenCloudSync: () => void;
  onOpenCalculator?: () => void;
  onOpenBackup?: () => void;
  onOpenWifeConnect?: () => void;
  onOpenBoletoScanner?: () => void;
  onOpenProfiles?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  onOpenBudgets?: () => void;
  onQuickPayFilter?: () => void;
  onShareWhatsApp?: () => void;
  onQuickPixPaste?: () => void;
  onManualRefresh?: () => void;
  isRefreshing?: boolean;
  isOffline: boolean;
  isWifeConnected?: boolean;
  activeUserName?: string;
  onToggleActiveUser?: () => void;
  onOpenFamilyAuth?: () => void;
  isFamilyAuthenticated?: boolean;
  onOpenThemePicker?: () => void;
  activeThemeColor?: string;
}

export const Header: React.FC<HeaderProps> = ({
  selectedMonth = 'Novembro de 2026',
  onOpenCloudSync,
  onOpenCalculator,
  onOpenBackup,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  onShareWhatsApp,
  onManualRefresh,
  isRefreshing = false,
  isOffline,
  activeUserName,
  onToggleActiveUser,
  onOpenThemePicker,
  activeThemeColor,
}) => {
  const [currentClock, setCurrentClock] = useState<string>(() => {
    const d = new Date();
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  });

  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentClock(d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    };
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Close more menu on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMoreMenuOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };

    if (isMoreMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMoreMenuOpen]);

  const brandColor = activeThemeColor || 'var(--color-brand-primary, #00C49F)';
  const isPaula = (activeUserName || '').toLowerCase().includes('paula');

  return (
    <header className="theme-header sticky top-0 z-30 w-full backdrop-blur-xl bg-[#080E21]/95 text-white border-b border-slate-800/80 shadow-xs header-safe-top py-2.5 px-3.5 sm:px-6 transition-all duration-200">
      <div className="flex items-center justify-between max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto w-full gap-2 sm:gap-4">
        
        {/* Lado Esquerdo: Identidade Executiva & Contexto do Mês / Perfil */}
        <div className="flex flex-col justify-center min-w-0 flex-1">
          {/* Linha 1: Marca minimalista e indicador de conectividade em tempo real */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[13px] sm:text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5 select-none">
              <span>Finanças</span>
              <span 
                className="w-1.5 h-1.5 rounded-full" 
                style={{ backgroundColor: brandColor }} 
              />
            </span>

            <button
              type="button"
              onClick={onOpenCloudSync}
              title={isOffline ? 'Modo Offline (dados salvos no aparelho)' : 'Sincronização em Nuvem Ativa'}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-800/80 hover:bg-slate-700/90 text-slate-300 text-[10px] font-medium border border-slate-700/60 active-press transition-colors cursor-pointer shrink-0"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
              <Cloud className="w-3 h-3 text-slate-400" style={{ color: isOffline ? undefined : brandColor }} />
              <span className="hidden xs:inline text-[9.5px] font-semibold">{isOffline ? 'Offline' : 'Nuvem'}</span>
            </button>
          </div>

          {/* Linha 2: Mês selecionado, perfil ativo e relógio com tipografia lapidada */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-300 font-medium mt-0.5 truncate">
            <span className="inline-flex items-center gap-1 text-slate-200 font-semibold truncate">
              <Calendar className="w-3 h-3 flex-shrink-0" style={{ color: brandColor }} />
              <span className="truncate">{selectedMonth}</span>
            </span>

            {activeUserName && (
              <>
                <span className="text-slate-600 text-[10px]">•</span>
                <button
                  type="button"
                  onClick={onToggleActiveUser}
                  className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-[10px] sm:text-[10.5px] font-semibold border border-slate-700/70 active-press transition-colors cursor-pointer shrink-0"
                  title={`Perfil ativo: ${activeUserName}. Toque para alternar.`}
                >
                  <span>{isPaula ? '👩🏻' : '👤'}</span>
                  <span>{activeUserName}</span>
                  <span className="text-[8px] text-slate-400">▾</span>
                </button>
              </>
            )}

            <span className="text-slate-600 text-[10px] hidden md:inline">•</span>
            <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-slate-400 font-mono" title="Horário do sistema">
              <Clock className="w-2.5 h-2.5" />
              <span>{currentClock}</span>
            </span>
          </div>
        </div>

        {/* Lado Direito: Barra de Ferramentas Harmoniosa e Profissional */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 relative">
          
          {/* Ferramentas em telas médias e grandes (Desktop / Tablet) */}
          <div className="hidden md:flex items-center gap-1 sm:gap-1.5">
            {/* WhatsApp */}
            {onShareWhatsApp && (
              <button
                id="btn-header-share-whatsapp"
                type="button"
                onClick={onShareWhatsApp}
                title="Compartilhar resumo no WhatsApp"
                className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 border border-slate-700/70 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Calculadora */}
            {onOpenCalculator && (
              <button
                id="btn-header-calculator"
                type="button"
                onClick={onOpenCalculator}
                title="Abrir calculadora rápida"
                className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/70 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <Calculator className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Backup & Segurança dos Dados */}
            {onOpenBackup && (
              <button
                id="btn-header-backup"
                type="button"
                onClick={onOpenBackup}
                title="Backup e restauração dos dados"
                className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-teal-300 border border-slate-700/70 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Atualização Manual */}
            {onManualRefresh && (
              <button
                id="btn-header-manual-refresh"
                type="button"
                onClick={onManualRefresh}
                disabled={isRefreshing}
                title="Sincronizar dados agora"
                className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/70 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-400' : ''}`} />
              </button>
            )}
          </div>

          {/* Seletor de Tema / Cores (Discreto e elegante) */}
          {onOpenThemePicker && (
            <button
              id="btn-header-theme"
              type="button"
              onClick={onOpenThemePicker}
              title="Personalizar tema e cores do aplicativo"
              className="relative w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/70 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <Palette className="w-3.5 h-3.5 text-amber-300" />
              <span 
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#080E21] shadow-2xs"
                style={{ backgroundColor: brandColor }}
              />
            </button>
          )}

          {/* Central de Lembretes & Notificações */}
          {onOpenNotifications && (
            <button
              id="btn-header-notifications"
              type="button"
              onClick={onOpenNotifications}
              title="Lembretes e avisos de vencimento"
              className="relative w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/70 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <Bell className="w-3.5 h-3.5 text-[#FFD166]" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-3.5 h-3.5 px-0.5 bg-rose-500 text-white font-extrabold text-[8.5px] rounded-full flex items-center justify-center border border-[#080E21] animate-pulse">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>
          )}

          {/* Menu Dropdown de Mais Opções para Dispositivos Móveis */}
          <div className="relative md:hidden" ref={moreMenuRef}>
            <button
              id="btn-header-more-menu"
              type="button"
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              title="Mais ferramentas"
              className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer shadow-2xs active:scale-95 ${
                isMoreMenuOpen 
                  ? 'bg-slate-700 border-slate-500 text-white' 
                  : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700/70 text-slate-300 hover:text-white'
              }`}
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {/* Menu Popover Refinado no Mobile */}
            {isMoreMenuOpen && (
              <div 
                className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[#0E172F]/98 backdrop-blur-md border border-slate-700 shadow-2xl p-1.5 space-y-1 z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 flex items-center justify-between">
                  <span>Ferramentas</span>
                  <span className="text-slate-500 font-mono text-[9px]">{currentClock}</span>
                </div>

                {onShareWhatsApp && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      onShareWhatsApp();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-slate-800/80 text-slate-200 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="leading-tight">Compartilhar WhatsApp</div>
                      <div className="text-[10px] text-slate-400 font-normal">Resumo das despesas</div>
                    </div>
                  </button>
                )}

                {onOpenCalculator && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      onOpenCalculator();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-slate-800/80 text-slate-200 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-teal-500/15 text-teal-300 flex items-center justify-center shrink-0">
                      <Calculator className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="leading-tight">Calculadora</div>
                      <div className="text-[10px] text-slate-400 font-normal">Cálculos rápidos</div>
                    </div>
                  </button>
                )}

                {onOpenBackup && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      onOpenBackup();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-slate-800/80 text-slate-200 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-300 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="leading-tight">Backup & Segurança</div>
                      <div className="text-[10px] text-slate-400 font-normal">Salvar / Restaurar dados</div>
                    </div>
                  </button>
                )}

                {onManualRefresh && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      onManualRefresh();
                    }}
                    disabled={isRefreshing}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-slate-800/80 text-slate-200 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/15 text-cyan-300 flex items-center justify-center shrink-0">
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </div>
                    <div>
                      <div className="leading-tight">Sincronizar Nuvem</div>
                      <div className="text-[10px] text-slate-400 font-normal">Atualizar agora</div>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
