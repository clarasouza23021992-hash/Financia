import React, { useState, useEffect } from 'react';
import { 
  X, Users, Bell, Shield, Check, Edit2, Plus, 
  Trash2, Moon, Sun, User, Smartphone, Share, PlusSquare, 
  Copy, CheckCircle2, Sparkles, ArrowDown, ChevronRight, Settings,
  Download
} from 'lucide-react';
import { UserProfile, NotificationSetting, CloudDevice } from '../types/finance';

export type SettingsTab = 'install' | 'profiles' | 'notifications' | 'security';

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
  initialTab?: SettingsTab;
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
  initialTab = 'install',
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Detect if app is already running in standalone PWA / Home Screen mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
    }
  }, [isOpen]);

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

  const handleCopyAppUrl = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.origin);
      setCopiedLink(true);
      showFeedback('Link do aplicativo copiado! Cole no Safari do iPhone.');
      setTimeout(() => setCopiedLink(false), 3000);
    }
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
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                Menu de Configurações
              </h2>
              <p className="text-[11px] text-slate-400">
                Instalação rápida no iPhone, moradores, avisos e tema
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
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-3 pt-2 gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('install')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'install'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Instalação Rápida</span>
            <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold rounded-full">
              iOS
            </span>
          </button>

          <button
            onClick={() => setActiveTab('profiles')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'profiles'
                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Moradores ({profiles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Lembretes</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'security'
                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>2FA &amp; Tema</span>
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

          {/* TAB 1: INSTALAÇÃO RÁPIDA (SAFARI iOS -> ADICIONAR À TELA DE INÍCIO) */}
          {activeTab === 'install' && (
            <div className="space-y-4">
              {/* Standalone status banner */}
              {isStandalone ? (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 space-y-1.5">
                  <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wide">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span>Aplicativo Instalado na Tela de Início!</span>
                  </div>
                  <p className="text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    Você já está utilizando o aplicativo fixado na sua tela inicial em <b>modo tela cheia</b>, sem barras do navegador.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0A1128] via-indigo-950 to-purple-950 text-white border border-indigo-500/30 shadow-md space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-emerald-300">
                        Instalação Rápida no iPhone
                      </h3>
                    </div>
                    <span className="text-[9.5px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-black">
                      SAFARI iOS
                    </span>
                  </div>
                  <p className="text-[11.5px] text-slate-200 leading-relaxed font-medium">
                    Fixe o aplicativo diretamente na sua <b>Tela de Início</b> para abrir em <b>tela cheia</b> sem barras do navegador, exatamente como um app baixado da App Store!
                  </p>
                </div>
              )}

              {/* Step by step guide */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Passo a Passo no Safari do iOS:</span>
                </h4>

                {/* Step 1 */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black text-xs flex-shrink-0">
                    1
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                      Abra esta página no Safari
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      Certifique-se de estar usando o navegador <b>Safari</b> oficial da Apple no iPhone (outros navegadores não têm permissão do iOS para fixar o atalho).
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyAppUrl}
                      className="mt-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-[10.5px] border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 active-press transition-colors shadow-2xs"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                      <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link para abrir no Safari'}</span>
                    </button>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xs flex-shrink-0">
                    2
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                      <span>Toque no botão 'Compartilhar'</span>
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                        <Share className="w-3 h-3 stroke-[2.5]" />
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      Na barra inferior do Safari (no rodapé da tela do seu iPhone), toque no ícone de <b>um quadrado com uma seta para cima [ ↑ ]</b>.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xs flex-shrink-0">
                    3
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                      <span>Escolha 'Adicionar à Tela de Início'</span>
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <PlusSquare className="w-3 h-3 stroke-[2.5]" />
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      Role a folha de opções para baixo e toque na opção <b>"Adicionar à Tela de Início"</b>.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-xs flex-shrink-0">
                    4
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                      Toque em 'Adicionar' no canto superior direito
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      Confirme o nome <b>"Finanças"</b> e clique em <b>Adicionar</b>. O ícone oficial do aplicativo aparecerá na sua tela inicial!
                    </p>
                  </div>
                </div>
              </div>

              {/* Visual Safari Mockup */}
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 text-center">
                  Onde encontrar o botão no Safari do iPhone:
                </div>
                
                <div className="bg-white dark:bg-slate-900 rounded-xl p-3 shadow-xs border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-around py-1.5 px-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 text-xs font-mono">&lt;</span>
                    <span className="text-slate-400 text-xs font-mono">&gt;</span>
                    <div className="relative">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md animate-bounce">
                        <Share className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <span className="absolute -bottom-4.5 left-1/2 -translate-x-1/2 text-[9px] font-black text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        1º Toque aqui
                      </span>
                    </div>
                    <span className="text-slate-400 text-xs">📖</span>
                    <span className="text-slate-400 text-xs">⧉</span>
                  </div>

                  <div className="pt-2 text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-lg text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300">
                      <ArrowDown className="w-3.5 h-3.5" />
                      <span>2º Role o menu e toque em "Adicionar à Tela de Início"</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advantages List */}
              <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 space-y-1.5 text-xs">
                <div className="font-extrabold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Por que criar o atalho fixo na Tela de Início?</span>
                </div>
                <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                  <li>✨ <b>Experiência de App Nativo:</b> Abre em tela cheia sem a barra de navegação do Safari ocupando espaço.</li>
                  <li>⚡ <b>1 Toque para Abrir:</b> Não precisa digitar link nem abrir abas do navegador.</li>
                  <li>🔄 <b>Sincronização Automática:</b> Salva os dados na mesma casa e mantém a automação instantânea pronta.</li>
                </ul>
              </div>

              {/* GitHub & Source Code ZIP Download */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-purple-600" />
                    <span>Código Atualizado (.ZIP)</span>
                  </div>
                  <a
                    href="/api/source/download"
                    download="Financia-Codigo-Atualizado.zip"
                    className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] rounded-xl flex items-center gap-1 shadow-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar ZIP</span>
                  </a>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Baixe todos os arquivos do projeto com 1 toque para enviar ao GitHub ou salvar no computador.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: MORADORES */}
          {activeTab === 'profiles' && (
            <div className="space-y-3">
              {/* Quick shortcut to Install */}
              <div 
                onClick={() => setActiveTab('install')}
                className="p-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center justify-between cursor-pointer transition-all active-press"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Smartphone className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Instalação Rápida no iPhone
                    </span>
                    <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block">
                      Adicione à Tela de Início via Safari
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  Ver <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
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
                        placeholder="Ex: Carlos, Paula, Filho..."
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                          Papel / Relação
                        </label>
                        <input
                          type="text"
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value)}
                          placeholder="Ex: Marido, Esposa"
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                          Divisão Despesas (%)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={newSplit}
                          onChange={(e) => setNewSplit(Number(e.target.value))}
                          placeholder="50"
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveNew}
                      className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold active-press transition-colors"
                    >
                      Salvar Morador
                    </button>
                  </div>
                </div>
              )}

              {/* Profiles List */}
              {profiles.map((p) => {
                const isEditing = editingId === p.id;

                if (isEditing) {
                  return (
                    <div 
                      key={p.id}
                      className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border-2 border-purple-400 dark:border-purple-600 space-y-2.5 animate-fade-in"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
                          Editando Dados de {p.name}
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
                            className="w-full px-3 py-1.5 rounded-xl border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-bold"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                              Papel / Relação
                            </label>
                            <input
                              type="text"
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                              Divisão de Despesas (%)
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={editSplit}
                              onChange={(e) => setEditSplit(Number(e.target.value))}
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(p.id)}
                            className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold active-press transition-colors flex items-center justify-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Salvar Alterações</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-lg flex-shrink-0">
                        {p.avatar || '👤'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {p.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold flex-shrink-0">
                            {p.role || 'Morador'}
                          </span>
                        </div>
                        {p.email && (
                          <div className="text-[10.5px] text-purple-600 dark:text-purple-400 font-semibold truncate">
                            {p.email}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Responsável por {p.splitPercentage ?? p.splitShare ?? 50}% dos custos
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(p)}
                        className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 active-press transition-colors shadow-2xs"
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

          {/* TAB 3: NOTIFICAÇÕES */}
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

          {/* TAB 4: SEGURANÇA & TEMA */}
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
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 text-slate-800 dark:text-white active-press shadow-2xs"
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
