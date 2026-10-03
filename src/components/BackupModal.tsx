import React, { useState, useEffect } from 'react';
import { 
  X, ShieldCheck, Download, Mail, MessageCircle, RefreshCw, 
  CheckCircle2, AlertTriangle, FileText, History, Upload, 
  Database, Clock, HardDrive, Smartphone, Share2, Check, ArrowRight
} from 'lucide-react';
import { cloudkit } from '../services/cloudkitSync';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored?: () => void;
}

interface ServerBackupItem {
  filename: string;
  createdAt: string;
  sizeKb: number;
  sizeFormatted: string;
  billsCount: number;
  revenuesCount: number;
  totalBillsAmount?: number;
  userEmail: string;
  notes?: string;
  downloadUrl: string;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'server' | 'restore'>('export');
  const [userEmail, setUserEmail] = useState('l.carlosramos92@gmail.com');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [serverBackups, setServerBackups] = useState<ServerBackupItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Restore state
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [importedFilePayload, setImportedFilePayload] = useState<any | null>(null);
  const [importedFileName, setImportedFileName] = useState<string>('');

  // Household stats
  const activeBills = cloudkit.getBills();
  const activeRevs = cloudkit.getRevenues();
  const devices = cloudkit.getDevices();
  const totalBillsAmount = activeBills.reduce((acc, b) => acc + (b.amount || 0), 0);
  const totalRevsAmount = activeRevs.reduce((acc, r) => acc + (r.amount || 0), 0);

  useEffect(() => {
    if (isOpen) {
      loadServerBackups();
      setSuccessMsg(null);
      setErrorMsg(null);
      setImportedFilePayload(null);
      setImportedFileName('');
    }
  }, [isOpen]);

  const loadServerBackups = async () => {
    setIsLoadingHistory(true);
    try {
      const list = await cloudkit.getServerBackups();
      setServerBackups(list);
    } catch {
      // ignore
    } finally {
      setIsLoadingHistory(false);
    }
  };

  if (!isOpen) return null;

