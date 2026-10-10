import React, { useState, useEffect } from 'react';
import { 
  X, ArrowLeft, Heart, Smartphone, QrCode, MessageCircle, Copy, Check, 
  RefreshCw, CheckCircle2, ShieldCheck, Wifi, Activity, FileText, CheckCheck,
  AlertCircle, Trash2, ArrowRight, Users, Sparkles
} from 'lucide-react';
import QRCode from 'qrcode';
import { CloudDevice, PaymentPropagationLogEntry } from '../types/finance';
import { cloudkit } from '../services/cloudkitSync';
import { authService } from '../services/authService';

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
  onOpenFamilyAuth?: () => void;
}

export const CloudKitSyncDrawer: React.FC<CloudKitSyncDrawerProps> = ({
  isOpen,
  onClose,
  devices,
  activeDevice,
  onForceSync,
  onOpenFamilyAuth,
}) => {
  const [activeTab, setActiveTab] = useState<'connect' | 'logs'>('connect');
  const [syncing, setSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [propagationLogs, setPropagationLogs] = useState<PaymentPropagationLogEntry[]>([]);
  const [consistencyReport, setConsistencyReport] = useState<{ totalBills: number; inconsistentCount: number; fixedCount: number; report: string[] } | null>(null);

  const wifeShareUrl = typeof window !== 'undefined' ? cloudkit.getWifeShareLink() : '';
  const householdCode = cloudkit.getHouseholdCode();

  const loadLogs = () => {
    setPropagationLogs(cloudkit.getPaymentPropagationLogs());
  };

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
    loadLogs();
  }, [wifeShareUrl, householdCode]);

  useEffect(() => {
    if (!isOpen) return;
    loadLogs();
    const unsub = cloudkit.onSync((event) => {
      if (event.type === 'PAYMENT_LOG_ADDED' || event.type === 'BILLS_UPDATED') {
        loadLogs();
      }
    });
    return () => unsub();
  }, [isOpen]);

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
      loadLogs();
      setSyncSuccessMsg('✅ Sincronizado com sucesso! Todos os dados estão atualizados entre os celulares.');
      setTimeout(() => setSyncSuccessMsg(null), 4000);
    } catch (err: any) {
      setSyncSuccessMsg(`Falha na conexão: ${err?.message || 'Erro de rede'}`);
      setTimeout(() => setSyncSuccessMsg(null), 4000);
    } finally {
      setSyncing(false);
    }
  };

  const handleVerifyConsistency = () => {
    const res = cloudkit.verifyBillIdConsistency();
    setConsistencyReport(res);
    loadLogs();
    setSyncSuccessMsg(res.inconsistentCount > 0 
      ? `✅ Reconciliação executada: ${res.fixedCount} identificadores unificados com sucesso!`
      : '✅ Todos os identificadores de contas já estão 100% consistentes entre os aparelhos.');
    setTimeout(() => setSyncSuccessMsg(null), 5000);
  };

  const handleClearLogs = () => {
    cloudkit.clearPaymentPropagationLogs();
    setPropagationLogs([]);
  };

  const [isRecovering, setIsRecovering] = useState(false);
  const handleRecoverData = async () => {
    setIsRecovering(true);
    try {
      const res = await cloudkit.scanAndRecoverLostData();
      loadLogs();
      setSyncSuccessMsg(`✅ Varredura concluída: ${res.billsRecovered} contas/dívidas e ${res.revenuesRecovered} receitas resgatadas e sincronizadas.`);
      setTimeout(() => setSyncSuccessMsg(null), 5000);
    } catch (e: any) {
      setSyncSuccessMsg('Erro na recuperação: ' + (e?.message || 'Tente novamente'));
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#0E172F] w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto max-h-[min(92dvh,calc(100vh-2rem))]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
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
              {activeTab === 'connect' ? 'Conectar Celular da Esposa' : 'Logs de Propagação CloudKit'}
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

        {/* Tab Selector */}
        <div className="bg-slate-100 dark:bg-[#080E21] p-1.5 flex gap-1 border-b border-slate-200 dark:border-slate-800/80 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('connect')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'connect'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-pink-500" />
            <span>Celular da Esposa</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-teal-500" />
            <span>Logs de Pagamento & IDs ({propagationLogs.length})</span>
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

          {activeTab === 'connect' ? (
            <>
              {/* Family Account (Same Login for Both Phones) Banner */}
              <div className="p-3.5 bg-gradient-to-r from-teal-500/15 via-emerald-500/10 to-teal-500/20 dark:from-teal-950/50 dark:to-emerald-950/40 rounded-2xl border-2 border-teal-500/40 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-teal-600 dark:text-[#00E5B5]" />
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      Conta da Família (Mesmo Login)
                    </span>
                  </div>
                  <span className="text-[9.5px] uppercase font-black px-2 py-0.5 rounded-full bg-teal-500 text-slate-900">
                    {authService.isAuthenticated() ? 'Conectado' : 'Recomendado'}
                  </span>
                </div>
                <p className="text-[11.5px] text-slate-700 dark:text-slate-300 leading-relaxed">
                  Usar o mesmo e-mail e senha no celular do Carlos e no da Paula unifica 100% o banco de dados e elimina quaisquer erros de sincronização.
                </p>
                {onOpenFamilyAuth && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenFamilyAuth();
                    }}
                    className="w-full py-2 px-3 bg-[#00C49F] hover:bg-[#00B290] text-[#0A1128] font-black text-xs rounded-xl shadow-xs active-press transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>{authService.isAuthenticated() ? 'Gerenciar Login da Casa' : 'Entrar com o Mesmo Login (Carlos & Paula)'}</span>
                  </button>
                )}
              </div>

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
                    Você e sua esposa compartilham os mesmos boletos, pagamentos e comprovantes em tempo real.
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
            </>
          ) : (
            /* Logs Tab */
            <div className="space-y-3.5">
              {/* ID Consistency Card */}
              <div className="p-3.5 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 dark:from-teal-950/40 dark:to-emerald-950/30 rounded-2xl border border-teal-500/30 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCheck className="w-4 h-4 text-[#00C49F]" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Identificador Único das Contas
                    </span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                    Consistência Ativa
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Garante que quando você ou sua esposa marcar uma conta como <strong>paga</strong> ou <strong>pendente</strong>, o identificador único seja exatamente idêntico em ambos os aparelhos, sem perda de dados.
                </p>

                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={handleVerifyConsistency}
                    className="flex-1 py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verificar Consistência de IDs</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRecoverData}
                    disabled={isRecovering}
                    className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs whitespace-nowrap disabled:opacity-50"
                    title="Realiza varredura profunda no armazenamento local e nuvem para recuperar dívidas perdidas"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRecovering ? 'animate-spin' : ''}`} />
                    <span>{isRecovering ? 'Varrendo...' : 'Recuperar Dívidas'}</span>
                  </button>

                  {propagationLogs.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearLogs}
                      className="py-2 px-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer"
                      title="Limpar histórico de logs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Limpar</span>
                    </button>
                  )}
                </div>

                {consistencyReport && consistencyReport.report && (
                  <div className="mt-2 p-2.5 bg-white/70 dark:bg-slate-900/70 rounded-xl border border-slate-200/60 dark:border-slate-800 text-[10.5px] space-y-1">
                    {consistencyReport.report.map((line, idx) => (
                      <p key={idx} className="text-slate-700 dark:text-slate-300 font-medium">
                        {line}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Log Entries List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Histórico de Propagação em Tempo Real
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {propagationLogs.length} eventos
                  </span>
                </div>

                {propagationLogs.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <Activity className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Nenhuma alteração de status registrada ainda
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      Assim que você ou sua esposa marcarem uma conta como paga ou pendente, os detalhes técnicos de propagação aparecerão aqui.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                    {propagationLogs.map((log) => {
                      const isPaid = log.newStatus === 'paid';
                      const isWs = log.eventType === 'WS_UPDATE_RECEIVED' || log.eventType === 'WS_BROADCAST_SENT';
                      const isReconciled = log.eventType === 'ID_RECONCILED';
                      
                      let badgeColor = 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
                      let badgeText = 'Alteração Local';
                      if (log.eventType === 'WS_UPDATE_RECEIVED') {
                        badgeColor = 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300';
                        badgeText = 'Recebido do Cônjuge (WS)';
                      } else if (log.eventType === 'WS_BROADCAST_SENT') {
                        badgeColor = 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300';
                        badgeText = 'WebSocket Enviado';
                      } else if (log.eventType === 'SYNC_ACKNOWLEDGED') {
                        badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
                        badgeText = 'Confirmado na Nuvem';
                      } else if (isReconciled) {
                        badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
                        badgeText = 'ID Reconciliado';
                      }

                      return (
                        <div 
                          key={log.id} 
                          className="p-3 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1.5 text-xs shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${badgeColor}`}>
                              {badgeText}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 ml-auto">
                              {log.formattedTime}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="font-extrabold text-slate-900 dark:text-white truncate">
                              "{log.billName}"
                            </span>
                            <span className={`text-[10.5px] font-black px-1.5 py-0.5 rounded-md ${
                              isPaid ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              {isPaid ? 'PAGO ✅' : 'PENDENTE 🔄'}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-tight">
                            {log.details}
                          </p>

                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-200/50 dark:border-slate-800/60">
                            <span>Autor: <strong>{log.actor}</strong> ({log.deviceName})</span>
                            <span className="truncate max-w-[150px]" title={log.billId}>ID: {log.billId}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pinned Bottom Footer */}
        <div className="p-3 bg-slate-50 dark:bg-[#0A1128] border-t border-slate-200 dark:border-slate-800 flex-shrink-0 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#00C49F] flex-shrink-0" />
            <span>Dados e IDs protegidos na nuvem</span>
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

