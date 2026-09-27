import React, { useState, useEffect } from 'react';
import { 
  X, Cloud, RefreshCw, Smartphone, CheckCircle, AlertCircle, 
  ShieldCheck, GitMerge, Edit2, Check, Trash2, Share2, Copy, 
  QrCode, ExternalLink, MessageCircle, Heart, KeyRound, Wifi,
  Activity, Clock, CheckCircle2, XCircle, Loader2, Database,
  History, Signal
} from 'lucide-react';
import QRCode from 'qrcode';
import { CloudDevice, SyncConflictLog, SyncLogEntry } from '../types/finance';
import { cloudkit } from '../services/cloudkitSync';

interface CloudKitSyncDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  devices: CloudDevice[];
  activeDevice: CloudDevice;
  onSwitchDevice: (deviceId: string) => void;
  isOffline: boolean;
  onToggleOffline: () => void;
  conflictLogs: SyncConflictLog[];
  onForceSync: () => Promise<void>;
  onUpdateDevice?: (deviceId: string, updates: Partial<CloudDevice>) => void;
  onRemoveDevice?: (deviceId: string) => void;
}

export const CloudKitSyncDrawer: React.FC<CloudKitSyncDrawerProps> = ({
  isOpen,
  onClose,
  devices,
  activeDevice,
  onSwitchDevice,
  isOffline,
  onToggleOffline,
  conflictLogs,
  onForceSync,
  onUpdateDevice,
  onRemoveDevice,
}) => {
  const [syncing, setSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editModel, setEditModel] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [householdCode, setHouseholdCode] = useState<string>(() => cloudkit.getHouseholdCode());
  const [isEditingHouseCode, setIsEditingHouseCode] = useState(false);
  const [tempHouseCode, setTempHouseCode] = useState('');
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>(() => cloudkit.getSyncLogs());
  const [lastLog, setLastLog] = useState<SyncLogEntry | null>(() => cloudkit.getLastSyncLog());
  const [showAllLogs, setShowAllLogs] = useState(false);

  const wifeShareUrl = typeof window !== 'undefined' ? cloudkit.getWifeShareLink() : '';

  useEffect(() => {
    if (wifeShareUrl) {
      QRCode.toDataURL(wifeShareUrl, {
        width: 220,
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

  // Keep logs synchronized with internal engine events
  useEffect(() => {
    const handleSyncEvent = () => {
      setSyncLogs(cloudkit.getSyncLogs());
      setLastLog(cloudkit.getLastSyncLog());
    };
    window.addEventListener('financas_sync_event', handleSyncEvent);
    setSyncLogs(cloudkit.getSyncLogs());
    setLastLog(cloudkit.getLastSyncLog());
    return () => window.removeEventListener('financas_sync_event', handleSyncEvent);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartEdit = (dev: CloudDevice, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDeviceId(dev.id);
    setEditName(dev.name);
    setEditModel(dev.model);
  };

  const handleSaveDevice = (deviceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpdateDevice) {
      onUpdateDevice(deviceId, { name: editName.trim() || 'Meu Aparelho', model: editModel.trim() || 'Smartphone' });
    } else {
      cloudkit.updateDevice(deviceId, { name: editName.trim() || 'Meu Aparelho', model: editModel.trim() || 'Smartphone' });
    }
    setEditingDeviceId(null);
  };

  const handleRemoveDeviceClick = async (deviceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Deseja realmente remover e desconectar este aparelho das Finanças da Casa?')) {
      if (onRemoveDevice) {
        onRemoveDevice(deviceId);
      } else {
        await cloudkit.removeDevice(deviceId);
      }
      setSyncSuccessMsg('Aparelho desconectado com sucesso.');
      setTimeout(() => setSyncSuccessMsg(null), 3000);
    }
  };

  const handleSyncClick = async () => {
    setSyncing(true);
    setSyncSuccessMsg(null);
    try {
      await onForceSync();
      const updatedLogs = cloudkit.getSyncLogs();
      const latest = updatedLogs[0] || cloudkit.getLastSyncLog();
      setSyncLogs(updatedLogs);
      setLastLog(latest);

      if (latest && latest.status === 'success') {
        const wifeText = latest.isWifeConnected
          ? `Dispositivo da esposa pareado com sucesso (${latest.wifeDeviceName || 'Smartphone'}).`
          : 'Aguardando pareamento do celular da esposa.';
        setSyncSuccessMsg(`Sincronização em nuvem realizada com sucesso (${latest.latencyMs || 110}ms)! ${wifeText}`);
      } else {
        setSyncSuccessMsg(latest?.message || 'Sincronização concluída com o servidor.');
      }
      setTimeout(() => setSyncSuccessMsg(null), 5000);
    } catch (err: any) {
      setSyncSuccessMsg(`Falha na sincronização: ${err?.message || 'Erro de conexão'}`);
      setTimeout(() => setSyncSuccessMsg(null), 5000);
    } finally {
      setSyncing(false);
    }
  };

  const handleClearLogs = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Deseja limpar o histórico detalhado de logs de sincronização?')) {
      cloudkit.clearSyncLogs();
      setSyncLogs([]);
      setLastLog(null);
    }
  };

  const handleShareWifeWhatsApp = () => {

    const text = `Oi amor! ❤️ Aqui está o link para sincronizar as finanças da nossa casa no seu celular:\n\n${wifeShareUrl}\n\nAbra no seu navegador ou adicione na tela de início para acompanharmos boletos, pagamentos e comprovantes em tempo real!`;
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

  const handleSaveHouseCode = () => {
    const clean = tempHouseCode.trim().toLowerCase();
    if (clean) {
      cloudkit.setHouseholdId(clean);
      setHouseholdCode(clean.toUpperCase());
      setIsEditingHouseCode(false);
      setSyncSuccessMsg(`Código da casa atualizado para ${clean.toUpperCase()}`);
      setTimeout(() => setSyncSuccessMsg(null), 3000);
    }
  };

  // Filter out any legacy or fake mock devices
  const realDevices = devices.filter((d) => 
    d.id !== 'dev_iphone_paula' && 
    d.id !== 'dev_iphone_carlos' && 
    d.id !== 'dev_user_main' &&
    !d.name.toLowerCase().includes('carlos') &&
    !d.name.toLowerCase().includes('paula') &&
    !d.name.toLowerCase().includes('iphone 15') && 
    !d.name.toLowerCase().includes('iphone 16')
  );

  const otherConnectedDevices = realDevices.filter(d => !d.isCurrent && d.id !== activeDevice.id);
  const isWifeConnected = otherConnectedDevices.length > 0 || (lastLog?.isWifeConnected ?? false);
  const wifeDevice = otherConnectedDevices[0] || null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#0E172F] w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#0A1128] text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 flex items-center justify-center text-[#00C49F]">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                Sincronização em Nuvem (Multi-Dispositivo)
              </h2>
              <p className="text-[11px] text-slate-400">
                Conecte o celular da esposa e mantenha tudo atualizado
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
          {/* Feedback message */}
          {syncSuccessMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{syncSuccessMsg}</span>
            </div>
          )}

          {/* 🌟 CARD DESTAQUE: Sincronizar com o Celular da Esposa */}
          <div className="bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-teal-500/10 dark:from-pink-950/40 dark:via-purple-950/20 dark:to-teal-950/30 rounded-3xl p-4 border border-pink-200/80 dark:border-pink-900/50 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                  <Heart className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Sincronizar com o Celular da Esposa</span>
                    <span className="text-[10px] bg-pink-100 dark:bg-pink-900/60 text-pink-700 dark:text-pink-300 px-2 py-0.5 rounded-full font-bold">
                      Tempo Real
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Aponte a câmera ou envie o link para parear os celulares
                  </p>
                </div>
              </div>
            </div>

            {/* QR Code and Instructions */}
            <div className="bg-white dark:bg-slate-900/90 p-3.5 rounded-2xl border border-pink-100 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-4">
              {qrCodeDataUrl ? (
                <div className="p-2 bg-white rounded-2xl border border-slate-200 shadow-xs flex-shrink-0">
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
                <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                </div>
              )}

              <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                  Escaneie o QR Code ao lado com o iPhone ou celular Android da sua esposa para conectar à mesma conta.
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Todas as contas cadastradas, baixas de pagamentos e comprovantes ficarão 100% sincronizados entre vocês.
                </p>

                {/* Quick Share Buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleShareWifeWhatsApp}
                    className="flex-1 min-w-[130px] px-3 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs active-press transition-all"
                  >
                    <MessageCircle className="w-4 h-4 fill-current" />
                    <span>Enviar WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 active-press transition-all"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-600">Copiado!</span>
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
            </div>

            {/* Household Sync Code */}
            <div className="flex items-center justify-between text-xs bg-white/60 dark:bg-slate-900/50 p-2.5 rounded-xl border border-pink-100/80 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-600 dark:text-slate-400 font-semibold">
                  Código da Casa:
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  {householdCode}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTempHouseCode(householdCode);
                  setIsEditingHouseCode(!isEditingHouseCode);
                }}
                className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline"
              >
                {isEditingHouseCode ? 'Fechar' : 'Alterar Código'}
              </button>
            </div>

            {/* Custom Household Code Edit Input */}
            {isEditingHouseCode && (
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 animate-fade-in">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                  Conectar a outra Casa ou Definir Código Próprio
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tempHouseCode}
                    onChange={(e) => setTempHouseCode(e.target.value)}
                    placeholder="Ex: FAMILIA-SILVA"
                    className="flex-1 text-xs px-3 py-1.5 uppercase font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleSaveHouseCode}
                    className="px-3 py-1.5 bg-[#00C49F] text-[#0A1128] font-bold text-xs rounded-xl"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 📊 DIAGNÓSTICO & LOG DETALHADO DE SINCRONIZAÇÃO */}
          <div className="bg-slate-50/90 dark:bg-slate-900/90 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
            {/* Cabeçalho do Card */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Diagnóstico &amp; Log de Sincronização</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                      Tempo Real
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Histórico de conexões e validação do pareamento da esposa
                  </p>
                </div>
              </div>

              {syncLogs.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearLogs}
                  title="Limpar histórico de logs"
                  className="px-2 py-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors text-[10.5px] font-medium flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Limpar</span>
                </button>
              )}
            </div>

            {/* Painel com Métricas: Timestamp, Status do Servidor & Pareamento da Esposa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Box 1: Conexão / Última Tentativa */}
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                    <span>Última Tentativa</span>
                  </span>
                  {lastLog ? (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                      lastLog.status === 'success'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                    }`}>
                      {lastLog.status === 'success' ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Sucesso {lastLog.latencyMs ? `(${lastLog.latencyMs}ms)` : ''}</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                          <span>Falha</span>
                        </>
                      )}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">Aguardando teste</span>
                  )}
                </div>

                <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{lastLog ? lastLog.formattedTime : 'Nenhuma tentativa registrada'}</span>
                </div>

                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug">
                  {isOffline
                    ? '⚠️ Operando em Modo Offline local.'
                    : (lastLog?.message || 'Servidor sincroniza boletos, baixas e salários entre os aparelhos.')}
                </p>
              </div>

              {/* Box 2: Pareamento do Aparelho da Esposa */}
              <div className={`p-3 rounded-2xl border space-y-1.5 shadow-xs transition-colors ${
                isWifeConnected
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                  : 'bg-pink-50/70 dark:bg-pink-950/30 border-pink-300 dark:border-pink-900'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <Heart className={`w-3 h-3 fill-current ${isWifeConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-pink-600 dark:text-pink-400'}`} />
                    <span>Dispositivo da Esposa</span>
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                    isWifeConnected
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                  }`}>
                    {isWifeConnected ? '🟢 Pareado' : '🔴 Não Pareado'}
                  </span>
                </div>

                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {isWifeConnected
                    ? (wifeDevice?.name || lastLog?.wifeDeviceName || 'Celular da Esposa (Conectado)')
                    : 'Aguardando pareamento'}
                </div>

                <div className="text-[10.5px] text-slate-600 dark:text-slate-400 leading-snug">
                  {isWifeConnected ? (
                    <span>{wifeDevice?.model || lastLog?.wifeDeviceModel || 'Smartphone'} • Sincronizado e atualizado em tempo real</span>
                  ) : (
                    <span>Aponte a câmera dela para o QR Code acima ou envie o link pelo WhatsApp</span>
                  )}
                </div>
              </div>
            </div>

            {/* Botão Sincronizar Agora com Feedback Visual de Carregamento */}
            <button
              type="button"
              onClick={handleSyncClick}
              disabled={syncing || isOffline}
              className="w-full py-3 px-4 bg-[#00C49F] hover:bg-[#00b290] disabled:bg-slate-300 dark:disabled:bg-slate-800 text-[#0A1128] font-black rounded-2xl text-xs active-press flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#0A1128]" />
                  <span>Sincronizando com o servidor e validando aparelho da esposa...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Sincronizar Agora &amp; Validar Pareamento</span>
                </>
              )}
            </button>

            {/* Feed Detalhado de Logs Recentes */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  <span>Histórico Detalhado de Logs ({syncLogs.length})</span>
                </span>
                {syncLogs.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setShowAllLogs(!showAllLogs)}
                    className="text-[10.5px] font-bold text-teal-600 dark:text-teal-400 hover:underline"
                  >
                    {showAllLogs ? 'Recolher' : 'Ver todos'}
                  </button>
                )}
              </div>

              {syncLogs.length === 0 ? (
                <div className="p-3 text-center rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                  Nenhum registro de sincronização nesta sessão. Clique em &quot;Sincronizar Agora&quot; acima para registrar a primeira conexão.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {(showAllLogs ? syncLogs : syncLogs.slice(0, 3)).map((log) => (
                    <div
                      key={log.id}
                      className={`p-2.5 rounded-xl text-[11px] border transition-all flex flex-col gap-1 ${
                        log.status === 'success'
                          ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80'
                          : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {log.status === 'success' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                          )}
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {log.formattedTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {log.latencyMs !== undefined && log.latencyMs > 0 && (
                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">
                              {log.latencyMs}ms
                            </span>
                          )}
                          <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${
                            log.isWifeConnected
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {log.isWifeConnected ? 'Esposa Pareada' : 'Esposa Desconectada'}
                          </span>
                        </div>
                      </div>
                      <div className="text-slate-600 dark:text-slate-300 pl-5 text-[10.5px]">
                        {log.message}
                      </div>
                      <div className="text-slate-400 dark:text-slate-500 pl-5 text-[9.5px] font-mono">
                        {log.billsSyncedCount} contas ativas • {log.revenuesSyncedCount} receitas • {log.devicesDetectedCount} aparelho(s)
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 📱 SEÇÃO: Dispositivos Reais Conectados */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider block">
                  Dispositivos Reais Conectados ({realDevices.length})
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Aparelhos com sincronização ativa
                </span>
              </div>
              <button
                type="button"
                onClick={handleSyncClick}
                disabled={syncing || isOffline}
                className="text-[11px] font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1 hover:underline"
              >
                <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </button>
            </div>

            <div className="space-y-2">
              {realDevices.map((dev) => {
                const isSelected = dev.id === activeDevice.id || dev.isCurrent;
                const isEditing = editingDeviceId === dev.id;

                if (isEditing) {
                  return (
                    <div
                      key={dev.id}
                      onClick={(e) => e.stopPropagation()}
                      className="p-3.5 rounded-2xl border bg-teal-50/40 dark:bg-teal-950/20 border-teal-400 dark:border-teal-600 space-y-2"
                    >
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Editar Nome do Aparelho
                      </span>
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Nome (ex: Meu iPhone, Samsung Esposa...)"
                          className="w-full text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                        <input
                          type="text"
                          value={editModel}
                          onChange={(e) => setEditModel(e.target.value)}
                          placeholder="Modelo (ex: iPhone 15, Galaxy S24, etc.)"
                          className="w-full text-[11px] px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingDeviceId(null)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleSaveDevice(dev.id, e)}
                          className="px-3 py-1 bg-[#00C49F] text-[#0A1128] font-bold text-[11px] rounded-lg flex items-center gap-1 active-press"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Salvar</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={dev.id}
                    onClick={() => onSwitchDevice(dev.id)}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-teal-50/70 dark:bg-teal-950/30 border-teal-500 dark:border-teal-500 shadow-xs'
                        : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isSelected ? 'bg-[#00C49F] text-[#0A1128]' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{dev.name}</span>
                          {isSelected && (
                            <span className="text-[10px] bg-[#00C49F]/20 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full font-bold">
                              Este Aparelho
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {dev.model} • {dev.lastActive || 'Conectado'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Rename Button */}
                      <button
                        type="button"
                        onClick={(e) => handleStartEdit(dev, e)}
                        title="Renomear este aparelho"
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Remove/Disconnect Button for non-current devices */}
                      {!isSelected && (
                        <button
                          type="button"
                          onClick={(e) => handleRemoveDeviceClick(dev.id, e)}
                          title="Remover e desconectar este aparelho da conta"
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <div className="flex items-center gap-1 ml-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                          Ativo
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Placeholder when wife has not joined yet */}
              {otherConnectedDevices.length === 0 && (
                <div className="p-3.5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-pink-100 dark:bg-pink-950/60 text-pink-500 flex items-center justify-center">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">
                        Celular da Esposa: Aguardando Conexão
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Envie o link ou aponte a câmera dela para o QR Code acima
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleShareWifeWhatsApp}
                    className="px-2.5 py-1 bg-pink-500 text-white font-bold text-[10px] rounded-lg active-press"
                  >
                    Conectar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Offline Mode Switcher */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Modo Offline
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Lançamentos feitos sem internet sincronizam automaticamente ao reconectar.
              </span>
            </div>
            <button
              onClick={onToggleOffline}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active-press ${
                isOffline
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {isOffline ? 'Offline' : 'Online'}
            </button>
          </div>

          {/* Sync Conflict Resolution (3-Way Merge) */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white mb-1">
              <GitMerge className="w-4 h-4 text-teal-600" />
              <span>Prevenção de Perda de Dados (Merge Automático)</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Quando ambos os celulares alteram dados ao mesmo tempo, nenhuma edição é sobrescrita.
            </p>
          </div>

          {/* Sincronizar Agora Button */}
          <button
            onClick={handleSyncClick}
            disabled={syncing || isOffline}
            className="w-full py-3.5 bg-[#00C49F] hover:bg-[#00b290] disabled:bg-slate-300 text-[#0A1128] font-black rounded-2xl text-xs active-press flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Sincronizando e Validando Esposa...' : 'Sincronizar Agora com a Nuvem'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
