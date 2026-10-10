import React, { useState } from 'react';
import { 
  X, Lock, Mail, Users, CheckCircle2, AlertCircle, 
  Smartphone, ShieldCheck, Eye, EyeOff, Sparkles, LogIn, UserPlus,
  KeyRound, LogOut, RefreshCw, Check
} from 'lucide-react';
import { authService, AuthUser } from '../services/authService';
import { cloudkit } from '../services/cloudkitSync';

interface FamilyAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: AuthUser, deviceOwner: 'Carlos' | 'Paula' | string) => void;
  suggestedEmail?: string;
}

export const FamilyAuthModal: React.FC<FamilyAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  suggestedEmail = 'l.carlosramos92@gmail.com',
}) => {
  const [tab, setTab] = useState<'login' | 'register' | 'change_password'>('login');
  const [email, setEmail] = useState<string>(suggestedEmail);
  const [password, setPassword] = useState<string>('1234');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [selectedOwner, setSelectedOwner] = useState<'Carlos' | 'Paula'>(() => {
    return authService.getActiveDeviceOwner() === 'Paula' ? 'Paula' : 'Carlos';
  });
  const [householdName, setHouseholdName] = useState<string>('Finanças da Minha Casa');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentSession = authService.getSession();
  const isAuthenticated = Boolean(currentSession?.token);

  const handleOwnerChange = (owner: 'Carlos' | 'Paula') => {
    setSelectedOwner(owner);
    authService.setActiveDeviceOwner(owner);
    cloudkit.setActiveUserName(owner);
    cloudkit.connectWebSocket();
    setSuccessMessage(`Este celular agora está identificado como: ${owner} (${owner === 'Paula' ? 'Esposa' : 'Titular'})`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Por favor, informe um e-mail válido.');
      return;
    }

    if (tab === 'change_password') {
      if (newPassword.trim().length < 4) {
        setErrorMessage('A nova senha deve ter no mínimo 4 caracteres.');
        return;
      }
      setIsLoading(true);
      try {
        const res = await authService.changePassword(cleanEmail, newPassword.trim(), password.trim());
        if (!res.success) {
          setErrorMessage(res.error || 'Não foi possível alterar a senha.');
          setIsLoading(false);
          return;
        }
        setSuccessMessage('✅ Senha alterada com sucesso! Use a nova senha em ambos os aparelhos.');
        setPassword(newPassword.trim());
        setNewPassword('');
        setTimeout(() => {
          setTab('login');
        }, 1500);
      } catch (err: any) {
        setErrorMessage(err?.message || 'Erro ao conectar ao servidor.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (password.trim().length < 4) {
      setErrorMessage('A senha deve ter no mínimo 4 caracteres.');
      return;
    }

    if (tab === 'register' && password !== confirmPassword) {
      setErrorMessage('A confirmação de senha não confere com a senha digitada.');
      return;
    }

    setIsLoading(true);

    try {
      if (tab === 'register') {
        const res = await authService.register({
          email: cleanEmail,
          password: password.trim(),
          householdName: householdName.trim() || 'Finanças da Minha Casa',
          titularName: 'Carlos',
          spouseName: 'Paula',
          existingHouseholdId: cloudkit.getHouseholdId(),
        });

        if (!res.success || !res.session) {
          setErrorMessage(res.error || 'Não foi possível criar a conta. Tente novamente.');
          setIsLoading(false);
          return;
        }

        authService.setActiveDeviceOwner(selectedOwner);
        cloudkit.setHouseholdId(res.session.user.householdId);
        cloudkit.setActiveUserName(selectedOwner);
        cloudkit.connectWebSocket();
        cloudkit.syncWithServer();

        setSuccessMessage('🎉 Conta da família criada com sucesso!');
        setTimeout(() => {
          onAuthSuccess(res.session!.user, selectedOwner);
          onClose();
        }, 1200);
      } else {
        // Tab Login
        const res = await authService.login(cleanEmail, password.trim());

        if (!res.success || !res.session) {
          setErrorMessage(res.error || 'E-mail ou senha incorretos.');
          setIsLoading(false);
          return;
        }

        authService.setActiveDeviceOwner(selectedOwner);
        cloudkit.setHouseholdId(res.session.user.householdId);
        cloudkit.setActiveUserName(selectedOwner);
        cloudkit.connectWebSocket();
        cloudkit.syncWithServer();

        setSuccessMessage(`✅ Conectado com sucesso! Celular de ${selectedOwner} sincronizado.`);
        setTimeout(() => {
          onAuthSuccess(res.session!.user, selectedOwner);
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro de comunicação com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setSuccessMessage('Você saiu da conta. Para sincronizar novamente, basta fazer login.');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 2500);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs modal-safe-overlay p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#0E172F] w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[calc(100dvh-1.5rem)] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0A1128] via-[#101F42] to-[#0A1128] text-white p-5 relative overflow-hidden flex-shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-[#00E5B5] shadow-xs flex-shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                  <span>Conta da Casa do Casal</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-[#00E5B5]">
                    Sincronia 100%
                  </span>
                </h2>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  Mesmo login em ambos celulares para nunca mais perder dívidas
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer flex-shrink-0"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Selector when NOT Authenticated */}
          {!isAuthenticated && (
            <div className="grid grid-cols-3 p-1 bg-white/10 dark:bg-black/30 rounded-2xl mt-4 gap-1">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setErrorMessage(null);
                }}
                className={`py-2 px-2 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  tab === 'login'
                    ? 'bg-white dark:bg-[#1E293B] text-[#0A1128] dark:text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('register');
                  setErrorMessage(null);
                }}
                className={`py-2 px-2 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  tab === 'register'
                    ? 'bg-white dark:bg-[#1E293B] text-[#0A1128] dark:text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Criar Conta</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('change_password');
                  setErrorMessage(null);
                }}
                className={`py-2 px-2 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  tab === 'change_password'
                    ? 'bg-white dark:bg-[#1E293B] text-[#0A1128] dark:text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Nova Senha</span>
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Information Banner */}
          <div className="p-3.5 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 rounded-2xl text-xs text-teal-900 dark:text-teal-200 leading-relaxed flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Como funciona para você e sua esposa:</strong>
              <p className="text-[11.5px] mt-0.5 text-teal-800 dark:text-teal-300">
                Vocês usam o <strong>mesmo e-mail e senha</strong> nos dois celulares. O app guarda que este aparelho é seu e o outro é dela. Quando um de vocês marcar como pago, atualiza na mesma hora no outro celular sem perigo de perda de dados!
              </p>
            </div>
          </div>

          {/* Feedback messages */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-2xl text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span className="font-bold">{successMessage}</span>
            </div>
          )}

          {/* ALREADY AUTHENTICATED CARD */}
          {isAuthenticated ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300/80 dark:border-emerald-800/60 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-black text-emerald-900 dark:text-emerald-200">
                      Conta Conectada & Sincronizada
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 rounded-full font-bold">
                    100% Online
                  </span>
                </div>

                <div className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">E-mail da Família:</span>
                    <strong className="font-mono">{currentSession?.user?.email}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Casa / Lar:</span>
                    <strong>{currentSession?.user?.householdName || 'Minha Casa'}</strong>
                  </div>
                </div>
              </div>

              {/* Selector for device owner */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Quem está usando este celular agora?
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleOwnerChange('Carlos')}
                    className={`p-3 rounded-2xl border-2 flex items-center gap-2.5 transition-all cursor-pointer ${
                      selectedOwner === 'Carlos'
                        ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${
                      selectedOwner === 'Carlos' ? 'bg-teal-500 text-white' : 'bg-slate-200 dark:bg-slate-800'
                    }`}>
                      👤
                    </div>
                    <div className="text-left min-w-0">
                      <div className="text-xs font-black">Carlos</div>
                      <div className="text-[10px] text-slate-500">Titular da Casa</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOwnerChange('Paula')}
                    className={`p-3 rounded-2xl border-2 flex items-center gap-2.5 transition-all cursor-pointer ${
                      selectedOwner === 'Paula'
                        ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${
                      selectedOwner === 'Paula' ? 'bg-rose-500 text-white' : 'bg-slate-200 dark:bg-slate-800'
                    }`}>
                      👩
                    </div>
                    <div className="text-left min-w-0">
                      <div className="text-xs font-black">Paula</div>
                      <div className="text-[10px] text-slate-500">Esposa</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Connected Celulares Summary */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-teal-500" />
                  <span>Aparelhos com este mesmo login:</span>
                </span>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] p-2 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700">
                    <span className="font-bold">📱 Carlos (iPhone)</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Sincronizado
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] p-2 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700">
                    <span className="font-bold">📱 Paula (iPhone)</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Sincronizado
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions: Change Password & Logout */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setTab('change_password');
                    setErrorMessage(null);
                  }}
                  className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Mudar Senha</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoading}
                  className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair da Conta</span>
                </button>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 bg-[#00C49F] hover:bg-[#00B290] text-[#0A1128] font-black text-xs rounded-2xl active-press shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Continuar Usando o App</span>
                </button>
              </div>
            </div>
          ) : (
            /* FORM FOR LOGIN / REGISTER / CHANGE PASSWORD */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Quick default credentials helper */}
              {tab === 'login' && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-[11.5px] text-amber-900 dark:text-amber-200 leading-relaxed">
                  <strong>💡 Dica Rápida para Conectar Já:</strong>
                  <p className="mt-0.5">
                    Sua conta compartilhada já está configurada com o e-mail <strong>{suggestedEmail}</strong> e senha <strong>1234</strong>. Basta clicar no botão verde abaixo para sincronizar!
                  </p>
                </div>
              )}

              {/* Quem é o dono deste aparelho? */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Quem está usando este celular agora?
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedOwner('Carlos')}
                    className={`p-3 rounded-2xl border-2 flex items-center gap-2.5 transition-all cursor-pointer ${
                      selectedOwner === 'Carlos'
                        ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${
                      selectedOwner === 'Carlos' ? 'bg-teal-500 text-white' : 'bg-slate-200 dark:bg-slate-800'
                    }`}>
                      👤
                    </div>
                    <div className="text-left min-w-0">
                      <div className="text-xs font-black">Carlos</div>
                      <div className="text-[10px] text-slate-500">Titular</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedOwner('Paula')}
                    className={`p-3 rounded-2xl border-2 flex items-center gap-2.5 transition-all cursor-pointer ${
                      selectedOwner === 'Paula'
                        ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${
                      selectedOwner === 'Paula' ? 'bg-rose-500 text-white' : 'bg-slate-200 dark:bg-slate-800'
                    }`}>
                      👩
                    </div>
                    <div className="text-left min-w-0">
                      <div className="text-xs font-black">Paula</div>
                      <div className="text-[10px] text-slate-500">Esposa</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  E-mail da Conta da Casa
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ex: l.carlosramos92@gmail.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {tab === 'change_password' ? 'Senha Atual (ou 1234)' : 'Senha da Casa (compartilhada)'}
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite a senha (mínimo 4 dígitos)"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    aria-label="Ver senha"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password (only on change_password) */}
              {tab === 'change_password' && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nova Senha Desejada
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Digite a nova senha desejada"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                    />
                  </div>
                </div>
              )}

              {/* Confirm Password (only on Register tab) */}
              {tab === 'register' && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Confirme a Senha
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a mesma senha"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full p-3.5 bg-[#00C49F] hover:bg-[#00B290] disabled:opacity-60 text-[#0A1128] font-black text-xs sm:text-sm rounded-2xl shadow-lg active-press transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin text-[#0A1128]" />
                      <span>Conectando e Sincronizando...</span>
                    </>
                  ) : tab === 'login' ? (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Entrar e Sincronizar Aparelho</span>
                    </>
                  ) : tab === 'change_password' ? (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Salvar Nova Senha</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Criar Conta e Conectar Família</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Dica para o celular da esposa */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-teal-500" />
              <span>Como logar no celular da Paula:</span>
            </div>
            <p className="leading-relaxed">
              Abra este mesmo link no celular da Paula, clique em <strong>Entrar</strong>, digite este mesmo e-mail (<strong>l.carlosramos92@gmail.com</strong>) e senha, e selecione <strong>Paula</strong>. Pronto! O app manterá os dois celulares em perfeita harmonia.
            </p>
          </div>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
