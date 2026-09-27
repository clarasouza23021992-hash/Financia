import React, { useState } from 'react';
import { 
  X, Zap, CreditCard, Sparkles, Check, Smartphone, Bell,
  ArrowRight, ShieldCheck, Copy, CheckCircle2, AlertCircle,
  HelpCircle, ExternalLink, RefreshCw
} from 'lucide-react';
import { Bill } from '../types/finance';
import { bankSync } from '../services/bankSync';

interface RealTimeCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstantPurchaseCreated: (bills: Bill[], message: string) => void;
  householdId?: string;
  selectedMonthId: string;
}

export const RealTimeCardModal: React.FC<RealTimeCardModalProps> = ({
  isOpen,
  onClose,
  onInstantPurchaseCreated,
  householdId = 'casa-principal',
  selectedMonthId,
}) => {
  const [tab, setTab] = useState<'simulator' | 'guide' | 'paste'>('simulator');
  
  // Simulator state
  const [merchant, setMerchant] = useState('Magazine Luiza');
  const [amount, setAmount] = useState('600,00');
  const [installments, setInstallments] = useState(3);
  const [cardName, setCardName] = useState('Nubank Mastercard');
  const [cardHolder, setCardHolder] = useState('Paula');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Paste text state
  const [notificationText, setNotificationText] = useState('Compra aprovada no Nubank de R$ 600,00 em 3x na Magazine Luiza');

  if (!isOpen) return null;

  const parsedAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0;
  const installmentAmount = installments > 1 ? (parsedAmount / installments) : parsedAmount;

  // Webhook URL
  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/card-purchase`
    : '/api/card-purchase';

  // Sound effect generator using Web Audio API (Terminal Beep)
  const playApprovalSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.08); // E6 note
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio not permitted or supported
    }
  };

  const handleSimulatePurchase = async () => {
    if (parsedAmount <= 0) {
      alert('Informe um valor válido para a compra.');
      return;
    }

    setIsProcessing(true);
    playApprovalSound();

    try {
      const response = await fetch('/api/card-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId,
          merchant,
          amount: parsedAmount,
          installments,
          cardName,
          cardHolder,
          date: `${selectedMonthId}-10`,
        }),
      });

      const data = await response.json();
      if (data.success && Array.isArray(data.bills)) {
        onInstantPurchaseCreated(
          data.bills,
          `⚡ Compra no ${cardName} de R$ ${parsedAmount.toFixed(2).replace('.', ',')} em ${installments}x de R$ ${installmentAmount.toFixed(2).replace('.', ',')} cadastrada instantaneamente!`
        );
        onClose();
      } else {
        alert(data.error || 'Erro ao processar compra.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao simular compra.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessPastedNotification = async () => {
    if (!notificationText.trim()) return;
    setIsProcessing(true);
    playApprovalSound();

    try {
      const response = await fetch('/api/card-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId,
          text: notificationText,
          date: `${selectedMonthId}-10`,
        }),
      });

      const data = await response.json();
      if (data.success && Array.isArray(data.bills)) {
        onInstantPurchaseCreated(data.bills, data.message);
        onClose();
      } else {
        alert(data.error || 'Não foi possível extrair a compra do texto.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao processar notificação.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 3000);
  };

  const handleSelectPreset = (presetMerchant: string, presetAmt: string, presetInst: number) => {
    setMerchant(presetMerchant);
    setAmount(presetAmt);
    setInstallments(presetInst);
  };

  const shortcutFileUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/RegistrarCompra.shortcut`
    : '/RegistrarCompra.shortcut';

  const shortcutImportUrl = `shortcuts://import-shortcut?url=${encodeURIComponent(shortcutFileUrl)}&name=${encodeURIComponent('Registrar Compra no App')}`;

  const handleInstallShortcut = () => {
    try {
      window.location.href = shortcutImportUrl;
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = '/api/shortcut/download';
        a.download = 'RegistrarCompra.shortcut';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, 1000);
    } catch {
      window.location.href = '/api/shortcut/download';
    }
  };

  const handleOpenShortcutsApp = () => {
    try {
      window.location.href = 'shortcuts://';
    } catch {
      alert('Não foi possível abrir o app Atalhos diretamente. Abra o app Atalhos na tela de início do seu iPhone.');
    }
  };

  const handleTestApplePay = async () => {
    setIsProcessing(true);
    playApprovalSound();

    try {
      const response = await fetch('/api/card-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId,
          merchant: 'Padaria & Mercado (Apple Pay)',
          amount: 42.50,
          installments: 1,
          cardName: 'Apple Pay (Aproximação)',
          cardHolder: 'Paula',
          date: `${selectedMonthId}-10`,
        }),
      });

      const data = await response.json();
      if (data.success && Array.isArray(data.bills)) {
        onInstantPurchaseCreated(
          data.bills,
          '⚡ Sucesso! Compra por Aproximação (Apple Pay) de R$ 42,50 registrada instantaneamente!'
        );
        onClose();
      } else {
        alert(data.error || 'Erro ao testar compra.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao testar compra.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#0E172F] w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[94vh] flex flex-col my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-[#0A1128] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-black tracking-tight">
                  Compra no Cartão em Tempo Real
                </h2>
                <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-black">
                  AO VIVO
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Aparece no mesmo segundo que você passa o cartão na maquininha
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

        {/* Tab switch */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 px-4 pt-2 bg-slate-50 dark:bg-slate-900/60 gap-1">
          <button
            onClick={() => setTab('simulator')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              tab === 'simulator'
                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Simulador de Maquininha</span>
          </button>

          <button
            onClick={() => setTab('guide')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              tab === 'guide'
                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Como Funciona no Celular</span>
          </button>

          <button
            onClick={() => setTab('paste')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              tab === 'paste'
                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Colar Notificação</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: REAL-TIME SIMULATOR */}
          {tab === 'simulator' && (
            <div className="space-y-4">
              {/* Explanation Card */}
              <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
                <div className="font-bold text-purple-800 dark:text-purple-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Teste o Lançamento Instantâneo de Compra & Parcelas</span>
                </div>
                <p className="text-[11.5px] leading-relaxed">
                  Quando você passa o cartão físico ou virtual, o sistema cria <b>instantaneamente</b> a despesa e distribui todas as parcelas pelos meses subsequentes. Teste abaixo agora mesmo:
                </p>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Exemplos Rápidos de Compra para Testar:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelectPreset('Magazine Luiza', '600,00', 3)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-950/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                    📺 Magalu (R$ 600 em 3x)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPreset('Zara Shopping', '450,00', 2)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-950/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                    👗 Zara (R$ 450 em 2x)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPreset('Casas Bahia (Celular)', '2.400,00', 10)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-950/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                    📱 Celular (R$ 2.400 em 10x)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPreset('Posto Shell Combustível', '180,00', 1)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-950/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                    ⛽ Posto (R$ 180 à vista)
                  </button>
                </div>
              </div>

              {/* Form Inputs */}
              <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome da Loja / Estabelecimento *
                  </label>
                  <input
                    type="text"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    placeholder="Ex: Magazine Luiza, Zara, Mercado Livre"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Valor Total da Compra (R$) *
                    </label>
                    <input
                      type="text"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Ex: 600,00"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Quantas Vezes Parcelou? *
                    </label>
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    >
                      <option value={1}>1x (À Vista no Cartão)</option>
                      <option value={2}>2x de R$ {(parsedAmount / 2).toFixed(2).replace('.', ',')}</option>
                      <option value={3}>3x de R$ {(parsedAmount / 3).toFixed(2).replace('.', ',')}</option>
                      <option value={4}>4x de R$ {(parsedAmount / 4).toFixed(2).replace('.', ',')}</option>
                      <option value={5}>5x de R$ {(parsedAmount / 5).toFixed(2).replace('.', ',')}</option>
                      <option value={6}>6x de R$ {(parsedAmount / 6).toFixed(2).replace('.', ',')}</option>
                      <option value={7}>7x de R$ {(parsedAmount / 7).toFixed(2).replace('.', ',')}</option>
                      <option value={8}>8x de R$ {(parsedAmount / 8).toFixed(2).replace('.', ',')}</option>
                      <option value={9}>9x de R$ {(parsedAmount / 9).toFixed(2).replace('.', ',')}</option>
                      <option value={10}>10x de R$ {(parsedAmount / 10).toFixed(2).replace('.', ',')}</option>
                      <option value={12}>12x de R$ {(parsedAmount / 12).toFixed(2).replace('.', ',')}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Cartão Utilizado
                    </label>
                    <select
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="Nubank Mastercard">Nubank Mastercard</option>
                      <option value="Banco Itaú Visa">Banco Itaú Visa</option>
                      <option value="Bradesco Elo">Bradesco Elo</option>
                      <option value="C6 Bank Carbon">C6 Bank Carbon</option>
                      <option value="Banco Inter">Banco Inter</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Quem comprou?
                    </label>
                    <select
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="Paula">Paula</option>
                      <option value="Carlos">Carlos</option>
                    </select>
                  </div>
                </div>

                {/* Instant Calculation Preview */}
                <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 rounded-xl border border-purple-200/60 dark:border-purple-900/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[10.5px]">
                      {installments > 1 ? 'Distribuição das Parcelas:' : 'Lançamento Único:'}
                    </span>
                    <span className="font-extrabold text-purple-700 dark:text-purple-300">
                      {installments > 1
                        ? `${installments} parcelas de R$ ${installmentAmount.toFixed(2).replace('.', ',')} / mês`
                        : `R$ ${parsedAmount.toFixed(2).replace('.', ',')} à vista`}
                    </span>
                  </div>
                  <div className="text-right text-[11px] text-slate-500">
                    {installments > 1 && (
                      <span className="bg-purple-200 dark:bg-purple-900 px-2 py-0.5 rounded-full font-bold text-purple-800 dark:text-purple-200">
                        Meses 1 a {installments}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button: Simulate swipe */}
              <button
                type="button"
                onClick={handleSimulatePurchase}
                disabled={isProcessing}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-800 text-white font-black text-xs rounded-2xl shadow-lg active-press flex items-center justify-center gap-2 transition-all"
              >
                <Zap className={`w-4 h-4 fill-current ${isProcessing ? 'animate-spin' : ''}`} />
                <span>
                  {isProcessing
                    ? 'Aprovando compra na maquininha...'
                    : '💳 SIMULAR PASSAR CARTÃO AGORA (TEMPO REAL)'}
                </span>
              </button>
            </div>
          )}

          {/* TAB 2: HOW IT WORKS IN REAL LIFE (PHONE GUIDE) */}
          {tab === 'guide' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-teal-500/10 border border-purple-200 dark:border-purple-800/60 space-y-2">
                <div className="font-black text-purple-900 dark:text-purple-200 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Você NUNCA precisa digitar o texto manualmente!</span>
                </div>
                <p className="text-[12px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  <b>Não, você não precisa colar nem digitar nada toda vez!</b> Você configura o atalho <b>apenas uma vez na vida</b> (leva menos de 2 minutos). Depois disso, o próprio celular pega os dados da compra <b>sozinho em segundo plano</b> e manda para o app no mesmo segundo.
                </p>
              </div>

              {/* Step by step for iPhone */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-purple-600" />
                    <span>Passo a Passo Completo no iPhone (Apple Atalhos):</span>
                  </h4>
                </div>

                {/* Option 1: Apple Pay (Touch / NFC) */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/60 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      💳 Opção 1: Se você paga por aproximação com o iPhone ou Apple Watch (Apple Pay)
                    </span>
                    <span className="text-[9.5px] px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black rounded-full">
                      100% NATIVO
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    O próprio iOS detecta a compra no momento da aproximação na maquininha e envia valor e estabelecimento sozinhos.
                  </p>

                  {/* 1-Click Ready Shortcut Download & Import */}
                  <div className="p-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl shadow-md space-y-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-300 fill-amber-300" />
                      <div>
                        <h5 className="font-black text-xs">ATALHO 100% PRONTO (SEM DIGITAR NADA)</h5>
                        <p className="text-[10.5px] text-purple-100">
                          Já vem configurado com a URL, método POST e campos de valor e loja.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleInstallShortcut}
                        className="py-2.5 px-3 bg-white hover:bg-slate-100 text-purple-900 font-black text-xs rounded-xl shadow active-press flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Smartphone className="w-4 h-4 text-purple-700" />
                        <span>📲 Adicionar Atalho no iPhone</span>
                      </button>

                      <a
                        href="/api/shortcut/download"
                        download="RegistrarCompra.shortcut"
                        className="py-2.5 px-3 bg-purple-700/80 hover:bg-purple-800 text-white font-extrabold text-xs rounded-xl border border-purple-400/40 active-press flex items-center justify-center gap-1.5 transition-all text-center"
                      >
                        <Zap className="w-4 h-4 text-amber-300" />
                        <span>⬇️ Baixar Arquivo .shortcut</span>
                      </a>
                    </div>
                  </div>

                  {/* 3 Quick Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={handleOpenShortcutsApp}
                      className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-extrabold text-xs rounded-xl border border-slate-200 dark:border-slate-700 active-press flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Abrir App Atalhos no iPhone</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyWebhook}
                      className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-extrabold text-xs rounded-xl border border-slate-200 dark:border-slate-700 active-press flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {copiedWebhook ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedWebhook ? 'Link Copiado!' : 'Copiar Link do Webhook'}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestApplePay}
                    disabled={isProcessing}
                    className="w-full py-2 px-3 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold text-xs rounded-xl active-press flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>🧪 Testar Envio do Apple Pay Agora (Simular Padaria R$ 42,50)</span>
                  </button>

                  <div className="bg-slate-50 dark:bg-slate-950/70 p-3.5 rounded-xl space-y-2 text-[11.5px] text-slate-700 dark:text-slate-300">
                    <div className="font-bold text-slate-900 dark:text-white text-xs">
                      Como ligar à aproximação (Apple Pay) em 3 passos simples:
                    </div>
                    <div><b>Passo 1:</b> Toque no botão roxo <b>"📲 Adicionar Atalho no iPhone"</b> acima para o iPhone salvar o atalho pré-configurado.</div>
                    <div><b>Passo 2:</b> Abra o app <b>Atalhos</b> ➔ na barra inferior toque em <b>"Automação"</b> ➔ toque no <b>"+"</b>.</div>
                    <div><b>Passo 3:</b> Escolha <b>"Transação"</b> ➔ marque <b>"Executar Imediatamente"</b> ➔ na tela seguinte, adicione a ação <b>"Executar Atalho"</b> e escolha <b>"Registrar Compra no App"</b>.</div>
                    <div className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                      ✅ Pronto! Sem precisar digitar código, URL nem JSON. O próprio iPhone faz o envio silenciosamente.
                    </div>
                  </div>
                </div>

                {/* Option 2: SMS from Bank */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      📩 Opção 2: Se o seu banco envia SMS de compra aprovada (Itaú, Bradesco, Santander, etc.)
                    </span>
                    <span className="text-[9.5px] px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold rounded-full">
                      Automático
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-xl space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                    <div><b>1.</b> Abra o app <b>Atalhos</b> &gt; toque em <b>"Automação"</b> &gt; clique em <b>"+"</b>.</div>
                    <div><b>2.</b> Escolha o gatilho <b>"Mensagem"</b>.</div>
                    <div><b>3.</b> Em <b>"A Mensagem Contém"</b>, digite: <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">aprovada</code> (ou o nome do seu banco).</div>
                    <div><b>4.</b> Marque <b>"Executar Imediatamente"</b> e desmarque "Perguntar Antes de Executar".</div>
                    <div><b>5.</b> Adicione a ação <b>"Obter Conteúdo de URL"</b> (POST) com a URL abaixo.</div>
                    <div><b>6.</b> Em Corpo, passe o <b>Texto da Mensagem</b> (variável que o atalho puxa do SMS sozinho sem você digitar nada!).</div>
                  </div>
                </div>

                {/* Option 3: Android via MacroDroid */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      🤖 No Android (MacroDroid - 100% Automático com Notificação Push)
                    </span>
                    <span className="text-[9.5px] px-2 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold rounded-full">
                      Qualquer App
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    No Android, o app MacroDroid tem permissão nativa para ler a notificação do Nubank/Itaú e extrair o texto automaticamente.
                  </p>
                  <div className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-xl space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                    <div><b>1.</b> Baixe o <b>MacroDroid</b> grátis na Google Play Store.</div>
                    <div><b>2.</b> Crie uma Macro: Gatilho &gt; <b>Notificação Recebida</b> &gt; Escolha o app do seu banco (ex: Nubank).</div>
                    <div><b>3.</b> Ação &gt; <b>Requisição HTTP POST</b> &gt; cole a URL abaixo &gt; no corpo envie a tag <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">{'{notification_text}'}</code>.</div>
                    <div><b>4.</b> Salve a Macro. Ao receber a notificação, a compra entra no app instantaneamente!</div>
                  </div>
                </div>

                {/* Webhook URL Box */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Link do Webhook para colocar no Atalho:
                    </span>
                    <button
                      onClick={handleCopyWebhook}
                      className="text-[11px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 hover:underline"
                    >
                      {copiedWebhook ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedWebhook ? 'Copiado!' : 'Copiar Link'}</span>
                    </button>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-purple-600 dark:text-purple-300 select-all break-all">
                    {webhookUrl}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PASTE NOTIFICATION */}
          {tab === 'paste' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Cole o texto de qualquer notificação ou SMS do banco:
                </label>
                <textarea
                  rows={3}
                  value={notificationText}
                  onChange={(e) => setNotificationText(e.target.value)}
                  placeholder="Ex: Compra aprovada no Nubank de R$ 600,00 em 3x na Magazine Luiza"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleProcessPastedNotification}
                  disabled={isProcessing}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-colors active-press flex items-center justify-center gap-1.5 shadow"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Extrair Compra & Lançar Todas as Parcelas Instantaneamente</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
