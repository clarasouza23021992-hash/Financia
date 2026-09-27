import React from 'react';
import { Home, Plus, Cloud, Heart, RefreshCw, ShieldCheck } from 'lucide-react';
import { CloudDevice } from '../types/finance';

interface HeaderProps {
  activeDevice: CloudDevice;
  selectedMonth?: string;
  onOpenNewBill: () => void;
  onOpenNewRevenue?: () => void;
  onOpenCloudSync: () => void;
  onOpenDataRecovery?: () => void;
  onOpenWifeConnect?: () => void;
  onOpenBoletoScanner?: () => void;
  onOpenProfiles?: () => void;
  onQuickPayFilter?: () => void;
  onShareWhatsApp?: () => void;
  onQuickPixPaste?: () => void;
  onManualRefresh?: () => void;
  isRefreshing?: boolean;
  isOffline: boolean;
  isWifeConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  selectedMonth = 'Outubro de 2026',
  onOpenNewBill,
  onOpenCloudSync,
  onOpenDataRecovery,
  onOpenWifeConnect,
  onManualRefresh,
  isRefreshing = false,
  isOffline,
  isWifeConnected = false,
}) => {
  return (
    <header className="bg-[#0A1128] text-white pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 px-3 sm:px-4 sticky top-0 z-30 shadow-sm border-b border-slate-800/80 w-full flex-shrink-0">
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
                title={isOffline ? 'Modo Offline' : 'Sincronizado'}
                className="flex items-center gap-1 text-[11px] text-teal-300/80 hover:text-teal-200 flex-shrink-0"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
                <Cloud className="w-3.5 h-3.5 text-teal-400" />
              </button>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
              {selectedMonth}
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Recovery Button */}
          {onOpenDataRecovery && (
            <button
              id="btn-header-data-recovery"
              type="button"
              onClick={onOpenDataRecovery}
              title="Recuperador de dados e backups"
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-teal-300 hover:text-white active:scale-90 transition-all border border-slate-700/60"
            >
              <ShieldCheck className="w-4 h-4 text-teal-400" />
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

