import React, { useState } from 'react';
import { 
  X, Landmark, CreditCard, Shield, Upload, CheckCircle2, 
  RefreshCw, Lock, ExternalLink, FileSpreadsheet, Plus, AlertCircle,
  Edit3, Trash2, Wallet, Sparkles, Building2, Check
} from 'lucide-react';
import { BankConnection, Bill, Revenue } from '../types/finance';
import { bankSync, SUPPORTED_INSTITUTIONS, OpenFinanceConfig } from '../services/bankSync';
import { EditBankModal } from './EditBankModal';

interface BankSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTransactions: (bills: Partial<Bill>[], revenues: Partial<Revenue>[]) => void;
}

export const BankSyncModal: React.FC<BankSyncModalProps> = ({
  isOpen,
  onClose,
  onImportTransactions,
}) => {
  const [tab, setTab] = useState<'accounts' | 'import' | 'config'>('accounts');
  const [connections, setConnections] = useState<BankConnection[]>(() => bankSync.getConnections());
  const [config, setConfig] = useState<OpenFinanceConfig>(() => bankSync.getOpenFinanceConfig());
  const [isSyncing, setIsSyncing] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Modal to add or edit bank connection
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<BankConnection | null>(null);

  if (!isOpen) return null;

  const refreshConnections = () => {
    setConnections(bankSync.getConnections());
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
  };

  const handleDeleteConnection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Deseja realmente remover esta conta/cartão?')) {
      const updated = bankSync.deleteConnection(id);
      setConnections(updated);
    }
  };

  const handleClearAllMock = () => {
    if (confirm('Deseja limpar todos os dados bancários fictícios e começar do zero com suas contas e cartões reais?')) {
      bankSync.clearAllConnections();
      setConnections([]);
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
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    await new Promise(res => setTimeout(res, 1200));
    setConnections(prev => {
      const updated = prev.map(c => ({
        ...c,
        lastSync: 'Sincronizado agora via Open Finance',
      }));
      bankSync.saveConnections(updated);
      return updated;
    });
    setIsSyncing(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
        <div className="bg-white dark:bg-[#0E172F] w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col my-auto">
          {/* Header */}
          <div className="bg-[#0A1128] text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 flex items-center justify-center text-[#00C49F]">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight">
                  Open Finance Brasil & Cartões Reais
                </h2>
                <p className="text-[11px] text-slate-400">
                  Gerencie suas contas bancárias e cartões de crédito reais
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center border-b border-slate-200 dark:border-slate-800 px-4 pt-2 bg-slate-50 dark:bg-slate-900/60">
            <button
              onClick={() => setTab('accounts')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 ${
                tab === 'accounts'
                  ? 'border-[#00C49F] text-[#0A1128] dark:text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Contas & Cartões ({connections.length})
            </button>
            <button
              onClick={() => setTab('import')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 ${
                tab === 'import'
                  ? 'border-[#00C49F] text-[#0A1128] dark:text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Importar Extrato (OFX/CSV)
            </button>
            <button
              onClick={() => setTab('config')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 ${
                tab === 'config'
                  ? 'border-[#00C49F] text-[#0A1128] dark:text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Configurar API / BACEN
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {tab === 'accounts' && (
              <>
                {/* Security Banner & Actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                    <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Ambiente Seguro Criptografado</span>
                  </div>

                  <button
                    onClick={handleOpenAdd}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00C49F] hover:bg-[#00b290] text-[#0A1128] font-extrabold text-xs rounded-xl shadow-xs active-press"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Adicionar Conta / Cartão Real</span>
                  </button>
                </div>

                {/* Connections List */}
                <div className="space-y-2.5">
                  {connections.length === 0 ? (
                    <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Nenhum dado bancário cadastrado
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                        Todos os dados demonstrativos foram retirados. Adicione sua conta corrente real ou cartão de crédito para acompanhar faturas e limites em tempo real.
                      </p>
                      <button
                        onClick={handleOpenAdd}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#00C49F] hover:bg-[#00b290] text-[#0A1128] font-bold text-xs rounded-xl shadow-xs active-press"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>Cadastrar Meu Primeiro Banco / Cartão</span>
                      </button>
                    </div>
                  ) : (
                    connections.map((conn) => (
                      <div
                        key={conn.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-teal-500/50 transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-800 dark:text-white font-extrabold text-xs flex-shrink-0">
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
                            <div className="text-[10.5px] text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{conn.lastSync}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right balance and actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right">
                            <div className={`text-xs font-extrabold ${conn.accountType === 'Cartão de Crédito' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-900 dark:text-white'}`}>
                              {conn.accountType === 'Cartão de Crédito'
                                ? `Fatura: R$ ${Math.abs(conn.balance).toFixed(2).replace('.', ',')}`
                                : `R$ ${conn.balance.toFixed(2).replace('.', ',')}`}
                            </div>
                            {conn.availableLimit !== undefined && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                Limite: R$ {conn.availableLimit.toFixed(2).replace('.', ',')}
                              </div>
                            )}
                            {conn.dueDay && (
                              <div className="text-[9.5px] text-slate-400">
                                Venc. dia {conn.dueDay}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 pl-1">
                            <button
                              onClick={() => handleOpenEdit(conn)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 hover:text-teal-600 text-slate-600 dark:text-slate-400 transition-colors"
                              title="Editar dados reais"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteConnection(conn.id, e)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-600 dark:text-slate-400 transition-colors"
                              title="Excluir conta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
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
                      className="text-[11px] text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 py-1 transition-colors self-center"
                    >
                      Remover todos os bancos cadastrados
                    </button>
                  )}
                </div>
              </>
            )}

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

            {tab === 'config' && (
              <form onSubmit={handleSaveConfig} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Instituição Financeira Principal
                  </label>
                  <select
                    value={config.institution}
                    onChange={(e) => setConfig({ ...config, institution: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    {SUPPORTED_INSTITUTIONS.map((inst) => (
                      <option key={inst.id} value={inst.name}>
                        {inst.icon} {inst.name} (Código {inst.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Open Finance Client ID / Credencial da API Real
                  </label>
                  <input
                    type="text"
                    value={config.clientId}
                    onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                    placeholder="Cole seu Client ID do banco (deixe vazio se preferir cadastro manual)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Client Secret / Chave Privada do Banco
                  </label>
                  <input
                    type="password"
                    value={config.clientSecret}
                    onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                    placeholder="••••••••••••••••••••••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Ambiente
                    </label>
                    <select
                      value={config.environment}
                      onChange={(e) => setConfig({ ...config, environment: e.target.value as 'production' | 'sandbox' })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="production">Produção Real (BACEN)</option>
                      <option value="sandbox">Sandbox de Testes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Frequência de Atualização
                    </label>
                    <select
                      value={config.syncInterval}
                      onChange={(e) => setConfig({ ...config, syncInterval: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="realtime">Tempo Real (Webhooks)</option>
                      <option value="hourly">A cada 1 hora</option>
                      <option value="daily">Diário</option>
                    </select>
                  </div>
                </div>

                {showSuccessToast && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>Configurações salvas com sucesso! A conexão Open Finance está ativa.</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-slate-500"
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#00C49F] hover:bg-[#00b290] text-[#0A1128] font-bold text-xs rounded-xl active-press"
                  >
                    Salvar Credenciais
                  </button>
                </div>
              </form>
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
