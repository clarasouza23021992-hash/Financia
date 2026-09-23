import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, RefreshCw, AlertCircle, Database, CheckCircle2, 
  ArrowRight, Download, Upload, Calendar, X, Sparkles, FileText, Landmark
} from 'lucide-react';
import { cloudkit } from '../services/cloudkitSync';
import { Bill, Revenue } from '../types/finance';

interface DataRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMonthId: string;
  onSelectMonth?: (monthId: string) => void;
  onDataRestored: () => void;
}

export const DataRecoveryModal: React.FC<DataRecoveryModalProps> = ({
  isOpen,
  onClose,
  currentMonthId,
  onSelectMonth,
  onDataRestored,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    billsRecovered: number;
    revenuesRecovered: number;
    sources: string[];
    foundOtherMonths: string[];
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'scan' | 'preset' | 'backup'>('scan');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      handleAutoDeepScan();
    } else {
      setScanResult(null);
      setFeedbackMsg(null);
    }
  }, [isOpen]);

  const handleAutoDeepScan = async () => {
    setIsScanning(true);
    try {
      const res = await cloudkit.scanAndRecoverLostData();
      setScanResult(res);
      if (res.billsRecovered > 0 || res.revenuesRecovered > 0) {
        onDataRestored();
        setFeedbackMsg(`Varredura concluída: recuperamos ${res.billsRecovered} conta(s) e ${res.revenuesRecovered} receita(s)!`);
      }
    } catch {
      // scan error handled gracefully
    } finally {
      setIsScanning(false);
    }
  };

  const handleRestorePreset = () => {
    if (confirm('Deseja restaurar as contas e receitas do casal (Carlos e Paula)? Isso trará as despesas essenciais (Condomínio, Luz, Gás, Internet, Moradia, Mercado, Saúde, Streaming) e salários.')) {
      cloudkit.restoreCouplePresetData(currentMonthId);
      onDataRestored();
      setFeedbackMsg('Lançamentos de Carlos e Paula restaurados com sucesso para ' + currentMonthId + '!');
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  const handleExportBackup = () => {
    const bills = cloudkit.getBills();
    const revenues = cloudkit.getRevenues();
    const profiles = cloudkit.getProfiles();
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      householdId: cloudkit.getHouseholdId(),
      bills,
      revenues,
      profiles,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_financas_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedbackMsg('Backup baixado com sucesso em arquivo JSON!');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && (Array.isArray(parsed.bills) || Array.isArray(parsed.revenues))) {
          if (Array.isArray(parsed.bills)) cloudkit.saveBills(parsed.bills);
          if (Array.isArray(parsed.revenues)) cloudkit.saveRevenues(parsed.revenues);
          onDataRestored();
          setFeedbackMsg('Backup importado e restaurado com êxito!');
          setTimeout(() => {
            onClose();
          }, 1500);
        } else {
          alert('Arquivo de backup inválido ou sem formato reconhecido.');
        }
      } catch {
        alert('Erro ao ler o arquivo JSON de backup.');
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-white dark:bg-[#0D152A] rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-[#131D38]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Recuperador de Dados & Backups
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Resgate automático de contas e receitas perdidas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-100 dark:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 bg-white dark:bg-[#0D152A]">
          <button
            onClick={() => setActiveTab('scan')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'scan'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>Varredura & Resgate</span>
          </button>
          <button
            onClick={() => setActiveTab('preset')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'preset'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Base Carlos & Paula</span>
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'backup'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Arquivo / JSON</span>
          </button>
        </div>

        {/* Feedback message banner */}
        {feedbackMsg && (
          <div className="mx-5 mt-4 p-3 bg-teal-500/10 border border-teal-500/20 rounded-2xl flex items-center gap-2.5 text-xs text-teal-700 dark:text-teal-300 font-medium">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-teal-500" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'scan' && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-[#131D38] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Varredura Profunda no Navegador e Nuvem
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                      Nosso motor vasculha o histórico do navegador (chaves de backup, snapshots do cofre de segurança e armazenamento em nuvem) para recuperar qualquer conta ou salário anterior.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAutoDeepScan}
                  disabled={isScanning}
                  className="w-full py-2.5 px-4 bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-[#0A1128] font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all active-press"
                >
                  <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>{isScanning ? 'Varrendo armazenamento...' : 'Executar Varredura Profunda Agora'}</span>
                </button>
              </div>

              {/* Scan Results Card */}
              {scanResult && (
                <div className="bg-white dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Resultado da Análise</span>
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/70 dark:border-slate-800">
                      <div className="text-lg font-black text-slate-900 dark:text-white">
                        {scanResult.billsRecovered}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">
                        Contas Recuperadas
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/70 dark:border-slate-800">
                      <div className="text-lg font-black text-slate-900 dark:text-white">
                        {scanResult.revenuesRecovered}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">
                        Receitas / Salários
                      </div>
                    </div>
                  </div>

                  {scanResult.sources.length > 0 && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Fontes encontradas: </span>
                      {scanResult.sources.join(', ')}
                    </div>
                  )}

                  {/* Other Months check */}
                  {scanResult.foundOtherMonths && scanResult.foundOtherMonths.length > 0 && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Contas localizadas em outros meses:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {scanResult.foundOtherMonths.map(m => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              if (onSelectMonth) onSelectMonth(m);
                              onClose();
                            }}
                            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 rounded-lg text-[11px] font-bold border border-amber-400/30 flex items-center gap-1"
                          >
                            <span>Ir para {m}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {scanResult.billsRecovered === 0 && scanResult.revenuesRecovered === 0 && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 text-center py-2">
                      Nenhum histórico antigo estava no navegador neste dispositivo. Caso seu histórico tenha sido limpo ou você esteja em uma janela anônima, use a aba <strong>"Base Carlos & Paula"</strong> para restaurar todos os lançamentos instantaneamente.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'preset' && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-[#131D38] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Restaurar Base Financeira Completa (Carlos & Paula)
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                      Se você perdeu seus dados ou limpou o cache, este botão recria imediatamente todas as contas essenciais da casa e salários do casal configurados para o mês atual ({currentMonthId}).
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <div className="font-bold text-slate-800 dark:text-white">Contas que serão geradas:</div>
                  <div className="grid grid-cols-2 gap-1 text-[10.5px]">
                    <div>• Condomínio (R$ 580,00)</div>
                    <div>• Luz / Enel (R$ 245,60)</div>
                    <div>• Gás Encanado (R$ 85,40)</div>
                    <div>• Internet Fibra (R$ 139,90)</div>
                    <div>• Financiamento (R$ 2.450,00)</div>
                    <div>• Mercado do Mês (R$ 1.650,00)</div>
                    <div>• Plano de Saúde (R$ 980,00)</div>
                    <div>• Streaming / TV (R$ 69,90)</div>
                  </div>
                  <div className="font-bold text-slate-800 dark:text-white pt-2">Salários do Casal:</div>
                  <div className="text-[10.5px]">
                    • Carlos: R$ 6.850,00 | Paula: R$ 7.240,00
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRestorePreset}
                  className="w-full py-2.5 px-4 bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-[#0A1128] font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all active-press"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Restaurar Base Financeira Agora</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-[#131D38] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Backup Manual & Portabilidade
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Baixe uma cópia de segurança em formato JSON a qualquer momento ou envie um arquivo anterior para restaurar tudo.
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="p-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-1.5 transition-all shadow-xs"
                  >
                    <Download className="w-4 h-4 text-teal-500" />
                    <span>Baixar Backup</span>
                  </button>

                  <label className="p-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer">
                    <Upload className="w-4 h-4 text-blue-500" />
                    <span>Importar Backup</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackup}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-[#131D38] flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>Cofre local de segurança ativo</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white text-xs font-bold rounded-xl active-press"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
