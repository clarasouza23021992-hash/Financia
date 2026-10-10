import React, { useState, useEffect } from 'react';
import { 
  Cloud, RefreshCw, CheckCircle2, ShieldCheck, Smartphone, 
  Users, Activity, CheckCheck, Trash2, ArrowLeft,
  Check, AlertCircle, Sparkles, KeyRound, Share2,
  MessageCircle, Copy, Clock, ExternalLink, X, Heart
} from 'lucide-react';
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
  onOpenWifeConnect?: () => void;
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
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedInstructions, setCopiedInstructions] = useState(false);

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-kzu55qqa7itkbn2iowtd4s-5136201558.us-east1.run.app';
  const familyEmail = authSession?.user?.email || 'l.carlosramos92@gmail.com';

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
                Carlos e Paula conectados ao mesmo banco de dados da casa
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

      {/* Card 2: Conta da Família (Login Compartilhado) */}
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
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-md flex items-center gap-0.5">
                  <Check className="w-2.5 h-2.5" />
                  <span>Login Compartilhado Ativo</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {authSession?.token 
                  ? `E-mail: ${authSession.user.email} (${authSession.user.householdName || 'Casa da Família'})` 
                  : 'Mesmo e-mail e senha compartilhados entre Carlos e Paula'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenFamilyAuth}
            className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/50 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 rounded-xl text-xs font-bold active-press transition-colors cursor-pointer flex items-center gap-1"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Gerenciar</span>
          </button>
        </div>

        {/* Identity selector */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-[11px]">Este celular está identificado como:</span>
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
              <span>{isPaula ? '👩🏻 Paula (Esposa)' : '👤 Carlos (Titular)'}</span>
            </div>
          </div>

          {onToggleActiveUser && (
            <button
              type="button"
              onClick={onToggleActiveUser}
              className="px-2.5 py-1 text-[11px] font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer transition-colors"
              title="Trocar quem está usando este aparelho"
            >
              Alternar
            </button>
          )}
        </div>
      </div>

      {/* Card 3: Aparelhos Conectados via Login Compartilhado */}
      <div className="p-4 bg-white dark:bg-[#0E172F] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-teal-500" />
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-white">
              Aparelhos Conectados à Conta
            </h3>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            2 iPhones Conectados
          </span>
        </div>

        <div className="space-y-2">
          {/* Carlos iPhone */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-base">👤</span>
              <div>
                <strong className="text-slate-900 dark:text-white">Carlos (iPhone)</strong>
                <p className="text-[10px] text-slate-500">
                  Titular da Casa • {isPaula ? 'Conta da Família' : 'Ativo neste aparelho'}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-3 h-3" /> Conectado
            </span>
          </div>

          {/* Paula iPhone */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-base">👩🏻</span>
              <div>
                <strong className="text-slate-900 dark:text-white">Paula (iPhone)</strong>
                <p className="text-[10px] text-slate-500">
                  Esposa • {isPaula ? 'Ativo neste aparelho' : 'Aguardando 1º acesso no celular dela'}
                </p>
              </div>
            </div>
            {isPaula ? (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> Ativo
              </span>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> Pendente de Acesso
                </span>
                <button
                  type="button"
                  onClick={() => setShowShareModal(true)}
                  className="px-2.5 py-1 text-[10px] font-bold bg-[#00C49F] hover:bg-[#00b290] text-[#0A1128] rounded-lg cursor-pointer transition-colors shadow-2xs flex items-center gap-1"
                >
                  <Share2 className="w-2.5 h-2.5" />
                  <span>Enviar Acesso</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-xl text-[11px] text-teal-800 dark:text-teal-300 leading-relaxed flex items-start gap-2">
          <span className="text-base leading-none">💡</span>
          <div>
            <strong>Como a Paula vai acessar:</strong> Ela não precisa de convite especial ou link de pareamento. Basta enviar o link do app para ela abrir no Safari do iPhone dela e fazer login com o <strong>mesmo e-mail e senha da família</strong>.{' '}
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="text-teal-600 dark:text-[#00E5B5] font-bold underline hover:opacity-80 cursor-pointer inline-flex items-center gap-0.5 ml-1"
            >
              <span>Ver passo a passo de acesso</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Como a Paula vai acessar o app no iPhone dela */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#0E172F] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-5 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-[#00C49F] flex items-center justify-center font-bold">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Como a Paula Acessa no iPhone Dela
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Acesso compartilhado • Conta da Casa
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Explicação Clara das Duas Dúvidas */}
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-xs space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-emerald-900 dark:text-emerald-200 text-[11.5px] leading-relaxed">
                  <strong>O app dela atualiza junto com o seu?</strong><br />
                  <span className="text-emerald-800 dark:text-emerald-300">
                    <strong>Sim, 100%!</strong> Como o app roda na nuvem, todas as melhorias que fazemos aqui e todas as contas que você marcar como pagas atualizam na mesma hora no celular dela assim que ela abrir ou recarregar!
                  </span>
                </div>
              </div>
            </div>

            {/* 3 Passos Simples */}
            <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
              <h4 className="font-extrabold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Passo a passo para ela:
              </h4>

              {/* Passo 1 */}
              <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-700 dark:text-teal-300 font-black text-[11px] flex items-center justify-center shrink-0">
                  1
                </span>
                <div className="space-y-1 min-w-0">
                  <strong className="text-slate-900 dark:text-white block">Abrir o link no Safari do iPhone</strong>
                  <p className="text-[11px] text-slate-500 break-all font-mono">
                    {appUrl}
                  </p>
                </div>
              </div>

              {/* Passo 2 */}
              <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-700 dark:text-teal-300 font-black text-[11px] flex items-center justify-center shrink-0">
                  2
                </span>
                <div className="space-y-0.5">
                  <strong className="text-slate-900 dark:text-white block">Salvar na Tela de Início (Vira App!)</strong>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    No Safari, tocar no botão de Compartilhar (ícone do quadrado com a seta ⎋) e selecionar <strong>"Adicionar à Tela de Início"</strong>. Fica com o ícone lindo na tela dela igual app da Apple Store!
                  </p>
                </div>
              </div>

              {/* Passo 3 */}
              <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-700 dark:text-teal-300 font-black text-[11px] flex items-center justify-center shrink-0">
                  3
                </span>
                <div className="space-y-1">
                  <strong className="text-slate-900 dark:text-white block">Entrar com a Conta da Casa</strong>
                  <p className="text-[11px] text-slate-500">
                    Ela toca em <strong>"Entrar"</strong> e coloca o mesmo e-mail e senha:
                  </p>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                    <div>📧 E-mail: <strong>{familyEmail}</strong></div>
                    <div>🔑 Senha: <strong>(a mesma senha cadastrada)</strong></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Botões de Ação Direta */}
            <div className="space-y-2 pt-1">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `Oi amor! 💚 Aqui está o link do nosso aplicativo de finanças da casa:\n\n🔗 ${appUrl}\n\n📲 Como colocar no seu iPhone:\n1. Abre o link no Safari\n2. Toca no botão de compartilhar (⎋) e escolhe "Adicionar à Tela de Início"\n3. Abre o app e entra com a nossa conta da casa:\n📧 E-mail: ${familyEmail}\n\nPronto! Tudo o que você ou eu marcarmos como pago atualiza na mesma hora nos dois celulares! ✨`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-3 bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-extrabold rounded-xl text-xs active-press flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-slate-950" />
                <span>Enviar Instruções no WhatsApp da Paula</span>
              </a>

              <button
                type="button"
                onClick={async () => {
                  const text = `Oi amor! 💚 Aqui está o link do nosso aplicativo de finanças da casa:\n\n🔗 ${appUrl}\n\n📲 Como colocar no seu iPhone:\n1. Abre o link no Safari\n2. Toca no botão de compartilhar (⎋) e escolhe "Adicionar à Tela de Início"\n3. Abre o app e entra com a nossa conta da casa:\n📧 E-mail: ${familyEmail}\n\nPronto! Tudo o que você ou eu marcarmos como pago atualiza na mesma hora nos dois celulares! ✨`;
                  try {
                    await navigator.clipboard.writeText(text);
                    setCopiedInstructions(true);
                    setTimeout(() => setCopiedInstructions(false), 3000);
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs active-press flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedInstructions ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedInstructions ? 'Mensagem Copiada com Sucesso!' : 'Copiar Texto para Enviar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
