import React, { useState, useEffect } from 'react';
import { 
  X, Heart, Smartphone, QrCode, MessageCircle, Copy, Check, 
  RefreshCw, CheckCircle2, AlertCircle, ExternalLink, ShieldCheck, Wifi
} from 'lucide-react';
import QRCode from 'qrcode';
import { CloudDevice } from '../types/finance';
import { cloudkit } from '../services/cloudkitSync';

interface WifeConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isWifeConnected: boolean;
  wifeDevice: CloudDevice | null;
  onDisconnectWife?: (deviceId: string) => void;
  onForceSync: () => Promise<void>;
}

export const WifeConnectionModal: React.FC<WifeConnectionModalProps> = ({
  isOpen,
  onClose,
  isWifeConnected,
  wifeDevice,
  onDisconnectWife,
  onForceSync,
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [syncing, setSyncing] = useState(false);

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

  const handleShareWhatsApp = () => {
    const text = `Oi amor! ❤️ Aqui está o link para conectar o seu celular às finanças e contas da nossa casa:\n\n${wifeShareUrl}\n\nÉ só abrir no seu celular (pode adicionar na tela de início). Assim que você abrir, nossos celulares ficam sincronizados na hora!`;
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

  const handleTestInNewTab = () => {
    window.open(wifeShareUrl, '_blank');
  };

  const handleManualCheck = async () => {
    setSyncing(true);
    try {
      await onForceSync();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white dark:bg-[#0E172F] w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#0A1128] text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                Conectar o Celular da Esposa
              </h2>
              <p className="text-[11px] text-slate-400">
                Pareamento real para acompanharem as contas juntos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Real Status Banner */}
          {isWifeConnected && wifeDevice ? (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      Celular da Esposa Conectado!
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    {wifeDevice.name} ({wifeDevice.model}) • {wifeDevice.lastActive || 'Ativo'}
                  </p>
                </div>
              </div>
              {onDisconnectWife && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Deseja realmente desconectar o celular da esposa?')) {
                      onDisconnectWife(wifeDevice.id);
                    }
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-100 dark:bg-rose-950/60 rounded-lg"
                >
                  Desconectar
                </button>
              )}
            </div>
          ) : (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-xs">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-rose-900 dark:text-rose-200">
                      Celular da Esposa: NÃO CONECTADO
                    </span>
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                  </div>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300">
                    Aguardando ela escanear o QR Code ou clicar no link
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleManualCheck}
                disabled={syncing}
                title="Verificar se ela já conectou"
                className="p-2 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}

          {/* Como Funciona a Conexão Real */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Escolha como conectar o celular dela:
            </h3>

            {/* Opção 1: QR Code para a Câmera */}
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4">
              {qrCodeDataUrl ? (
                <div className="p-2 bg-white rounded-xl border border-slate-300 shadow-xs flex-shrink-0">
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code para parear o celular da esposa"
                    className="w-32 h-32 object-contain"
                  />
                  <div className="text-[9px] text-center font-bold text-slate-500 mt-1 flex items-center justify-center gap-1">
                    <QrCode className="w-3 h-3 text-slate-400" />
                    <span>Câmera da Esposa</span>
                  </div>
                </div>
              ) : (
                <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                </div>
              )}

              <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  1. Aponte a Câmera do Celular Dela
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Ela só precisa abrir o aplicativo de <b>Câmera</b> do iPhone ou Android dela e apontar para este QR Code.
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-500">
                  O app abrirá automaticamente conectado à mesma residência (Código: <b>{householdCode}</b>).
                </p>
              </div>
            </div>

            {/* Opção 2: WhatsApp */}
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  2. Enviar Convite pelo WhatsApp
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Dispara a mensagem de convite com o link de acesso direto.
                </p>
              </div>
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="px-3.5 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs active-press transition-all flex-shrink-0"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>Enviar no WhatsApp</span>
              </button>
            </div>

            {/* Opção 3: Copiar Link */}
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  3. Copiar Link de Acesso
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                  {wifeShareUrl}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 active-press transition-all flex-shrink-0"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-600">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>

            {/* Opção 4: Testar Conexão em Nova Aba */}
            <div className="p-3 bg-pink-50/50 dark:bg-pink-950/20 rounded-xl border border-pink-200/60 dark:border-pink-900/40 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Quer testar a conexão agora?
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Abra uma nova aba simulando o celular da sua esposa para ver a sincronização imediata.
                </p>
              </div>
              <button
                type="button"
                onClick={handleTestInNewTab}
                className="px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs rounded-xl flex items-center gap-1 active-press flex-shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Testar em Nova Aba</span>
              </button>
            </div>
          </div>

          {/* Explicação de Privacidade e Dados */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600 flex-shrink-0" />
            <span>
              Ao se conectar, o celular dela compartilha a mesma base de contas da casa com segurança, sem expor senhas bancárias.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 text-white font-bold text-xs rounded-xl active-press"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
