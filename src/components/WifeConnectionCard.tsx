import React from 'react';
import { Heart, Smartphone, ArrowRight, CheckCircle2, QrCode } from 'lucide-react';
import { CloudDevice } from '../types/finance';

interface WifeConnectionCardProps {
  isWifeConnected: boolean;
  wifeDevice: CloudDevice | null;
  onOpenConnectModal: () => void;
}

export const WifeConnectionCard: React.FC<WifeConnectionCardProps> = ({
  isWifeConnected,
  wifeDevice,
  onOpenConnectModal,
}) => {
  if (isWifeConnected && wifeDevice) {
    return (
      <div className="mx-3 my-2 p-3 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-300/80 dark:border-emerald-800/60 rounded-2xl flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Celular da Esposa Conectado
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {wifeDevice.name} ({wifeDevice.model}) • Sincronização em tempo real ativa
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenConnectModal}
          className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold flex items-center gap-1 active-press"
        >
          <span>Gerenciar</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mx-3 my-2 p-3.5 bg-gradient-to-r from-pink-50 via-rose-50/70 to-purple-50 dark:from-pink-950/30 dark:via-rose-950/20 dark:to-purple-950/20 border border-pink-200/90 dark:border-pink-900/40 rounded-2xl flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-2xl bg-pink-500/20 text-pink-600 dark:text-pink-400 flex items-center justify-center flex-shrink-0 relative">
          <Heart className="w-4 h-4 fill-current" />
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Conectar Celular da Esposa
            </span>
            <span className="text-[10px] bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold px-1.5 py-0.2 rounded-md">
              Não Conectado
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            Aponte a câmera ou envie o link para parear as contas com ela
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenConnectModal}
        className="px-3 py-2 bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm shadow-pink-500/25 active-press flex-shrink-0"
      >
        <QrCode className="w-3.5 h-3.5" />
        <span>Conectar</span>
      </button>
    </div>
  );
};
