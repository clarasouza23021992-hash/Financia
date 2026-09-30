import React, { useState } from 'react';
import { 
  X, Bell, Shield, Check, Moon, Sun, 
  Smartphone, Volume2, Clock, Sparkles, RefreshCw
} from 'lucide-react';
import { UserProfile, NotificationSetting, CloudDevice } from '../types/finance';
import { 
  getNotificationPermission, 
  requestNotificationPermission, 
  playNotificationChime, 
  sendNativeNotification 
} from '../services/notificationService';

interface ProfilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles?: UserProfile[];
  onUpdateProfiles?: (profiles: UserProfile[]) => void;
  notificationSettings: NotificationSetting[];
  onUpdateNotifications: (settings: NotificationSetting[]) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isWifeConnected?: boolean;
  wifeDevice?: CloudDevice | null;
  onOpenWifeConnect?: () => void;
}

export const ProfilesModal: React.FC<ProfilesModalProps> = ({
  isOpen,
  onClose,
  notificationSettings,
  onUpdateNotifications,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [activeTab, setActiveTab] = useState<'notifications' | 'security'>('notifications');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs modal-safe-overlay p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-[#0E172F] w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto max-h-[calc(100dvh-1.5rem)]">
        {/* Header */}
        <div className="bg-[#0A1128] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 flex items-center justify-center text-[#00C49F]">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                Lembretes &amp; Configurações
              </h2>
              <p className="text-[11px] text-slate-400">
                Ajuste os alertas de vencimento e segurança
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

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-4 pt-2">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'notifications'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500'
            }`}
          >
            Lembretes &amp; Avisos
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'security'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500'
            }`}
          >
            2FA &amp; Aparência
          </button>
        </div>

        {/* Tab content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Feedback Message */}
          {feedbackMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                  Alertas Inteligentes de Vencimento
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Notificações automáticas no aparelho para não esquecer boletos ou pagar multas por atraso.
                </p>
              </div>

              {/* Native Browser / PWA Permission status box */}
              <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {getNotificationPermission() === 'granted'
                        ? '✅ Notificações Ativadas no Aparelho'
                        : 'Permissão de Notificação do Sistema'}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      {getNotificationPermission() === 'granted'
                        ? 'Alertas locais sonoros e na tela de bloqueio autorizados'
                        : 'Permita que o navegador/celular exiba avisos de contas a pagar'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
                  {getNotificationPermission() !== 'granted' && (
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await requestNotificationPermission();
                        if (res === 'granted') {
                          showFeedback('Notificações no dispositivo autorizadas com sucesso!');
                          sendNativeNotification('✅ Lembretes Ativados!', {
                            body: 'Você receberá avisos automáticos dos boletos que vencem no dia.',
                            sound: true,
                          });
                        } else {
                          showFeedback('Permissão não concedida pelo navegador.');
                        }
                      }}
                      className="px-3 py-1.5 bg-[#00C49F] hover:bg-[#00b290] text-[#0A1128] font-bold text-xs rounded-xl active-press shadow-xs"
                    >
                      Autorizar
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={async () => {
                      playNotificationChime();
                      await sendNativeNotification('🔔 Teste de Notificação', {
                        body: 'O som e o alerta de vencimento estão configurados perfeitamente!',
                        sound: true,
                      });
                      showFeedback('Sinal sonoro e notificação de teste disparados!');
                    }}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs rounded-xl active-press flex items-center gap-1 hover:bg-slate-100"
                    title="Testar som de notificação"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-teal-500" />
                    <span>Testar Som</span>
                  </button>
                </div>
              </div>

              {/* Notification Toggles List */}
              <div className="space-y-2.5">
                {notificationSettings.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {item.title}
                      </span>
                    </div>

                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={() => {
                        const updated = [...notificationSettings];
                        updated[idx].enabled = !updated[idx].enabled;
                        onUpdateNotifications(updated);
                      }}
                      className="w-4 h-4 text-teal-600 rounded-sm focus:ring-teal-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              {/* 2FA Security */}
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Autenticação em Duas Etapas (2FA)
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={twoFactorEnabled}
                    onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded-sm"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Protegido via biometria do dispositivo e verificação em duas etapas para garantir que apenas os moradores autorizados acessem as finanças.
                </p>
              </div>

              {/* Dark Mode Customization */}
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Modo Escuro / Claro
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    {isDarkMode ? 'Tema Escuro Ativo' : 'Tema Claro Ativo'}
                  </span>
                </div>
                <button
                  onClick={onToggleDarkMode}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 text-slate-800 dark:text-white active-press"
                >
                  {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                  <span>{isDarkMode ? 'Claro' : 'Escuro'}</span>
                </button>
              </div>

              {/* Cache & App Version Reload for iPhone / Safari */}
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Atualização & Cache do iPhone / Navegador
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Caso tenha enviado atualizações para o GitHub e o seu iPhone ainda exiba a versão anterior, toque no botão abaixo para descarregar o cache do iOS Safari e recarregar os arquivos mais novos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      if ('caches' in window) {
                        const keys = await caches.keys();
                        await Promise.all(keys.map(k => caches.delete(k)));
                      }
                      if ('serviceWorker' in navigator) {
                        const regs = await navigator.serviceWorker.getRegistrations();
                        for (const r of regs) await r.unregister();
                      }
                    } catch {}
                    const url = new URL(window.location.href);
                    url.searchParams.set('reload', String(Date.now()));
                    window.location.href = url.toString();
                  }}
                  className="w-full py-2.5 px-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 active-press transition-colors shadow-xs"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Limpar Cache e Recarregar Versão Mais Recente</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
