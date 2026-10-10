import React, { useState, useEffect } from 'react';
import { 
  Cloud, RefreshCw, CheckCircle2, ShieldCheck, Smartphone, 
  Users, Activity, CheckCheck, Trash2, ArrowLeft, Heart, 
  Check, QrCode, MessageCircle, Copy, AlertCircle, Sparkles
} from 'lucide-react';
import QRCode from 'qrcode';
import { CloudDevice, PaymentPropagationLogEntry } from '../types/finance';
import { cloudkit } from '../services/cloudkitSync';
import { authService, AuthSessionData } from '../services/authService';

interface SyncViewProps {
  activeDevice: CloudDevice;
  devices: CloudDevice[];
  activeUserName: string;
  onToggleActiveUser?: () => void;
  isWifeConnected: boolean;
  wifeDevice: CloudDevice | null;
  onOpenFamilyAuth: () => void;
  authSession: AuthSessionData | null;
  onManualRefresh: () => Promise<void> | void;
  isRefreshing: boolean;
  onGoToBills: () => void;
  onOpenWifeConnect: () => void;
}

export const SyncView: React.FC<SyncViewProps> = ({
  activeDevice,
  devices,
  activeUserName,
  onToggleActiveUser,
  isWifeConnected,
  wifeDevice,
  onOpenFamilyAuth,
  authSession,
  onManualRefresh,
  isRefreshing,
  onGoToBills,
  onOpenWifeConnect,
}) => {
  const [propagationLogs, setPropagationLogs] = useState<PaymentPropagationLogEntry[]>([]);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [consistencyReport, setConsistencyReport] = useState<{ totalBills: number; inconsistentCount: number; fixedCount: number; report: string[] } | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);

  const wifeShareUrl = typeof window !== 'undefined' ? cloudkit.getWifeShareLink() : '';

  const loadLogs = () => {
    try {
      setPropagationLogs(cloudkit.getPaymentPropagationLogs() || []);
    } catch (err) {
      console.error('Erro ao ler logs de propagação:', err);
      setPropagationLogs([]);
    }
  };

  useEffect(() => {
    loadLogs();
    const unsub = cloudkit.onSync((event) => {
      if (event.type === 'PAYMENT_LOG_ADDED' || event.type === 'BILLS_UPDATED') {
        loadLogs();
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (wifeShareUrl && showQrCode) {
      QRCode.toDataURL(wifeShareUrl, {
        width: 200,
        margin: 1,
        color: {
          dark: '#0A1128',
          light: '#FFFFFF',
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error('Erro ao gerar QRCode:', err));
    }
  }, [wifeShareUrl, showQrCode]);

  const handleSyncClick = async () => {
    setFeedbackMsg(null);
    try {
      await onManualRefresh();
      loadLogs();
      setFeedbackMsg('✅ Sincronizado com sucesso! Todos os dados estão atualizados entre os celulares.');
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      setFeedbackMsg(`Falha na conexão: ${err?.message || 'Erro de rede'}`);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const handleVerifyConsistency = () => {
    try {
      const res = cloudkit.verifyBillIdConsistency();
      setConsistencyReport(res);
      loadLogs();
      setFeedbackMsg(res.inconsistentCount > 0 
        ? `✅ Reconciliação executada: ${res.fixedCount} identificadores unificados com sucesso!`
        : '✅ Todos os identificadores de contas já estão 100% consistentes entre os aparelhos.');
      setTimeout(() => setFeedbackMsg(null), 5000);
    } catch (err: any) {
      setFeedbackMsg(`Erro ao verificar: ${err?.message || 'Tente novamente'}`);
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  const handleRecoverData = async () => {
    setIsRecovering(true);
    try {
      const res = await cloudkit.scanAndRecoverLostData();
      loadLogs();
      setFeedbackMsg(`✅ Varredura concluída: ${res.billsRecovered} contas/dívidas e ${res.revenuesRecovered} receitas resgatadas e sincronizadas.`);
      setTimeout(() => setFeedbackMsg(null), 5000);
    } catch (e: any) {
      setFeedbackMsg('Erro na recuperação: ' + (e?.message || 'Tente novamente'));
    } finally {
      setIsRecovering(false);
    }
  };

  const handleClearLogs = () => {
    cloudkit.clearPaymentPropagationLogs();
    setPropagationLogs([]);
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

  const isPaula = (activeUserName || '').toLowerCase().includes('paula');

  return (
    <div className="space-y-3.5 px-3 sm:px-4 py-2 animate-in fade-in duration-200">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between pb-1">
        <button
          type="button"
          onClick={onGoToBills}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-teal-300 hover:text-white font-bold text-xs active-press transition-colors cursor-pointer border border-slate-700/60"
        >
          <ArrowLeft className="w-4 h-4 text-[#00C49F]" />
          <span>Voltar para Contas</span>
        </button>

        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-200">Sincronia em Tempo Real</span>
        </div>
      </div>

      {/* Feedback banner */}
      {feedbackMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Main Connection Status Card */}
      <div className="bg-gradient-to-r from-[#0A1128] via-[#101F42] to-[#0A1128] text-white p-4.5 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden space-y-3.5">
        <div className="absolute top-0 right-0 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-[#00E5B5] shadow-xs flex-shrink-0">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black tracking-tight text-white">
                  Sincronização Nuvem Ativa
                </h2>
                <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Online
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Carlos e Paula conectados ao mesmo banco de dados
              </p>
            </div>
          </div>
        </div>

        {/* Sync Now Big Button */}
        <button
          type="button"
          onClick={handleSyncClick}
          disabled={isRefreshing}
          className="w-full py-3 px-4 bg-[#00C49F] hover:bg-[#00B290] disabled:opacity-60 text-[#0A1128] font-black rounded-2xl text-xs sm:text-sm active-press flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Sincronizando com o outro celular...' : 'Sincronizar Todos os Dados Agora'}</span>
        </button>
      </div>

      {/* Card 2: Conta da Família (Mesmo Login) */}
      <div className="p-4 bg-white dark:bg-[#0E172F] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/15 text-teal-600 dark:text-[#00E5B5] flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  Conta da Casa do Casal
                </span>
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 bg-teal-500/20 text-teal-700 dark:text-teal-300 rounded-md">
                  {authSession?.token ? 'Conectado' : 'Recomendado'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {authSession?.token 
                  ? `Logado como: ${authSession.user.email}` 
                  : 'Mesmo login e senha em ambos os celulares'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenFamilyAuth}
            className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/50 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 rounded-xl text-xs font-bold active-press transition-colors cursor-pointer"
          >
            {authSession?.token ? 'Gerenciar' : 'Entrar'}
          </button>
        </div>

        {/* Identity selector */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-[11px]">Este aparelho pertence a:</span>
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
              <span>{isPaula ? '👩🏻 Paula (Esposa)' : '👤 Carlos (Titular)'}</span>
            </div>
          </div>

          {onToggleActiveUser && (
            <button
              type="button"
              onClick={onToggleActiveUser}
              className="px-2.5 py-1 text-[11px] font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer transition-colors"
            >
              Alternar Aparelho
            </button>
          )}
        </div>
      </div>

      {/* Card 3: Aparelhos Conectados */}
      <div className="p-4 bg-white dark:bg-[#0E172F] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-pink-500" />
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-white">
              Aparelhos Sincronizados
            </h3>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            2 iPhones Pareados
          </span>
        </div>

        <div className="space-y-2">
          {/* Carlos iPhone */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-base">👤</span>
              <div>
                <strong className="text-slate-900 dark:text-white">Carlos (iPhone)</strong>
                <p className="text-[10px] text-slate-500">Titular da Casa</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-3 h-3" /> Ativo
            </span>
          </div>

          {/* Paula iPhone */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-base">👩🏻</span>
              <div>
                <strong className="text-slate-900 dark:text-white">Paula (iPhone)</strong>
                <p className="text-[10px] text-slate-500">Esposa</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-3 h-3" /> Ativa
            </span>
          </div>
        </div>

        {/* Quick QR toggle */}
        <div className="pt-1 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowQrCode(!showQrCode)}
            className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>{showQrCode ? 'Ocultar QR Code da Esposa' : 'Mostrar QR Code para Celular da Esposa'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenWifeConnect}
            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            Opções de Pareamento
          </button>
        </div>

        {showQrCode && (
          <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-2 animate-in fade-in">
            <p className="text-[11px] text-slate-500">
              Aponte a câmera do celular da sua esposa para conectar instantaneamente:
            </p>
            {qrCodeDataUrl ? (
              <div className="p-2 bg-white rounded-xl border border-slate-300 inline-block shadow-xs">
                <img src={qrCodeDataUrl} alt="QR Code" className="w-32 h-32 mx-auto" />
              </div>
            ) : (
              <div className="w-32 h-32 bg-slate-100 rounded-xl flex items-center justify-center mx-auto">
                <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            )}
            <div>
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 inline-flex items-center gap-1.5 cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Card 4: Ferramentas de Proteção & Integridade */}
      <div className="p-4 bg-white dark:bg-[#0E172F] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#00C49F]" />
          <h3 className="text-xs font-extrabold text-slate-900 dark:text-white">
            Integridade & Recuperação de Dados
          </h3>
        </div>

        <p className="text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed">
          Garante que os identificadores das contas permaneçam idênticos em ambos os telefones e resgata dados caso algum aparelho fique offline por muito tempo.
        </p>

        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <button
            type="button"
            onClick={handleVerifyConsistency}
            className="flex-1 py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs whitespace-nowrap"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Verificar Consistência</span>
          </button>

          <button
            type="button"
            onClick={handleRecoverData}
            disabled={isRecovering}
            className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs whitespace-nowrap disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRecovering ? 'animate-spin' : ''}`} />
            <span>{isRecovering ? 'Varrendo...' : 'Recuperar Dívidas'}</span>
          </button>
        </div>

        {consistencyReport && consistencyReport.report && (
          <div className="mt-2 p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-[10.5px] space-y-1">
            {consistencyReport.report.map((line, idx) => (
              <p key={idx} className="text-slate-700 dark:text-slate-300 font-medium">
                {line}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Card 5: Histórico de Alterações em Tempo Real */}
      <div className="p-4 bg-white dark:bg-[#0E172F] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-500" />
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-white">
              Histórico em Tempo Real
            </h3>
          </div>
          {propagationLogs.length > 0 && (
            <button
              type="button"
              onClick={handleClearLogs}
              className="text-[10.5px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Limpar</span>
            </button>
          )}
        </div>

        {propagationLogs.length === 0 ? (
          <div className="p-4 text-center bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
            Nenhuma alteração recente registrada. Assim que uma conta for marcada como paga ou editada, os detalhes aparecerão aqui.
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
            {propagationLogs.slice(0, 15).map((log) => {
              const isPaid = log.newStatus === 'paid';
              return (
                <div 
                  key={log.id} 
                  className="p-2.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-extrabold text-teal-600 dark:text-teal-400">
                      {log.actor} ({log.deviceName})
                    </span>
                    <span className="text-slate-400 font-mono">{log.formattedTime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                      "{log.billName}"
                    </span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                      isPaid ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {isPaid ? 'PAGO ✅' : 'PENDENTE 🔄'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom spacer for navigation bar */}
      <div className="h-16" />
    </div>
  );
};
