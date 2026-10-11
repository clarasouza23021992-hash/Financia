import React, { useState, useEffect } from 'react';
import { 
  Lock, Mail, Users, CheckCircle2, AlertCircle, 
  Smartphone, ShieldCheck, Eye, EyeOff, Sparkles, LogIn, UserPlus,
  KeyRound, Heart, ArrowRight, Wifi, RefreshCw, Check
} from 'lucide-react';
import { authService, AuthSessionData, AuthUser } from '../services/authService';
import { cloudkit } from '../services/cloudkitSync';

interface FamilyLoginGateProps {
  onLoginSuccess: (session: AuthSessionData, owner: 'Carlos' | 'Paula' | string) => void;
  onContinueAsGuest?: () => void;
}

export const FamilyLoginGate: React.FC<FamilyLoginGateProps> = ({
  onLoginSuccess,
  onContinueAsGuest,
}) => {
  // Detect if opened via wife invite link (?role=paula or ?esposa=1)
  const isWifeInvite = typeof window !== 'undefined' && (() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const r = (p.get('role') || p.get('user') || p.get('conta') || '').toLowerCase();
      return r === 'paula' || r === 'esposa' || p.has('paula') || p.has('esposa');
    } catch {
      return false;
    }
  })();

  const [selectedOwner, setSelectedOwner] = useState<'Carlos' | 'Paula'>(isWifeInvite ? 'Paula' : 'Carlos');
  const [tab, setTab] = useState<'login' | 'register' | 'change_password'>('login');
  
  const [email, setEmail] = useState<string>('l.carlosramos92@gmail.com');
  const [password, setPassword] = useState<string>('1234');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [householdName, setHouseholdName] = useState<string>('Finanças da Minha Casa');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isWifeInvite) {
      setSelectedOwner('Paula');
    }
  }, [isWifeInvite]);

  const handleFillDefaultPassword = () => {
    setPassword('1234');
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
        setSuccessMessage('✅ Senha alterada com sucesso! Use a nova senha para entrar.');
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

        setSuccessMessage(`🎉 Conta da família criada! Celular de ${selectedOwner} conectado.`);
        setTimeout(() => {
          onLoginSuccess(res.session!, selectedOwner);
        }, 1000);
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

        setSuccessMessage(`✅ Conectado com sucesso! Celular de ${selectedOwner} sincronizado em tempo real.`);
        setTimeout(() => {
          onLoginSuccess(res.session!, selectedOwner);
        }, 1000);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro de comunicação com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-7 relative z-10 backdrop-blur-xl">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 mb-3 shadow-lg shadow-teal-500/20">
            <Users className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Finanças da Casa • Carlos & Paula
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Sincronização em tempo real entre os dois iPhones
          </p>
        </div>

        {/* Invite Greeting if Paula */}
        {isWifeInvite && (
          <div className="mb-5 p-3.5 bg-gradient-to-r from-teal-500/20 to-emerald-500/20 border border-teal-500/40 rounded-2xl flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-400/20 text-[#00E5B5] flex items-center justify-center shrink-0 mt-0.5">
              <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-teal-300">
                Olá, Paula! ❤️ Carlos convidou você.
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                Entre com a senha da casa para ativar o seu iPhone e sincronizar as contas da família em tempo real.
              </p>
            </div>
          </div>
        )}

        {/* Device Profile Selection (Step 1) */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-slate-300 mb-2">
            1. Quem está usando este iPhone agora?
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {/* Paula Card */}
            <button
              type="button"
              onClick={() => setSelectedOwner('Paula')}
              className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                selectedOwner === 'Paula'
                  ? 'border-rose-500 bg-rose-500/15 shadow-md shadow-rose-500/10'
                  : 'border-slate-800 bg-slate-800/40 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xl">👩🏻</span>
                {selectedOwner === 'Paula' && (
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </span>
                )}
              </div>
              <div>
                <span className={`block text-xs font-black ${selectedOwner === 'Paula' ? 'text-white' : 'text-slate-300'}`}>
                  Paula (Esposa)
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  iPhone da Paula
                </span>
              </div>
            </button>

            {/* Carlos Card */}
            <button
              type="button"
              onClick={() => setSelectedOwner('Carlos')}
              className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                selectedOwner === 'Carlos'
                  ? 'border-teal-500 bg-teal-500/15 shadow-md shadow-teal-500/10'
                  : 'border-slate-800 bg-slate-800/40 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xl">👨🏻</span>
                {selectedOwner === 'Carlos' && (
                  <span className="w-4 h-4 rounded-full bg-teal-500 text-slate-950 flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </span>
                )}
              </div>
              <div>
                <span className={`block text-xs font-black ${selectedOwner === 'Carlos' ? 'text-white' : 'text-slate-300'}`}>
                  Carlos (Titular)
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  iPhone do Carlos
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex rounded-xl bg-slate-800/60 p-1 mb-4 border border-slate-700/60">
          <button
            type="button"
            onClick={() => { setTab('login'); setErrorMessage(null); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              tab === 'login'
                ? 'bg-teal-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setErrorMessage(null); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              tab === 'register'
                ? 'bg-teal-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Criar Conta
          </button>
          <button
            type="button"
            onClick={() => { setTab('change_password'); setErrorMessage(null); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              tab === 'change_password'
                ? 'bg-teal-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Trocar Senha
          </button>
        </div>

        {/* Form (Step 2) */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {tab === 'register' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Nome da Casa
              </label>
              <input
                type="text"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="Ex: Finanças da Minha Casa"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-teal-500"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              E-mail da Conta da Casa
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="l.carlosramos92@gmail.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-teal-500"
              />
            </div>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => setEmail('l.carlosramos92@gmail.com')}
                className="text-[10px] text-teal-400 hover:underline cursor-pointer"
              >
                Usar: l.carlosramos92@gmail.com
              </button>
              <span className="text-[10px] text-slate-600">•</span>
              <button
                type="button"
                onClick={() => setEmail('clarasouza23021992@gmail.com')}
                className="text-[10px] text-teal-400 hover:underline cursor-pointer"
              >
                Usar: clara...
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold text-slate-300">
                {tab === 'change_password' ? 'Senha Atual da Casa' : 'Senha da Casa'}
              </label>
              {tab === 'login' && (
                <button
                  type="button"
                  onClick={handleFillDefaultPassword}
                  className="text-[10px] text-teal-400 hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
                >
                  <KeyRound className="w-2.5 h-2.5" /> Senha padrão: 1234
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 4 caracteres"
                className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-teal-500 tracking-wider"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {tab === 'register' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Confirmar Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-teal-500 tracking-wider"
                />
              </div>
            </div>
          )}

          {tab === 'change_password' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Nova Senha Desejada
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nova senha para os 2 aparelhos"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-teal-500 tracking-wider"
                />
              </div>
            </div>
          )}

          {/* Feedback messages */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Big Action Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-teal-500/20 active-press transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Conectando aparelho...</span>
              </>
            ) : tab === 'register' ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Criar Conta & Conectar {selectedOwner}</span>
              </>
            ) : tab === 'change_password' ? (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Salvar Nova Senha</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Conectar Como {selectedOwner} & Sincronizar</span>
              </>
            )}
          </button>
        </form>

        {/* Security & Zero Error Explanatory Note */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>Mesmo login nos 2 iPhones • Status online instantâneo</span>
          </p>

          {onContinueAsGuest && (
            <button
              type="button"
              onClick={onContinueAsGuest}
              className="mt-3 text-[11px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              Continuar sem login (Modo Visitante / Visualização)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
