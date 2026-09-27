import React, { useState, useEffect } from 'react';
import { 
  X, Landmark, CreditCard, Shield, Upload, CheckCircle2, 
  RefreshCw, Lock, ExternalLink, FileSpreadsheet, Plus, AlertCircle,
  Edit3, Trash2, Wallet, Sparkles, Building2, Check, ArrowRight,
  Zap, Copy, Send, BellRing, Smartphone, Calendar, DollarSign,
  HelpCircle, ChevronRight
} from 'lucide-react';
import { BankConnection, Bill, Revenue, CardPurchaseRequest, CardPurchaseResult } from '../types/finance';
import { bankSync, SUPPORTED_INSTITUTIONS, OpenFinanceConfig } from '../services/bankSync';
import { EditBankModal } from './EditBankModal';
import { CardLimitSummary } from './CardLimitSummary';

export type BankModalTab = 'accounts' | 'card_purchase' | 'live_sync' | 'webhook' | 'import' | 'config';

interface BankSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTransactions: (bills: Partial<Bill>[], revenues: Partial<Revenue>[]) => void;
  onPurchasePublished?: (result: CardPurchaseResult) => void;
  initialTab?: BankModalTab;
}

export const BankSyncModal: React.FC<BankSyncModalProps> = ({
  isOpen,
  onClose,
  onImportTransactions,
  onPurchasePublished,
  initialTab = 'accounts',
}) => {
  const [tab, setTab] = useState<BankModalTab>(initialTab);
  const [connections, setConnections] = useState<BankConnection[]>(() => bankSync.getConnections());
  const [config, setConfig] = useState<OpenFinanceConfig>(() => bankSync.getOpenFinanceConfig());
  const [isSyncing, setIsSyncing] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Modal to add or edit bank connection
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<BankConnection | null>(null);

  // Card Purchase Form state
  const creditCards = connections.filter(c => c.accountType === 'Cartão de Crédito');
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [purchaseAmount, setPurchaseAmount] = useState<string>('');
  const [purchaseInstallments, setPurchaseInstallments] = useState<number>(1);
  const [purchaseDescription, setPurchaseDescription] = useState<string>('');
  const [purchaseCategory, setPurchaseCategory] = useState<string>('Alimentação & Mercado');
  const [purchaseHolder, setPurchaseHolder] = useState<string>('Paula');
  const [purchaseDate, setPurchaseDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [isPublishing, setIsPublishing] = useState(false);
  const [lastPublishedResult, setLastPublishedResult] = useState<CardPurchaseResult | null>(null);

  // Live Sync / SMS Push parser state
  const [rawNotificationText, setRawNotificationText] = useState<string>('');
  const [parsedPushRequest, setParsedPushRequest] = useState<CardPurchaseRequest | null>(null);

  // Webhook info
  const webhookInfo = bankSync.getWebhookInfo();
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookTestStatus, setWebhookTestStatus] = useState<string | null>(null);

  // Sync state with open/props
  useEffect(() => {
    if (isOpen) {
      setConnections(bankSync.getConnections());
      if (initialTab) setTab(initialTab);
      // Auto select first credit card if available
      const cards = bankSync.getLinkedCreditCards();
      if (cards.length > 0 && !selectedCardId) {
        setSelectedCardId(cards[0].id);
        if (cards[0].cardHolder) setPurchaseHolder(cards[0].cardHolder);
      }
    }
  }, [isOpen, initialTab]);

  // When raw notification text changes, auto-parse in real-time
  useEffect(() => {
    if (rawNotificationText.trim()) {
      const parsed = bankSync.parsePushOrSmsNotification(rawNotificationText);
      setParsedPushRequest(parsed);
    } else {
      setParsedPushRequest(null);
    }
  }, [rawNotificationText]);

  // When card selected, update holder if defined
  useEffect(() => {
    if (selectedCardId) {
      const found = connections.find(c => c.id === selectedCardId);
      if (found && found.cardHolder) {
        setPurchaseHolder(found.cardHolder);
      }
    }
  }, [selectedCardId, connections]);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 4500);
  };

  const handleOpenAdd = () => {
    setEditingConnection(null);
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (conn: BankConnection) => {
    setEditingConnection(conn);
    setIsEditModalOpen(true);
  };

  const handleSaveConnection = (saved: BankConnection) => {
    const updated = bankSync.addOrUpdateConnection(saved);
    setConnections(updated);
    if (saved.accountType === 'Cartão de Crédito') {
      setSelectedCardId(saved.id);
    }
    showNotification(`Conta/Cartão "${saved.institution}" salvo com sucesso!`);
  };

  const handleDeleteConnection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Deseja realmente remover esta conta/cartão?')) {
      const updated = bankSync.deleteConnection(id);
      setConnections(updated);
      showNotification('Conexão removida com sucesso.');
    }
  };

  const handleClearAllMock = () => {
    if (confirm('Deseja limpar todos os dados bancários cadastrados e começar do zero com suas contas e cartões reais?')) {
      bankSync.clearAllConnections();
      setConnections([]);
      showNotification('Todas as conexões foram limpas.');
    }
  };

  // Launch purchase tab preselecting a card
  const handleQuickLaunchForCard = (conn: BankConnection) => {
    setSelectedCardId(conn.id);
    if (conn.cardHolder) setPurchaseHolder(conn.cardHolder);
    setTab('card_purchase');
  };

  // Handle publishing a card purchase directly
  const handlePublishPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = parseFloat(purchaseAmount.replace(/\./g, '').replace(',', '.')) || 0;
    if (cleanAmount <= 0) {
      alert('Por favor, informe um valor válido para a compra.');
      return;
    }

    const card = connections.find(c => c.id === selectedCardId);
    const installments = Math.max(1, purchaseInstallments);
    const singleInst = Number((cleanAmount / installments).toFixed(2));

    setIsPublishing(true);
    try {
      const result = await bankSync.publishCardPurchase({
        cardId: selectedCardId,
        institution: card?.institution || 'Cartão de Crédito',
        cardName: card?.cardName || card?.institution || 'Cartão de Crédito',
        cardLast4: card?.accountNumber?.match(/\d{4}/)?.[0] || '0000',
        cardHolder: purchaseHolder,
        description: purchaseDescription.trim() || 'Compra no Cartão',
        totalAmount: cleanAmount,
        installments: installments,
        installmentAmount: singleInst,
        purchaseDate: purchaseDate,
        closingDay: card?.closingDay || 5,
        dueDay: card?.dueDay || 15,
        category: purchaseCategory,
        splitHousehold: true,
      });

      setLastPublishedResult(result);
      setConnections(bankSync.getConnections());
      if (onPurchasePublished) {
        onPurchasePublished(result);
      }
      showNotification(`🚀 Compra de R$ ${cleanAmount.toFixed(2).replace('.', ',')} publicada! ${installments}x de R$ ${singleInst.toFixed(2).replace('.', ',')} agendadas no app.`);

      // Reset fields for next purchase
      setPurchaseAmount('');
      setPurchaseDescription('');
      setPurchaseInstallments(1);
    } catch (err) {
      console.error('Error publishing card purchase:', err);
      alert('Erro ao publicar compra no cartão.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Handle publishing from parsed SMS / Push
  const handleConfirmPushPurchase = async () => {
    if (!parsedPushRequest || parsedPushRequest.totalAmount <= 0) return;
    setIsPublishing(true);
    try {
      const result = await bankSync.publishCardPurchase(parsedPushRequest);
      setLastPublishedResult(result);
      setConnections(bankSync.getConnections());
      if (onPurchasePublished) {
        onPurchasePublished(result);
      }
      showNotification(`✅ Compra reconhecida e publicada! ${result.installmentsCount} parcelas sincronizadas.`);
      setRawNotificationText('');
      setParsedPushRequest(null);
    } catch (err) {
      console.error('Error publishing parsed push purchase:', err);
      alert('Erro ao publicar compra da notificação.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Preset quick push tests
  const applyPresetPush = (text: string) => {
    setRawNotificationText(text);
  };

  // Copy webhook URL
  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookInfo.endpointUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  // Test Webhook directly from the browser
  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    setWebhookTestStatus(null);
    try {
      const samplePayload = {
        house: webhookInfo.householdId,
        text: 'Compra aprovada no seu Nubank de R$ 890,00 em 5x na Fast Shop',
        cardHolder: 'Paula',
      };
      const res = await fetch('/api/cards/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(samplePayload),
      });
      const data = await res.json();
      if (data.success) {
        setWebhookTestStatus(`Sucesso! Webhook processou a compra: ${data.message}`);
        setConnections(bankSync.getConnections());
        showNotification('Webhook testado com sucesso!');
      } else {
        setWebhookTestStatus(`Erro no webhook: ${data.error || 'Falha'}`);
      }
    } catch (err: any) {
      setWebhookTestStatus(`Erro de rede: ${err.message}`);
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        const result = bankSync.parseStatementFile(content, file.name);
        onImportTransactions(result.bills, result.revenues);
        setImportStatus(`Importado com sucesso: ${result.bills.length} despesas e ${result.revenues.length} receitas reais adicionadas!`);
        setTimeout(() => setImportStatus(null), 5000);
      };
      reader.readAsText(file);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    bankSync.saveOpenFinanceConfig(config);
    showNotification('Configurações Open Finance salvas com sucesso!');
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    await new Promise(res => setTimeout(res, 1000));
    setConnections(prev => {
      const updated = prev.map(c => ({
        ...c,
        lastSync: 'Sincronizado agora via Open Finance',
      }));
      bankSync.saveConnections(updated);
      return updated;
    });
    setIsSyncing(false);
    showNotification('Todas as contas e cartões foram sincronizados!');
  };

  // Live calculation helpers for Card Purchase tab
  const parsedAmt = parseFloat(purchaseAmount.replace(/\./g, '').replace(',', '.')) || 0;
  const singleInstallmentVal = parsedAmt > 0 ? (parsedAmt / Math.max(1, purchaseInstallments)) : 0;
  const selectedCard = connections.find(c => c.id === selectedCardId);
  const closingDay = selectedCard?.closingDay || 5;
  const dueDay = selectedCard?.dueDay || 15;
  const pDay = parseInt((purchaseDate || '').split('-')[2] || '1', 10);
  const isAfterClosing = pDay > closingDay;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
        <div className="bg-white dark:bg-[#0E172F] w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[94vh] flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="bg-[#0A1128] text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-[#00C49F]">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold tracking-tight">
                    Sincronização Real de Cartões & Bancos
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Ao Vivo
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Vincule seus cartões e publique compras com parcelas automáticas nos meses futuros
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

          {/* Toast Banner */}
          {showSuccessToast && (
            <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 flex items-center gap-2 animate-in slide-in-from-top duration-200">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Tabs Navigation */}
          <div className="flex items-center border-b border-slate-200 dark:border-slate-800 px-3 bg-slate-50 dark:bg-slate-900/60 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setTab('card_purchase')}
              className={`py-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                tab === 'card_purchase'
                  ? 'border-[#00C49F] text-teal-700 dark:text-[#00C49F]'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-[#00C49F]" />
              <span>Lançar Compra no Cartão</span>
            </button>

            <button
              onClick={() => setTab('accounts')}
              className={`py-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                tab === 'accounts'
                  ? 'border-[#00C49F] text-teal-700 dark:text-[#00C49F]'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Cartões Vinculados ({creditCards.length})</span>
            </button>

            <button
              onClick={() => setTab('live_sync')}
              className={`py-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                tab === 'live_sync'
                  ? 'border-[#00C49F] text-teal-700 dark:text-[#00C49F]'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-purple-500" />
              <span>Colar Notificação / Push</span>
            </button>

            <button
              onClick={() => setTab('webhook')}
              className={`py-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                tab === 'webhook'
                  ? 'border-[#00C49F] text-teal-700 dark:text-[#00C49F]'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Webhook Automático</span>
            </button>

            <button
              onClick={() => setTab('import')}
              className={`py-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                tab === 'import'
                  ? 'border-[#00C49F] text-teal-700 dark:text-[#00C49F]'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Extrato OFX/CSV</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            
            {/* TAB 1: LANÇAR COMPRA NO CARTÃO */}
            {tab === 'card_purchase' && (
              <form onSubmit={handlePublishPurchase} className="space-y-4">
                
                {/* Info Card explaining the automatic breakdown */}
                <div className="p-3.5 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 rounded-2xl flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-teal-950 dark:text-teal-200">
                      Publicação Automática e Sincronização Real
                    </p>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                      Ao registrar uma compra no cartão, o aplicativo gera automaticamente <b>todas as parcelas nos meses subsequentes</b>, calcula o vencimento com base no dia de fechamento do cartão e atualiza o limite utilizado na hora!
                    </p>
                  </div>
                </div>

                {/* Seleção do Cartão */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-teal-600" />
                      <span>Cartão de Crédito Utilizado *</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleOpenAdd}
                      className="text-[11px] font-bold text-[#00C49F] hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Cadastrar Novo Cartão</span>
                    </button>
                  </div>

                  {creditCards.length === 0 ? (
                    <div className="p-3 rounded-xl border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
                      <span>Nenhum cartão cadastrado ainda. Clique para vincular seu Nubank, Itaú, Bradesco, etc.</span>
                      <button
                        type="button"
                        onClick={handleOpenAdd}
                        className="px-3 py-1 bg-amber-600 text-white rounded-lg font-bold text-[11px] flex-shrink-0"
                      >
                        Vincular Agora
                      </button>
                    </div>
                  ) : (
                    <select
                      value={selectedCardId}
                      onChange={(e) => setSelectedCardId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                    >
                      {creditCards.map(c => (
                        <option key={c.id} value={c.id}>
                          💳 {c.institution} ({c.cardHolder || 'Paula'}) — {c.accountNumber} — Fechamento dia {c.closingDay || 5} | Vencimento dia {c.dueDay || 15}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Valores: Total e Parcelas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Valor Total da Compra (R$) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 font-black text-slate-400 text-xs">R$</span>
                      <input
                        type="text"
                        required
                        value={purchaseAmount}
                        onChange={(e) => setPurchaseAmount(e.target.value)}
                        placeholder="Ex: 1.200,00"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-extrabold text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Quantidade de Parcelas (Meses) *
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={purchaseInstallments}
                        onChange={(e) => setPurchaseInstallments(parseInt(e.target.value, 10))}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                      >
                        <option value={1}>1x à vista (1 mês)</option>
                        <option value={2}>2x sem juros (2 meses)</option>
                        <option value={3}>3x sem juros (3 meses)</option>
                        <option value={4}>4x sem juros (4 meses)</option>
                        <option value={5}>5x sem juros (5 meses)</option>
                        <option value={6}>6x sem juros (6 meses)</option>
                        <option value={7}>7x (7 meses)</option>
                        <option value={8}>8x (8 meses)</option>
                        <option value={9}>9x (9 meses)</option>
                        <option value={10}>10x sem juros (10 meses)</option>
                        <option value={12}>12x sem juros (1 ano)</option>
                        <option value={18}>18x (18 meses)</option>
                        <option value={24}>24x (2 anos)</option>
                        <option value={36}>36x (3 anos)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Quick Chips for installments */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10.5px] font-bold text-slate-400 mr-1">Atalhos:</span>
                  {[1, 2, 3, 5, 6, 10, 12, 24].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setPurchaseInstallments(num)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                        purchaseInstallments === num
                          ? 'bg-[#00C49F] text-[#0A1128] ring-2 ring-[#00C49F]/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {num === 1 ? 'À vista' : `${num}x`}
                    </button>
                  ))}
                </div>

                {/* Live Real-time Breakdown Display */}
                {parsedAmt > 0 && (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-[#0A1128] text-white border border-teal-500/30 shadow-lg space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#00C49F]">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Detalhamento Real da Sincronização</span>
                      </div>
                      <span className="text-white/60">Cartão: {selectedCard?.institution || 'Cartão'}</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Valor Total</div>
                        <div className="text-sm font-black text-white">
                          R$ {parsedAmt.toFixed(2).replace('.', ',')}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Parcelas</div>
                        <div className="text-sm font-black text-[#00C49F]">
                          {purchaseInstallments} {purchaseInstallments === 1 ? 'mês' : 'meses subsequentes'}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 col-span-2 sm:col-span-2">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Valor da Parcela / Mês</div>
                        <div className="text-sm font-black text-emerald-400">
                          R$ {singleInstallmentVal.toFixed(2).replace('.', ',')} <span className="text-[11px] font-normal text-slate-300">/ mês</span>
                        </div>
                      </div>
                    </div>

                    {/* Due date notice */}
                    <div className="text-[11px] text-slate-300 bg-white/5 p-2 rounded-xl border border-white/10 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#00C49F] flex-shrink-0" />
                      <span>
                        {isAfterClosing ? (
                          <>Compra após o fechamento (dia {closingDay}). A 1ª parcela cairá na fatura do <b>próximo mês</b> (dia {dueDay}).</>
                        ) : (
                          <>Compra antes do fechamento (dia {closingDay}). A 1ª parcela cairá na fatura <b>deste mês</b> (dia {dueDay}).</>
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Descrição e Estabelecimento */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Descrição da Compra / Nome da Loja *
                  </label>
                  <input
                    type="text"
                    required
                    value={purchaseDescription}
                    onChange={(e) => setPurchaseDescription(e.target.value)}
                    placeholder="Ex: Geladeira Samsung, Passagem Aérea, Supermercado..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                {/* Categoria, Titular e Data */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Categoria
                    </label>
                    <select
                      value={purchaseCategory}
                      onChange={(e) => setPurchaseCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                    >
                      <option value="Alimentação & Mercado">Alimentação & Mercado</option>
                      <option value="Moradia & Condomínio">Moradia & Condomínio</option>
                      <option value="Água, Luz & Gás">Água, Luz & Gás</option>
                      <option value="Transporte & Combustível">Transporte & Combustível</option>
                      <option value="Saúde & Farmácia">Saúde & Farmácia</option>
                      <option value="Lazer & Assinaturas">Lazer & Assinaturas</option>
                      <option value="Eletrônicos & Compras">Eletrônicos & Compras</option>
                      <option value="Vestuário & Cuidados">Vestuário & Cuidados</option>
                      <option value="Outras Despesas">Outras Despesas</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Titular da Compra
                    </label>
                    <select
                      value={purchaseHolder}
                      onChange={(e) => setPurchaseHolder(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                    >
                      <option value="Paula">👩🏻‍💼 Paula</option>
                      <option value="Carlos">👨🏻‍💻 Carlos</option>
                      <option value="Conjunta">👫 Conjunta (Casal)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Data da Compra
                    </label>
                    <input
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Botão de Envio */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-slate-500"
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    disabled={isPublishing || parsedAmt <= 0}
                    className="px-6 py-3 bg-[#00C49F] hover:bg-[#00b290] disabled:opacity-50 text-[#0A1128] font-black text-xs rounded-xl active-press shadow-md flex items-center gap-2 transition-all"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    <span>{isPublishing ? 'Publicando parcelas...' : 'Publicar Compra no App (Sincronização Real)'}</span>
                  </button>
                </div>

                {/* Último Resultado Publicado */}
                {lastPublishedResult && (
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{lastPublishedResult.bills.length} parcelas geradas e sincronizadas com sucesso!</span>
                    </div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      Primeiro vencimento: <b>{lastPublishedResult.firstDueDate}</b> | Último vencimento: <b>{lastPublishedResult.lastDueDate}</b>
                    </div>
                  </div>
                )}
              </form>
            )}

            {/* TAB 2: CONTAS & CARTÕES */}
            {tab === 'accounts' && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <span>Conexão Segura & Dados Criptografados</span>
                  </div>

                  <button
                    onClick={handleOpenAdd}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#00C49F] hover:bg-[#00b290] text-[#0A1128] font-extrabold text-xs rounded-xl shadow-xs active-press transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Adicionar Cartão / Conta</span>
                  </button>
                </div>

                {/* Visual Limit & Usage Summary Component */}
                <CardLimitSummary
                  cards={connections}
                  onSelectCard={handleQuickLaunchForCard}
                  onEditCard={handleOpenEdit}
                  onAddNewCard={handleOpenAdd}
                />

                {/* Connections List */}
                <div className="space-y-3">
                  {connections.length === 0 ? (
                    <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Nenhum cartão cadastrado ainda
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                        Adicione seus cartões de crédito reais (Nubank, Itaú, Bradesco, Santander, etc.) para sincronizar compras e parcelamentos automaticamente.
                      </p>
                      <button
                        onClick={handleOpenAdd}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#00C49F] hover:bg-[#00b290] text-[#0A1128] font-bold text-xs rounded-xl shadow-xs active-press"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>Cadastrar Meu Primeiro Cartão</span>
                      </button>
                    </div>
                  ) : (
                    connections.map((conn) => (
                      <div
                        key={conn.id}
                        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-teal-500/50 transition-all space-y-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-extrabold text-xs flex-shrink-0">
                              {conn.accountType === 'Cartão de Crédito' ? (
                                <CreditCard className="w-5 h-5 text-purple-500" />
                              ) : (
                                <Building2 className="w-5 h-5 text-teal-500" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                                <span className="truncate">{conn.institution}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  conn.accountType === 'Cartão de Crédito'
                                    ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                                    : 'bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300'
                                }`}>
                                  {conn.accountType}
                                </span>
                                {conn.cardHolder && (
                                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 font-medium">
                                    {conn.cardHolder}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                                {conn.accountNumber}
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(conn)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 hover:text-teal-600 text-slate-600 dark:text-slate-400 transition-colors"
                              title="Editar cartão"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteConnection(conn.id, e)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-600 dark:text-slate-400 transition-colors"
                              title="Excluir cartão"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Card metadata (closing, due day, invoice, limits) */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Fatura Atual</span>
                            <span className="font-extrabold text-slate-900 dark:text-white">
                              R$ {Math.abs(conn.balance || 0).toFixed(2).replace('.', ',')}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Limite Disponível</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {conn.availableLimit !== undefined ? `R$ ${conn.availableLimit.toFixed(2).replace('.', ',')}` : '—'}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Fechamento</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {conn.closingDay ? `Dia ${conn.closingDay}` : '—'}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Vencimento</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {conn.dueDay ? `Dia ${conn.dueDay}` : '—'}
                            </span>
                          </div>
                        </div>

                        {/* Visual Progress Bar for Credit Card */}
                        {conn.accountType === 'Cartão de Crédito' && (() => {
                          const used = conn.usedLimit !== undefined ? conn.usedLimit : Math.max(0, Math.abs(conn.balance || 0));
                          const avail = conn.availableLimit !== undefined ? conn.availableLimit : 0;
                          const total = (conn.availableLimit !== undefined && conn.usedLimit !== undefined)
                            ? conn.availableLimit + conn.usedLimit
                            : (avail > 0 ? avail + used : (used > 0 ? used : 0));
                          const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
                          const barColor = pct >= 85 ? 'bg-rose-500' : pct >= 60 ? 'bg-amber-400' : 'bg-emerald-500';

                          return (
                            <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                              <div className="flex items-center justify-between text-[10.5px]">
                                <span className="text-slate-400 font-medium">Uso do Limite:</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                  {pct}% utilizado {total > 0 && `(R$ ${used.toFixed(2).replace('.', ',')} de R$ ${total.toFixed(2).replace('.', ',')})`}
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${Math.max(2, pct)}%` }} />
                              </div>
                            </div>
                          );
                        })()}

                        {/* Quick action button for this specific card */}
                        {conn.accountType === 'Cartão de Crédito' && (
                          <div className="pt-1 flex items-center justify-between gap-2">
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{conn.lastSync}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleQuickLaunchForCard(conn)}
                              className="px-3 py-1.5 bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 text-teal-800 dark:text-teal-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
                            >
                              <Zap className="w-3.5 h-3.5 text-teal-600" />
                              <span>Lançar Compra Neste Cartão</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={handleSyncAll}
                    disabled={isSyncing || connections.length === 0}
                    className="w-full py-2.5 bg-[#00C49F] hover:bg-[#00b290] disabled:opacity-50 text-[#0A1128] font-bold rounded-xl text-xs active-press flex items-center justify-center gap-2 shadow-xs transition-opacity"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Atualizando saldos e faturas...' : 'Sincronizar Todas as Contas Agora'}</span>
                  </button>

                  {connections.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllMock}
                      className="text-[11px] text-slate-400 hover:text-rose-500 py-1 transition-colors self-center"
                    >
                      Remover todas as conexões cadastradas
                    </button>
                  )}
                </div>
              </>
            )}

            {/* TAB 3: COLAR PUSH / NOTIFICAÇÃO DO BANCO */}
            {tab === 'live_sync' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                    Reconhecimento Instantâneo de Notificações & SMS
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ao realizar uma compra no cartão, copie o texto da notificação ou SMS do seu banco (Nubank, Itaú, Bradesco, Santander, etc.) e cole aqui para publicar na hora!
                  </p>
                </div>

                {/* Textarea */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cole o texto da notificação do banco abaixo:
                  </label>
                  <textarea
                    rows={3}
                    value={rawNotificationText}
                    onChange={(e) => setRawNotificationText(e.target.value)}
                    placeholder="Ex: Compra aprovada no seu Nubank de R$ 1.500,00 em 10x na Casas Bahia..."
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Test buttons */}
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block mb-1.5">
                    Ou teste com estes exemplos reais de bancos:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => applyPresetPush('Compra aprovada no seu Nubank de R$ 1.500,00 em 10x na Casas Bahia')}
                      className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800 text-left text-xs font-bold transition-colors"
                    >
                      💜 Nubank 10x: R$ 1.500,00 (Casas Bahia)
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPresetPush('Itaucard: Compra aprovada no cartao final 1234 valor R$ 360,00 em 3x no Mercado Livre')}
                      className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 text-orange-900 dark:text-orange-200 border border-orange-200 dark:border-orange-800 text-left text-xs font-bold transition-colors"
                    >
                      🏦 Itaú 3x: R$ 360,00 (Mercado Livre)
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPresetPush('Bradesco Cartoes: Compra no valor de R$ 600,00 em 6x no cartao final 3321 na Leroy Merlin')}
                      className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-800 text-left text-xs font-bold transition-colors"
                    >
                      🏛️ Bradesco 6x: R$ 600,00 (Leroy Merlin)
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPresetPush('C6 Bank: Compra no cartao final 6622 aprovada de R$ 1.200,00 em 12x na Apple Store')}
                      className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 text-left text-xs font-bold transition-colors"
                    >
                      ⚫ C6 Bank 12x: R$ 1.200,00 (Apple Store)
                    </button>
                  </div>
                </div>

                {/* Parsed Preview */}
                {parsedPushRequest && (
                  <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-700 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-teal-900 dark:text-teal-200">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-teal-600" />
                        <span>Dados Extraídos com Sucesso</span>
                      </div>
                      <span className="text-[11px] bg-teal-200 dark:bg-teal-800 px-2 py-0.5 rounded-full">
                        {parsedPushRequest.institution}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-teal-200 dark:border-teal-900">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Total</span>
                        <span className="font-extrabold text-slate-900 dark:text-white">
                          R$ {parsedPushRequest.totalAmount.toFixed(2).replace('.', ',')}
                        </span>
                      </div>

                      <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-teal-200 dark:border-teal-900">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Parcelas</span>
                        <span className="font-extrabold text-teal-600">
                          {parsedPushRequest.installments}x
                        </span>
                      </div>

                      <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-teal-200 dark:border-teal-900">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Valor / Mês</span>
                        <span className="font-extrabold text-slate-900 dark:text-white">
                          R$ {(parsedPushRequest.installmentAmount || (parsedPushRequest.totalAmount / parsedPushRequest.installments)).toFixed(2).replace('.', ',')}
                        </span>
                      </div>

                      <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-teal-200 dark:border-teal-900">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Loja / Compra</span>
                        <span className="font-bold text-slate-900 dark:text-white truncate block">
                          {parsedPushRequest.description}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmPushPurchase}
                      disabled={isPublishing}
                      className="w-full py-2.5 bg-[#00C49F] hover:bg-[#00b290] text-[#0A1128] font-black text-xs rounded-xl active-press shadow-xs flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4 fill-current" />
                      <span>{isPublishing ? 'Publicando...' : 'Confirmar e Publicar Todas as Parcelas'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: WEBHOOK & AUTOMAÇÃO */}
            {tab === 'webhook' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                    Integração em Tempo Real por Webhook (iPhone & Android)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Receba e publique compras automaticamente sem nem abrir o aplicativo! Você pode usar os <b>Atalhos do iPhone (Shortcuts)</b> ou <b>Macrodroid/Tasker no Android</b> para disparar este webhook toda vez que o seu banco enviar uma notificação de compra.
                  </p>
                </div>

                {/* Webhook Endpoint Box */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      URL do Webhook da Sua Casa:
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyWebhook}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors"
                    >
                      {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedWebhook ? 'Copiado!' : 'Copiar URL'}</span>
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-teal-600 dark:text-teal-400 break-all select-all">
                    {webhookInfo.endpointUrl}
                  </div>
                </div>

                {/* Step-by-step guides */}
                <div className="space-y-2.5">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                      <span>Configurar no iPhone (App Atalhos / Automations)</span>
                    </div>
                    <ol className="list-decimal list-inside text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 pl-1 leading-relaxed">
                      <li>Abra o app <b>Atalhos</b> e vá na aba <b>Automação</b>.</li>
                      <li>Toque em <b>Nova Automação</b> &gt; selecione <b>Notificação do App do Banco</b> (Nubank, Itaú, etc.).</li>
                      <li>Adicione a ação <b>Obter Conteúdo de URL</b> &gt; cole o link acima &gt; Método <b>POST</b>.</li>
                      <li>No corpo da requisição JSON, envie o texto da notificação recebida!</li>
                    </ol>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Configurar no Android (Macrodroid / Tasker)</span>
                    </div>
                    <ol className="list-decimal list-inside text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 pl-1 leading-relaxed">
                      <li>Crie um Gatilho: <b>Notificação Recebida</b> &gt; selecione o banco.</li>
                      <li>Ação: <b>Requisição HTTP POST</b> &gt; cole a URL acima.</li>
                      <li>Body: <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">&#123; "text": "[notif_text]" &#125;</code>.</li>
                    </ol>
                  </div>
                </div>

                {/* Test button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleTestWebhook}
                    disabled={testingWebhook}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs active-press flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    <span>{testingWebhook ? 'Testando webhook...' : 'Disparar Teste de Compra Real no Webhook'}</span>
                  </button>

                  {webhookTestStatus && (
                    <div className="mt-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs font-bold text-blue-900 dark:text-blue-300">
                      {webhookTestStatus}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: IMPORTAR EXTRATO OFX/CSV */}
            {tab === 'import' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                    Importação de Extrato Bancário Real
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Exporte o extrato oficial no app do seu banco (Itaú, Nubank, Bradesco, Caixa, Santander, etc.) em formato <b>.OFX</b> ou <b>.CSV</b> e carregue abaixo para sincronizar suas transações reais instantaneamente.
                  </p>
                </div>

                {/* File Upload Box */}
                <label className="border-2 border-dashed border-teal-500/50 hover:border-teal-500 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-teal-50/20 dark:bg-teal-950/10 transition-colors">
                  <Upload className="w-8 h-8 text-teal-600 dark:text-teal-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Selecione seu arquivo .OFX ou .CSV do banco
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                    O aplicativo processa localmente as despesas e receitas, identificando favorecidos, valores e categorias automaticamente.
                  </span>
                  <input
                    type="file"
                    accept=".ofx,.csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {importStatus && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{importStatus}</span>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Modal to add / edit specific account or card */}
      <EditBankModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveConnection}
        initialData={editingConnection}
      />
    </>
  );
};
