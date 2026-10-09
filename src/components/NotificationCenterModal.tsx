import React, { useState } from 'react';
import { 
  X, Bell, CheckCircle2, AlertTriangle, Clock, 
  Trash2, Volume2, Sparkles, ArrowRight, ShieldCheck,
  Check, Smartphone, ExternalLink
} from 'lucide-react';
import { InAppNotification, Bill } from '../types/finance';
import { 
  getNotificationPermission, 
  requestNotificationPermission, 
  sendNativeNotification, 
  playNotificationChime 
} from '../services/notificationService';
import { cloudkit } from '../services/cloudkitSync';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: InAppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  bills: Bill[];
  onSelectBill: (bill: Bill) => void;
  onOpenSettings: () => void;
  onSimulateAlteration?: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  bills,
  onSelectBill,
  onOpenSettings,
  onSimulateAlteration,
}) => {
  const [filter, setFilter] = useState<'all' | 'changes' | 'urgent' | 'unread'>('all');
  const [permission, setPermission] = useState<NotificationPermission>(() => getNotificationPermission());
  const [testSent, setTestSent] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    if (res === 'granted') {
      sendNativeNotification('✅ Notificações Ativadas!', {
        body: 'Você agora receberá avisos toda vez que alguém alterar uma dívida ou nos vencimentos.',
        sound: true,
      });
    }
  };

  const handleTestNotification = async () => {
    playNotificationChime();
    setTestSent(true);
    await sendNativeNotification('🔔 Teste de Notificação', {
      body: 'Seu sistema de avisos de alterações e vencimentos está 100% ativo!',
      sound: true,
    });
    setTimeout(() => setTestSent(false), 3000);
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const changesCount = notifications.filter(n => Boolean(n.actorName || n.actionType || n.type === 'success')).length;

  const filtered = notifications.filter(n => {
    if (filter === 'changes') return Boolean(n.actorName || n.actionType || n.type === 'success');
    if (filter === 'urgent') return n.type === 'urgent' || n.type === 'warning';
    if (filter === 'unread') return !n.read;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 modal-safe-overlay bg-slate-950/70 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div 
        className="bg-white dark:bg-[#10182F] w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col my-auto max-h-[calc(100dvh-1.5rem)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Lembretes & Notificações
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-500 text-[#0A1128]">
                    {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Avisos automáticos de boletos do dia e pendências
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Browser Permission Banner */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Smartphone className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
              <div className="text-xs min-w-0">
                <span className="font-bold text-slate-900 dark:text-white block truncate">
                  {permission === 'granted'
                    ? 'Notificações no Dispositivo: Ativas'
                    : permission === 'denied'
                    ? 'Notificações Bloqueadas no Navegador'
                    : 'Ativar Avisos no Navegador / PWA'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                  {permission === 'granted'
                    ? 'Você receberá avisos sonoros e pop-ups nos dias de vencimento'
                    : 'Receba alertas automáticos mesmo com o app em segundo plano'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-auto">
              {permission !== 'granted' && permission !== 'denied' && (
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="px-3 py-1.5 bg-[#00C49F] hover:bg-[#00b290] text-[#0A1128] font-bold text-xs rounded-xl active-press shadow-xs flex items-center gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Permitir</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleTestNotification}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 font-bold text-xs rounded-xl active-press flex items-center gap-1"
                title="Testar som e notificação no seu aparelho"
              >
                <Volume2 className="w-3.5 h-3.5 text-teal-500" />
                <span>{testSent ? 'Enviado!' : 'Testar Som'}</span>
              </button>

              {onSimulateAlteration && (
                <button
                  type="button"
                  onClick={onSimulateAlteration}
                  className="px-2.5 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30 font-bold text-xs rounded-xl active-press flex items-center gap-1"
                  title="Simular um aviso de alteração feita pelo cônjuge em tempo real"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                  <span>Simular Alteração</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter Chips & Action Controls */}
        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: `Todas (${notifications.length})` },
              { id: 'changes', label: `Alterações (${changesCount})` },
              { id: 'unread', label: `Não lidas (${unreadCount})` },
              { id: 'urgent', label: `Urgentes` },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id as any)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all active-press shrink-0 ${
                  filter === tab.id
                    ? 'bg-slate-900 dark:bg-teal-500 text-white dark:text-[#0A1128]'
                    : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline px-2 py-1"
              >
                Ler todas
              </button>
            )}
            {notifications.length > 0 && !showClearConfirm && (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 px-2 py-1 flex items-center gap-1 cursor-pointer"
                title="Limpar histórico"
              >
                <Trash2 className="w-3 h-3" />
                <span>Limpar</span>
              </button>
            )}
            {showClearConfirm && (
              <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/50 px-2 py-1 rounded-xl border border-rose-300 dark:border-rose-800 text-[11px]">
                <span className="text-rose-700 dark:text-rose-300 font-bold">Apagar tudo?</span>
                <button
                  type="button"
                  onClick={() => {
                    onClearAll();
                    setShowClearConfirm(false);
                  }}
                  className="font-black text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-200 underline cursor-pointer"
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 cursor-pointer"
                >
                  Não
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Nenhum lembrete pendente
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Tudo em dia! Seus boletos que vencem no dia ou contas em atraso aparecerão aqui automaticamente.
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const matchedBill = item.billId ? bills.find(b => b.id === item.billId) : undefined;
              const isUrgent = item.type === 'urgent';
              const isWarning = item.type === 'warning';

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (!item.read) onMarkAsRead(item.id);
                  }}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    !item.read
                      ? isUrgent
                        ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                        : isWarning
                        ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                        : 'bg-teal-50/70 dark:bg-teal-950/30 border-teal-300 dark:border-teal-800'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isUrgent
                          ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                          : isWarning
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                          : 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
                      }`}>
                        {isUrgent ? (
                          <Clock className="w-4 h-4 animate-pulse" />
                        ) : isWarning ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          <Bell className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {item.title}
                          </h4>
                          {item.actorName && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                              {(() => {
                                const raw = item.actorName || '';
                                const low = raw.toLowerCase();
                                const rawDev = item.sourceDeviceName || item.deviceName || '';
                                const devLow = rawDev.toLowerCase();
                                const wifeName = cloudkit.getWifeName();
                                const titularName = cloudkit.getTitularName();
                                if (low.includes(wifeName.toLowerCase()) || low.includes('esposa') || low.includes('cônjuge') || low.includes('clara') || low.includes('paula') || devLow.includes('paula') || devLow.includes('esposa')) {
                                  return `👩🏻 ${wifeName}`;
                                }
                                if (low.includes('carlos') || low.includes('titular') || low.includes('você') || low.includes('meu')) {
                                  return `👤 ${titularName}`;
                                }
                                if (!/iphone|android|celular|computador|dispositivo|dev_/i.test(raw) && raw.trim()) return raw;
                                return `👤 ${titularName}`;
                              })()}
                            </span>
                          )}
                          {/* Device badge */}
                          {(() => {
                            const rawDev = item.sourceDeviceName || item.deviceName || '';
                            const actorLow = (item.actorName || '').toLowerCase();
                            const devLow = rawDev.toLowerCase();
                            const isWife = actorLow.includes('paula') || actorLow.includes('esposa') || devLow.includes('paula') || devLow.includes('esposa');
                            const devLabel = isWife ? 'Paula (iPhone)' : 'Carlos (iPhone)';
                            return (
                              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1">
                                <Smartphone className="w-2.5 h-2.5 text-teal-500 shrink-0" />
                                <span>{devLabel}</span>
                              </span>
                            );
                          })()}
                          {!item.read && (
                            <span className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                          {item.message}
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0 font-mono">
                      {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}{' '}
                      {new Date(item.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Action for Bill */}
                  {matchedBill && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Favorecido: <strong className="text-slate-800 dark:text-slate-200">{matchedBill.favored || matchedBill.name}</strong>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectBill(matchedBill);
                          onClose();
                        }}
                        className="px-3 py-1 bg-slate-900 dark:bg-teal-500 text-white dark:text-[#0A1128] font-bold text-xs rounded-xl flex items-center gap-1 active-press transition-colors shadow-2xs"
                      >
                        <span>Visualizar / Pagar</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer with settings shortcut */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
            className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
          >
            <span>⚙️ Personalizar horários e regras de lembretes</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl active-press"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