  // 1-Click Backup Export
  const handleDownloadBackup = async () => {
    setIsProcessing(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const result = await cloudkit.createFullBackup(userEmail);
      setSuccessMsg(`✅ Backup completo "${result.filename}" gerado e baixado com sucesso! Arquivo salvo em seus Downloads.`);
      await loadServerBackups();
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err: any) {
      setErrorMsg(`Erro ao gerar backup: ${err?.message || 'Falha inesperada'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 1-Click Email Backup
  const handleEmailBackup = async () => {
    setIsProcessing(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const result = await cloudkit.createFullBackup(userEmail);
      setSuccessMsg(`✅ Cópia de segurança enviada ao servidor e e-mail pronto para envio para ${userEmail}!`);
      await loadServerBackups();

      // Open email client with pre-filled content
      if (typeof window !== 'undefined' && result.emailMailtoUrl) {
        window.location.href = result.emailMailtoUrl;
      }
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err: any) {
      setErrorMsg(`Erro ao preparar e-mail: ${err?.message || 'Falha inesperada'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // WhatsApp Share Backup Summary
  const handleShareWhatsApp = () => {
    const now = new Date().toLocaleDateString('pt-BR');
    const text = encodeURIComponent(
      `🔒 *Backup das Finanças da Nossa Casa (${now})*\n\n` +
      `• *Contas Ativas*: ${activeBills.length} (R$ ${totalBillsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})\n` +
      `• *Salários & Receitas*: ${activeRevs.length} (R$ ${totalRevsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})\n` +
      `• *Sobra Projetada*: R$ ${(totalRevsAmount - totalBillsAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `• *Aparelhos Sincronizados*: ${devices.length} celulares pareados\n\n` +
      `✅ Arquivo de segurança gerado com sucesso para manter nossas finanças 100% protegidas!`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Restore from Server Snapshot
  const handleRestoreServerItem = async (filename: string) => {
    if (!window.confirm(`Deseja restaurar o backup "${filename}"? Esta ação atualizará os dados da casa.`)) {
      return;
    }

    setIsProcessing(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const result = await cloudkit.restoreServerBackup(filename, restoreMode);
      if (result.success) {
        setSuccessMsg(`✅ ${result.message}`);
        onDataRestored?.();
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        setErrorMsg(result.message);
      }
    } catch (err: any) {
      setErrorMsg(`Falha na restauração: ${err?.message || 'Erro inesperado'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // File Upload for Local Restore
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = event.target?.result as string;
        const parsed = JSON.parse(raw);
        setImportedFilePayload(parsed);
        setErrorMsg(null);
      } catch {
        setErrorMsg('Arquivo inválido. Por favor selecione um arquivo .json de backup do aplicativo.');
        setImportedFilePayload(null);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExecuteLocalRestore = async () => {
    if (!importedFilePayload) return;

    setIsProcessing(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const rawString = JSON.stringify(importedFilePayload);
      const result = await cloudkit.restoreFromLocalJson(rawString, restoreMode);
      if (result.success) {
        setSuccessMsg(`✅ ${result.message}`);
        setImportedFilePayload(null);
        setImportedFileName('');
        onDataRestored?.();
        await loadServerBackups();
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        setErrorMsg(result.message);
      }
    } catch (err: any) {
      setErrorMsg(`Erro ao restaurar: ${err?.message || 'Falha de processamento'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#0E172F] w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[min(92dvh,calc(100vh-2rem))] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#0A1128] text-white px-5 py-4 flex items-center justify-between flex-shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-[#00C49F] flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Backup &amp; Segurança dos Dados
              </h2>
              <p className="text-[11px] text-slate-400">
                Guarde cópias seguras no e-mail ou restaure com 1 clique
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'export'
                ? 'bg-white dark:bg-[#0E172F] text-teal-600 dark:text-teal-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Gerar Backup</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('server');
              loadServerBackups();
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'server'
                ? 'bg-white dark:bg-[#0E172F] text-teal-600 dark:text-teal-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Snapshots ({serverBackups.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('restore')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'restore'
                ? 'bg-white dark:bg-[#0E172F] text-teal-600 dark:text-teal-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Restaurar</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 min-h-0 overscroll-contain">
          {/* Notification Messages */}
          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span className="flex-1">{successMsg}</span>
              <button type="button" onClick={() => setSuccessMsg(null)} className="p-0.5 text-emerald-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
              <span className="flex-1">{errorMsg}</span>
              <button type="button" onClick={() => setErrorMsg(null)} className="p-0.5 text-rose-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TAB 1: EXPORT / GENERATE BACKUP */}
          {activeTab === 'export' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Stats Card */}
              <div className="bg-gradient-to-br from-slate-900 via-[#0A1128] to-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#00C49F]" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                      Dados Ativos na Casa
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                    Sincronizado
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800 text-center">
                  <div className="p-2 rounded-xl bg-white/5">
                    <span className="text-base sm:text-lg font-black text-white block">
                      {activeBills.length}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      Contas / Dívidas
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5">
                    <span className="text-base sm:text-lg font-black text-white block">
                      {activeRevs.length}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      Salários / Receitas
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5">
                    <span className="text-base sm:text-lg font-black text-white block">
                      {devices.length}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      Aparelhos do Casal
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-300 font-medium flex items-center justify-between pt-1">
                  <span>Volume Total de Dívidas:</span>
                  <span className="font-bold text-teal-300">
                    R$ {totalBillsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Email Destination Input */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  E-mail para Envio do Backup
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="seuemail@gmail.com"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
                  O backup completo com todas as contas e comprovantes será associado a este e-mail.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-1">
                {/* 1-Click Download Button */}
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  disabled={isProcessing}
                  className="w-full py-3 px-4 bg-[#00C49F] hover:bg-[#00b290] disabled:bg-slate-300 text-[#0A1128] font-black rounded-xl text-xs sm:text-sm active-press flex items-center justify-center gap-2 shadow-md shadow-teal-500/20 transition-all cursor-pointer"
                >
                  <Download className={`w-4 h-4 ${isProcessing ? 'animate-bounce' : ''}`} />
                  <span>{isProcessing ? 'Gerando Arquivo...' : '1-Clique: Baixar Arquivo de Backup (.json)'}</span>
                </button>

                {/* Email Backup Button */}
                <button
                  type="button"
                  onClick={handleEmailBackup}
                  disabled={isProcessing}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs active-press flex items-center justify-center gap-2 transition-all border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  <Mail className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Enviar Cópia para Meu E-mail</span>
                </button>

                {/* WhatsApp Share Button */}
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="w-full py-2 px-4 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-bold rounded-xl text-xs active-press flex items-center justify-center gap-2 transition-all border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Compartilhar Resumo no WhatsApp do Casal</span>
                </button>
              </div>

              {/* Informative Note */}
              <div className="p-3 bg-teal-50/70 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800/60 text-[11px] text-teal-900 dark:text-teal-200 space-y-1">
                <span className="font-bold block">🛡️ Proteção Contínua e Gratuita:</span>
                <p className="leading-relaxed">
                  Os arquivos de backup incluem todas as contas ativas, despesas fixas, parcelamentos com contagem regressiva, receitas do casal e histórico de comprovantes.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: SERVER BACKUPS HISTORY */}
          {activeTab === 'server' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider block">
                    Snapshots Salvos no Servidor
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Cópias automáticas e manuais arquivadas com segurança
                  </span>
                </div>
                <button
                  type="button"
                  onClick={loadServerBackups}
                  disabled={isLoadingHistory}
                  className="text-[11px] font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                  <span>Atualizar</span>
                </button>
              </div>

              {isLoadingHistory ? (
                <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-teal-500" />
                  <p>Buscando cópias de segurança...</p>
                </div>
              ) : serverBackups.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-2">
                  <HardDrive className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-semibold">Nenhum snapshot arquivado no servidor ainda.</p>
                  <p className="text-[11px]">
                    Gere o seu primeiro backup na aba &quot;Gerar Backup&quot; para registrar um ponto de restauração.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {serverBackups.map((item, idx) => {
                    const dateObj = new Date(item.createdAt);
                    const formattedDate = dateObj.toLocaleDateString('pt-BR');
                    const formattedTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                    return (
                      <div
                        key={item.filename || idx}
                        className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate" title={item.filename}>
                                {formattedDate} às {formattedTime}
                              </p>
                              <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                                {item.billsCount} contas • {item.revenuesCount} receitas • {item.sizeFormatted}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            Salvo
                          </span>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                          <a
                            href={item.downloadUrl}
                            download={item.filename}
                            className="px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors"
                          >
                            <Download className="w-3 h-3" />
                            <span>Baixar</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRestoreServerItem(item.filename)}
                            disabled={isProcessing}
                            className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold rounded-lg active-press transition-colors cursor-pointer"
                          >
                            Restaurar Este Ponto
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RESTORE / IMPORT BACKUP */}
          {activeTab === 'restore' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider block">
                  Restaurar de um Arquivo (.json)
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Importe um arquivo de backup salvo no seu celular ou computador
                </span>
              </div>

              {/* Mode Selection */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Modo de Restauração:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRestoreMode('replace')}
                    className={`p-2.5 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                      restoreMode === 'replace'
                        ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-950 dark:text-teal-200 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="block font-black">Substituir Tudo</span>
                    <span className="text-[10px] opacity-80 block">Espelha o arquivo exatamente como foi salvo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRestoreMode('merge')}
                    className={`p-2.5 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                      restoreMode === 'merge'
                        ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-950 dark:text-teal-200 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="block font-black">Mesclar Dados</span>
                    <span className="text-[10px] opacity-80 block">Adiciona sem apagar as contas criadas recentemente</span>
                  </button>
                </div>
              </div>

              {/* File Upload Selector */}
              <label className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-400 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50/50 dark:bg-slate-900/40 hover:bg-teal-50/40 dark:hover:bg-teal-950/20 transition-all group">
                <Upload className="w-7 h-7 text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors" />
                <div className="text-center">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors block">
                    {importedFileName ? `Selecionado: ${importedFileName}` : 'Toque para selecionar o arquivo (.json)'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Aceita qualquer backup gerado pelas Finanças da Minha Casa
                  </span>
                </div>
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>

              {/* Preview of Imported File */}
              {importedFilePayload && (
                <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-2xl border border-emerald-300 dark:border-emerald-800 space-y-2.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Arquivo Validado e Pronto</span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                      {importedFilePayload.createdAt ? new Date(importedFilePayload.createdAt).toLocaleDateString('pt-BR') : 'Backup Recente'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-200">
                    <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-emerald-200 dark:border-emerald-800">
                      <span className="block font-bold">
                        {(importedFilePayload.household?.bills || importedFilePayload.bills || []).length} Contas
                      </span>
                      <span className="text-[10.5px] text-slate-500">Prontas para importar</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-emerald-200 dark:border-emerald-800">
                      <span className="block font-bold">
                        {(importedFilePayload.household?.revenues || importedFilePayload.revenues || []).length} Receitas
                      </span>
                      <span className="text-[10.5px] text-slate-500">Prontas para importar</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteLocalRestore}
                    disabled={isProcessing}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl active-press shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirmar e Restaurar Agora</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex-shrink-0 p-3.5 sm:p-4 bg-slate-50 dark:bg-[#0c142b] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between z-20">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Backup criptografado &amp; compatível com todos os dispositivos
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl active-press transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
