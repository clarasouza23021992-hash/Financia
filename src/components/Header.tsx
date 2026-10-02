import React, { useState, useEffect } from 'react';
import { Home, Plus, Cloud, Heart, RefreshCw, Calculator, Bell, Target, Calendar, Clock } from 'lucide-react';
import { CloudDevice } from '../types/finance';

interface HeaderProps {
  activeDevice: CloudDevice;
  selectedMonth?: string;
  onOpenNewBill: () => void;
  onOpenNewRevenue?: () => void;
  onOpenCloudSync: () => void;
  onOpenCalculator?: () => void;
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
}

export const Header: React.FC<HeaderProps> = ({
  selectedMonth = 'Novembro de 2026',
  onOpenNewBill,
  onOpenCloudSync,
  onOpenCalculator,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  onOpenBudgets,
  onOpenWifeConnect,
  onManualRefresh,
  isRefreshing = false,
  isOffline,
  isWifeConnected = false,
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
    <header className="bg-[#0A1128] text-white header-safe-top pb-1.5 px-3 sm:px-4 sticky top-0 z-30 shadow-sm border-b border-slate-800/80 w-full flex-shrink-0">
      <div className="flex items-center justify-between max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto w-full gap-2">
        {/* Brand & Month */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#00C49F] flex items-center justify-center shadow-xs flex-shrink-0">
            <Home className="w-4 h-4 sm:w-5 sm:h-5 text-[#0A1128]" />
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
                className="flex items-center gap-1 text-[11px] text-teal-300/80 hover:text-teal-200 flex-shrink-0"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
                <Cloud className="w-3.5 h-3.5 text-teal-400" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-300 font-medium truncate mt-0.5">
              <Calendar className="w-3 h-3 text-[#00C49F] flex-shrink-0" />
              <span className="font-bold text-white truncate">{selectedMonth}</span>
              <span className="text-slate-500">•</span>
              <span className="text-teal-300 font-semibold flex items-center gap-1 flex-shrink-0" title="Horário do aparelho sincronizado">
                <Clock className="w-2.5 h-2.5 text-teal-400" />
                <span>{currentClock}</span>
              </span>
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

          {/* New Bill Button */}
          <button
            id="btn-header-new-bill"
            type="button"
            onClick={onOpenNewBill}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 bg-[#00C49F] hover:bg-[#00B290] text-[#0A1128] font-bold rounded-xl text-xs active:scale-95 transition-all shadow-xs"
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


