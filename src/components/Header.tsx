import React, { useState, useEffect } from 'react';
import { Home, Plus, Cloud, RefreshCw, Calculator, Bell, Calendar, Clock, ShieldCheck, MessageCircle, Palette } from 'lucide-react';
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
  onOpenBudgets,
  onOpenWifeConnect,
  onShareWhatsApp,
  onManualRefresh,
  isRefreshing = false,
  isOffline,
  isWifeConnected = false,
  activeUserName,
  onToggleActiveUser,
  onOpenFamilyAuth,
  isFamilyAuthenticated = false,
  onOpenThemePicker,
  activeThemeColor,
}) => {
  const [currentClock, setCurrentClock] = useState<string>(() => {
    const d = new Date();
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  });

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentClock(d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    };
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="theme-header text-white header-safe-top pb-1.5 px-3 sm:px-4 sticky top-0 z-30 shadow-sm border-b w-full flex-shrink-0 transition-all duration-300">
      <div className="flex items-center justify-between max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto w-full gap-2">
        {/* Brand & Month */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div 
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-xs flex-shrink-0 transition-colors"
            style={{ 
              backgroundColor: activeThemeColor || 'var(--color-brand-primary, #00C49F)',
              color: 'var(--color-brand-text, #0A1128)'
            }}
          >
            <Home className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-xs sm:text-base font-bold tracking-tight text-white truncate">
                Finanças da Minha Casa
              </h1>
              <button
                type="button"
                onClick={onOpenCloudSync}
                title={isOffline ? 'Modo Offline' : 'Sincronizado com Nuvem'}
                className="flex items-center gap-1 text-[11px] text-white/80 hover:text-white flex-shrink-0"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
                <Cloud className="w-3.5 h-3.5" style={{ color: activeThemeColor || 'var(--color-brand-primary)' }} />
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-300 font-medium truncate mt-0.5">
              <Calendar className="w-3 h-3 flex-shrink-0" style={{ color: activeThemeColor || 'var(--color-brand-primary)' }} />
              <span className="font-bold text-white truncate">{selectedMonth}</span>
              <span className="text-slate-500">•</span>
              <span className="font-semibold flex items-center gap-1 flex-shrink-0" style={{ color: activeThemeColor || 'var(--color-brand-primary)' }} title="Horário do aparelho sincronizado">
                <Clock className="w-2.5 h-2.5" />
                <span>{currentClock}</span>
              </span>
              {activeUserName && (
                <>
                  <span className="text-slate-500">•</span>
                  <button
                    type="button"
                    onClick={onToggleActiveUser}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-[10px] font-bold border border-slate-700/60 active-press transition-colors cursor-pointer"
                    title={`Perfil ativo: ${activeUserName}. Clique para alternar entre Carlos e Paula.`}
                  >
                    <span>{(activeUserName || '').toLowerCase().includes('paula') ? '👩🏻' : '👤'}</span>
                    <span>{activeUserName}</span>
                    <span className="text-[9px] text-slate-400">▾</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Notification Bell with Badge */}
          {onOpenNotifications && (
            <button
              id="btn-header-notifications"
              type="button"
              onClick={onOpenNotifications}
              title="Lembretes & Avisos de Vencimento"
              className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-teal-300 hover:text-white active:scale-90 transition-all border border-slate-700/60"
            >
              <Bell className="w-4 h-4 text-[#FFD166]" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white font-extrabold text-[9px] rounded-full flex items-center justify-center border-2 border-[#0A1128] animate-pulse">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>
          )}

          {/* WhatsApp Summary Button */}
          {onShareWhatsApp && (
            <button
              id="btn-header-share-whatsapp"
              type="button"
              onClick={onShareWhatsApp}
              title="Compartilhar Resumo do Mês no WhatsApp"
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-emerald-200 active:scale-90 transition-all border border-emerald-500/40 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-emerald-500/40" />
            </button>
          )}

          {/* Calculator Button */}
          {onOpenCalculator && (
            <button
              id="btn-header-calculator"
              type="button"
              onClick={onOpenCalculator}
              title="Abrir Calculadora"
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-teal-300 hover:text-white active:scale-90 transition-all border border-slate-700/60"
            >
              <Calculator className="w-4 h-4 text-[#00E5B5]" />
            </button>
          )}

          {/* Backup & Segurança Button */}
          {onOpenBackup && (
            <button
              id="btn-header-backup"
              type="button"
              onClick={onOpenBackup}
              title="Backup & Segurança dos Dados (E-mail / Arquivo)"
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-teal-300 hover:text-white active:scale-90 transition-all border border-slate-700/60 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#00C49F]" />
            </button>
          )}

          {/* Manual Refresh Button */}
          {onManualRefresh && (
            <button
              id="btn-header-manual-refresh"
              type="button"
              onClick={onManualRefresh}
              disabled={isRefreshing}
              title="Atualizar dados e sincronizar agora"
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-teal-300 hover:text-white active:scale-90 transition-all border border-slate-700/60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-400' : ''}`} />
            </button>
          )}

          {/* Personalizar Tema & Cores Button */}
          {onOpenThemePicker && (
            <button
              id="btn-header-theme"
              type="button"
              onClick={onOpenThemePicker}
              title="Personalizar Tema & Cores do App"
              className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white active:scale-90 transition-all border border-slate-700/60 cursor-pointer"
            >
              <Palette className="w-4 h-4 text-amber-300" />
              <span 
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#0A1128] shadow-xs"
                style={{ backgroundColor: activeThemeColor || 'var(--color-brand-primary, #00C49F)' }}
              />
            </button>
          )}

          {/* New Bill Button */}
          <button
            id="btn-header-new-bill"
            type="button"
            onClick={onOpenNewBill}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 font-black rounded-xl text-xs active:scale-95 transition-all shadow-xs"
            style={{ 
              backgroundColor: activeThemeColor || 'var(--color-brand-primary, #00C49F)',
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


