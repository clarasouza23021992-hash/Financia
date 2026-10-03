import React, { useState, useEffect } from 'react';
import { 
  X, ArrowLeft, Heart, Smartphone, QrCode, MessageCircle, Copy, Check, 
  RefreshCw, CheckCircle2, ShieldCheck, Wifi
} from 'lucide-react';
import QRCode from 'qrcode';
import { CloudDevice } from '../types/finance';
import { cloudkit } from '../services/cloudkitSync';

interface CloudKitSyncDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  devices: CloudDevice[];
  activeDevice: CloudDevice;
  onSwitchDevice?: (deviceId: string) => void;
  isOffline?: boolean;
  onToggleOffline?: () => void;
  conflictLogs?: any[];
  onForceSync: () => Promise<void>;
  onUpdateDevice?: (deviceId: string, updates: Partial<CloudDevice>) => void;
  onRemoveDevice?: (deviceId: string) => void;
  onOpenBackup?: () => void;
}

export const CloudKitSyncDrawer: React.FC<CloudKitSyncDrawerProps> = ({
  isOpen,
  onClose,
  devices,
  activeDevice,
  onForceSync,
}) => {
  const [syncing, setSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  const wifeShareUrl = typeof window !== 'undefined' ? cloudkit.getWifeShareLink() : '';
  const householdCode = cloudkit.getHouseholdCode();

  useEffect(() => {
    if (wifeShareUrl) {
      QRCode.toDataURL(wifeShareUrl, {
        width: 240,
        margin: 1,
        color: {
          dark: '#0A1128',
          light: '#FFFFFF',
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error('Erro ao gerar QRCode:', err));
    }
  }, [wifeShareUrl, householdCode]);

  if (!isOpen) return null;

  const handleShareWifeWhatsApp = () => {
    const text = `Oi amor! ❤️ Aqui está o link para sincronizar as contas e finanças da nossa casa no seu celular:\n\n${wifeShareUrl}\n\nÉ só abrir no seu celular para acompanharmos contas, pagamentos e comprovantes em tempo real!`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(wifeShareUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = wifeShareUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSyncClick = async () => {
    setSyncing(true);
    setSyncSuccessMsg(null);
    try {
      await onForceSync();
      setSyncSuccessMsg('✅ Sincronizado com sucesso! Todos os dados estão atualizados entre os celulares.');
      setTimeout(() => setSyncSuccessMsg(null), 4000);
    } catch (err: any) {
      setSyncSuccessMsg(`Falha na conexão: ${err?.message || 'Erro de rede'}`);
      setTimeout(() => setSyncSuccessMsg(null), 4000);
    } finally {
      setSyncing(false);
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
        {/* Top Header - Always visible with Clear Back Button */}
        <div className="bg-[#0A1128] text-white px-4 sm:px-5 py-3.5 flex items-center justify-between border-b border-slate-800 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs active-press transition-colors cursor-pointer"
            title="Voltar para a página anterior"
          >
            <ArrowLeft className="w-4 h-4 text-[#00C49F]" />
            <span>Voltar</span>
          </button>

          <div className="text-center min-w-0 px-2">
            <h2 className="text-xs sm:text-sm font-extrabold tracking-tight truncate">
              Conectar Celular da Esposa
            </h2>
            <p className="text-[10px] text-teal-400 font-semibold truncate flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Sincronização em Tempo Real</span>
            </p>
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

        {/* Scrollable Clean Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1 min-h-0 overscroll-contain">
          {/* Feedback message */}
          {syncSuccessMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{syncSuccessMsg}</span>
            </div>
          )}

          {/* Simple Status Banner */}
          <div className="p-3 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/15 dark:from-emerald-950/40 dark:to-teal-950/30 rounded-2xl border border-emerald-500/30 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 font-bold">
              <Heart className="w-4.5 h-4.5 fill-current text-pink-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Celulares da Casa Pareados</span>
                <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 rounded-full font-bold">
                  Ativo
                </span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                Você e sua esposa compartilham os mesmos boletos, pagamentos e comprovantes.
              </p>
            </div>
          </div>

          {/* QR Code and Instructions */}
          <div className="bg-slate-50 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
            <div className="space-y-1">
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white">
                Como conectar o celular dela:
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                Aponte a câmera do celular da sua esposa para o QR Code abaixo ou envie o link pelo WhatsApp.
              </p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center py-1">
              {qrCodeDataUrl ? (
                <div className="p-2.5 bg-white rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm inline-block">
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code para conectar o celular da esposa"
                    className="w-36 h-36 object-contain mx-auto"
                  />
                  <div className="text-[9.5px] text-center font-bold text-slate-500 mt-1 flex items-center justify-center gap-1">
                    <QrCode className="w-3 h-3 text-slate-400" />
                    <span>Aponte a Câmera do Celular</span>
                  </div>
                </div>
              ) : (
                <div className="w-36 h-36 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 mx-auto">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={handleShareWifeWhatsApp}
                className="flex-1 py-2.5 px-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs active-press transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>Enviar pelo WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 active-press transition-all cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-600">Link Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>Copiar Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sync Now button */}
          <button
            type="button"
            onClick={handleSyncClick}
            disabled={syncing}
            className="w-full py-2.5 px-4 bg-[#00C49F] hover:bg-[#00b290] disabled:opacity-60 text-[#0A1128] font-black rounded-xl text-xs active-press flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Sincronizando com o outro celular...' : 'Atualizar & Sincronizar Agora'}</span>
          </button>
        </div>

        {/* Pinned Bottom Footer - Guaranteed Way to Return */}
        <div className="p-3 bg-slate-50 dark:bg-[#0A1128] border-t border-slate-200 dark:border-slate-800 flex-shrink-0 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#00C49F] flex-shrink-0" />
            <span>Dados protegidos na nuvem</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-[#0A1128] font-extrabold text-xs rounded-xl active-press shadow-xs transition-all cursor-pointer"
          >
            ← Voltar para as Contas
          </button>
        </div>
      </div>
    </div>
  );
};
