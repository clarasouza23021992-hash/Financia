import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, Plus, Cloud, RefreshCw, Calculator, Bell, Calendar, 
  Clock, ShieldCheck, MessageCircle, Palette, MoreHorizontal, X, Check
} from 'lucide-react';
import { CloudDevice } from '../types/finance';

interface HeaderProps {
  activeDevice: CloudDevice;
  selectedMonth?: string;
  onOpenNewBill: () => void;
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
  onOpenNewBill,
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

  return (
    <header className="theme-header text-white header-safe-top pb-3 sm:pb-3.5 px-3.5 sm:px-5 sticky top-0 z-30 shadow-md border-b w-full flex-shrink-0 transition-all duration-300">
      <div className="flex items-center justify-between max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto w-full gap-2 sm:gap-4">
        
        {/* Lado Esquerdo: Identidade Visual e Contexto com Respiração */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
          {/* Logo Ícone */}
          <div 
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-xs flex-shrink-0 transition-transform active:scale-95"
            style={{ 
              backgroundColor: brandColor,
              color: 'var(--color-brand-text, #0A1128)'
            }}
          >
            <Home className="w-5 h-5" />
          </div>

          {/* Textos: Título e Badges informativos */}
          <div className="min-w-0 flex flex-col justify-center">
            {/* Linha 1: Nome do App + Status da Nuvem */}
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white truncate leading-tight">
                Finanças da Minha Casa
              </h1>
              
              <button
                type="button"
                onClick={onOpenCloudSync}
                title={isOffline ? 'Modo Offline (dados salvos localmente)' : 'Sincronizado na Nuvem'}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-[10px] text-slate-300 flex-shrink-0 border border-slate-700/60 active-press transition-colors cursor-pointer"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
                <Cloud className="w-3 h-3" style={{ color: brandColor }} />
                <span className="hidden sm:inline text-[9px] font-semibold">{isOffline ? 'Offline' : 'Nuvem'}</span>
              </button>
            </div>

            {/* Linha 2: Mês Selecionado + Alternador de Perfil */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-300 font-medium mt-0.5 truncate">
              <span className="inline-flex items-center gap-1 text-slate-200 font-semibold truncate">
                <Calendar className="w-3 h-3 flex-shrink-0 text-slate-400" style={{ color: brandColor }} />
                <span className="truncate">{selectedMonth}</span>
              </span>

              {activeUserName && (
                <>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={onToggleActiveUser}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-100 text-[10px] sm:text-[11px] font-bold border border-slate-700/80 active-press transition-colors cursor-pointer shrink-0"
                    title={`Perfil ativo: ${activeUserName}. Clique para alternar.`}
                  >
                    <span>{(activeUserName || '').toLowerCase().includes('paula') ? '👩🏻' : '👤'}</span>
                    <span>{activeUserName}</span>
                    <span className="text-[9px] text-slate-400">▾</span>
                  </button>
                </>
              )}

              <span className="text-slate-600 hidden md:inline">•</span>
              <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-slate-400" title="Horário do sistema sincronizado">
                <Clock className="w-2.5 h-2.5" />
                <span>{currentClock}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Lado Direito: Ações Principais e Menu Responsivo Sem Aglomeração */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 relative">
          
          {/* Botões Secundários em Telas Médias/Grandes (md+) */}
          <div className="hidden md:flex items-center gap-1.5">
            {/* WhatsApp */}
            {onShareWhatsApp && (
              <button
                id="btn-header-share-whatsapp"
                type="button"
                onClick={onShareWhatsApp}
                title="Compartilhar Resumo no WhatsApp"
                className="flex items-center justify-center w-8.5 h-8.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-emerald-400 active:scale-95 transition-all border border-slate-700/60 cursor-pointer shadow-2xs"
              >
                <MessageCircle className="w-4 h-4 fill-emerald-500/20" />
              </button>
            )}

            {/* Calculadora */}
            {onOpenCalculator && (
              <button
                id="btn-header-calculator"
                type="button"
                onClick={onOpenCalculator}
                title="Abrir Calculadora Financeira"
                className="flex items-center justify-center w-8.5 h-8.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-teal-300 hover:text-white active:scale-95 transition-all border border-slate-700/60 cursor-pointer shadow-2xs"
              >
                <Calculator className="w-4 h-4" />
              </button>
            )}

            {/* Backup & Segurança */}
            {onOpenBackup && (
              <button
                id="btn-header-backup"
                type="button"
                onClick={onOpenBackup}
                title="Backup & Segurança dos Dados"
                className="flex items-center justify-center w-8.5 h-8.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-teal-300 hover:text-white active:scale-95 transition-all border border-slate-700/60 cursor-pointer shadow-2xs"
              >
                <ShieldCheck className="w-4 h-4" />
              </button>
            )}

            {/* Sincronização Manual */}
            {onManualRefresh && (
              <button
                id="btn-header-manual-refresh"
                type="button"
                onClick={onManualRefresh}
                disabled={isRefreshing}
                title="Atualizar dados agora"
                className="flex items-center justify-center w-8.5 h-8.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-teal-300 hover:text-white active:scale-95 transition-all border border-slate-700/60 cursor-pointer shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-400' : ''}`} />
              </button>
            )}
          </div>

          {/* Botão de Paleta de Cores e Temas (Sempre Visível) */}
          {onOpenThemePicker && (
            <button
              id="btn-header-theme"
              type="button"
              onClick={onOpenThemePicker}
              title="Personalizar Tema & Cores do App"
              className="relative flex items-center justify-center w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white active:scale-95 transition-all border border-slate-700/70 cursor-pointer shadow-2xs"
            >
              <Palette className="w-4 h-4 text-amber-300" />
              <span 
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#0A1128] shadow-xs"
                style={{ backgroundColor: brandColor }}
              />
            </button>
          )}

          {/* Sino de Notificações com Badge (Sempre Visível) */}
          {onOpenNotifications && (
            <button
              id="btn-header-notifications"
              type="button"
              onClick={onOpenNotifications}
              title="Lembretes & Vencimentos"
              className="relative flex items-center justify-center w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white active:scale-95 transition-all border border-slate-700/70 cursor-pointer shadow-2xs"
            >
              <Bell className="w-4 h-4 text-[#FFD166]" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white font-extrabold text-[9px] rounded-full flex items-center justify-center border-2 border-[#0A1128] animate-pulse">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>
          )}

          {/* Menu Suspenso "Mais Ferramentas" no Mobile (Evita Espremer) */}
          <div className="relative md:hidden" ref={moreMenuRef}>
            <button
              id="btn-header-more-menu"
              type="button"
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              title="Mais opções e ferramentas"
              className={`flex items-center justify-center w-8.5 h-8.5 rounded-xl text-slate-200 hover:text-white active:scale-95 transition-all border cursor-pointer shadow-2xs ${
                isMoreMenuOpen 
                  ? 'bg-slate-700 border-slate-500 text-white' 
                  : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700/70'
              }`}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {/* Menu Popover no Mobile */}
            {isMoreMenuOpen && (
              <div 
                className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-slate-900/98 backdrop-blur-md border border-slate-700/90 shadow-2xl p-1.5 space-y-1 z-50 animate-in fade-in zoom-in-95 duration-150"
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
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-4 h-4" />
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
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center flex-shrink-0">
                      <Calculator className="w-4 h-4" />
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
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="w-4 h-4" />
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
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center flex-shrink-0">
                      <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
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

          {/* Botão de Ação Primária: Nova Conta (Com Destaque e Respiração) */}
          <button
            id="btn-header-new-bill"
            type="button"
            onClick={onOpenNewBill}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 font-bold rounded-xl text-xs active:scale-95 transition-all shadow-md flex-shrink-0 cursor-pointer"
            style={{ 
              backgroundColor: brandColor,
              color: 'var(--color-brand-text, #0A1128)' 
            }}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Nova Conta</span>
            <span className="sm:hidden">Conta</span>
          </button>

        </div>
      </div>
    </header>
  );
};
