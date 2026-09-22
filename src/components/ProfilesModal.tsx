import React, { useState } from 'react';
import { 
  X, Users, Bell, Shield, Check, Edit2, Plus, 
  Trash2, Moon, Sun, User, UserCheck, Smartphone
} from 'lucide-react';
import { UserProfile, NotificationSetting, CloudDevice } from '../types/finance';

interface ProfilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: UserProfile[];
  onUpdateProfiles: (profiles: UserProfile[]) => void;
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
  profiles,
  onUpdateProfiles,
  notificationSettings,
  onUpdateNotifications,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [activeTab, setActiveTab] = useState<'profiles' | 'notifications' | 'security'>('profiles');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  // Editing state for an existing profile
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSplit, setEditSplit] = useState(50);
  const [editAvatar, setEditAvatar] = useState('👤');

  // Adding new profile state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newSplit, setNewSplit] = useState(0);

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleStartEdit = (p: UserProfile) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditRole(p.role);
    setEditPhone(p.phone || '');
    setEditSplit(p.splitPercentage || 50);
    setEditAvatar(p.avatar || '👤');
    setIsAddingNew(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = (profileId: string) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      showFeedback('Por favor, informe um nome de usuário válido.');
      return;
    }

    const updated = profiles.map(p => {
      if (p.id === profileId) {
        return {
          ...p,
          name: trimmed,
          role: editRole.trim() || 'Morador(a)',
          phone: editPhone.trim(),
          splitPercentage: Math.max(0, Math.min(100, Number(editSplit) || 0)),
          splitShare: Math.max(0, Math.min(100, Number(editSplit) || 0)),
          avatar: editAvatar || p.avatar || '👤',
        };
      }
      return p;
    });

    onUpdateProfiles(updated);
    setEditingId(null);
    showFeedback(`Nome de usuário "${trimmed}" salvo com sucesso!`);
  };

  const handleSaveNew = () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      showFeedback('Por favor, informe o nome do novo usuário/morador.');
      return;
    }

    const newProfile: UserProfile = {
      id: `p-${Date.now()}`,
      name: trimmed,
      role: newRole.trim() || 'Morador(a)',
      phone: newPhone.trim(),
      splitPercentage: Math.max(0, Math.min(100, Number(newSplit) || 0)),
      splitShare: Math.max(0, Math.min(100, Number(newSplit) || 0)),
      avatar: '👤',
      color: '#00C49F',
    };

    const updated = [...profiles, newProfile];
    onUpdateProfiles(updated);
    setIsAddingNew(false);
    setNewName('');
    setNewRole('');
    setNewPhone('');
    setNewSplit(0);
    showFeedback(`Morador "${trimmed}" adicionado com sucesso!`);
  };

  const handleDeleteProfile = (profileId: string, profileName: string) => {
    if (profiles.length <= 1) {
      showFeedback('É necessário manter ao menos um morador/usuário cadastrado.');
      return;
    }
    if (window.confirm(`Deseja remover o morador "${profileName}"?`)) {
      const updated = profiles.filter(p => p.id !== profileId);
      onUpdateProfiles(updated);
      showFeedback(`Morador "${profileName}" removido.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white dark:bg-[#0E172F] w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#0A1128] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-[#A78BFA]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                Moradores &amp; Usuários da Casa
              </h2>
              <p className="text-[11px] text-slate-400">
                Altere seu nome de usuário, porcentagem e dados
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
            onClick={() => setActiveTab('profiles')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'profiles'
                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500'
            }`}
          >
            Moradores ({profiles.length})
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'notifications'
                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500'
            }`}
          >
            Lembretes &amp; Avisos
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'security'
                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
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

          {activeTab === 'profiles' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Clique no ícone de editar para alterar o nome de usuário ou morador.
                </p>
                {!isAddingNew && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNew(true);
                      setEditingId(null);
                    }}
                    className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-xl border border-purple-200 dark:border-purple-800 flex items-center gap-1 active-press"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                )}
              </div>

              {/* Form to Add New Profile */}
              {isAddingNew && (
                <div className="p-3.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-300 dark:border-purple-800 space-y-2.5 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>Novo Usuário / Morador</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingNew(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                        Nome de Usuário *
                      </label>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Ex: Carlos, Paula, etc."
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                        Papel / Cargo
                      </label>
                      <input
                        type="text"
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        placeholder="Ex: Morador(a), Administrador"
                        className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingNew(false)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNew}
                      className="px-4 py-1.5 bg-[#00C49F] hover:bg-[#00b290] text-[#0A1128] font-bold text-xs rounded-xl flex items-center gap-1 active-press"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Salvar Usuário</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Profiles List */}
              {profiles.map((p) => {
                const isEditingThis = editingId === p.id;

                if (isEditingThis) {
                  return (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-300 dark:border-teal-700 space-y-2.5 animate-fade-in"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Alterar Nome de Usuário</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                        >
                          Cancelar
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                            Nome de Usuário *
                          </label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Digite o nome de usuário..."
                            className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                            Papel / Descrição
                          </label>
                          <input
                            type="text"
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            placeholder="Ex: Titular, Cônjuge, Morador(a)"
                            className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                            Telefone / WhatsApp (opcional)
                          </label>
                          <input
                            type="text"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            placeholder="(11) 99999-9999"
                            className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(p.id)}
                          className="px-4 py-1.5 bg-[#00C49F] hover:bg-[#00b290] text-[#0A1128] font-bold text-xs rounded-xl flex items-center gap-1 active-press shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Salvar Nome</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl flex-shrink-0">{p.avatar || '👤'}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="truncate">{p.name}</span>
                          <span className="text-[10px] bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                            {p.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {p.phone ? p.phone : 'Morador(a) do lar'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(p)}
                        className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 active-press transition-colors"
                        title="Editar nome deste usuário/morador"
                      >
                        <Edit2 className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                        <span>Editar</span>
                      </button>

                      {profiles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteProfile(p.id, p.name)}
                          className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                          title="Remover morador"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                  Alertas Inteligentes de Vencimento
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Notificações automáticas para não esquecer boletos ou pagar multas por atraso.
                </p>
              </div>

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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
