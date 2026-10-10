export interface AuthUser {
  id: string;
  email: string;
  householdId: string;
  householdName: string;
  titularName: string;
  spouseName: string;
}

export interface AuthSessionData {
  token: string;
  user: AuthUser;
}

const STORAGE_KEY_AUTH = 'financas_auth_session';
const STORAGE_KEY_DEVICE_OWNER = 'financas_device_owner';

class AuthService {
  private currentSession: AuthSessionData | null = null;
  private listeners: Array<(session: AuthSessionData | null) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_AUTH);
        if (raw) {
          this.currentSession = JSON.parse(raw);
        }
      } catch {
        this.currentSession = null;
      }
    }
  }

  public getSession(): AuthSessionData | null {
    if (!this.currentSession && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_AUTH);
        if (raw) {
          this.currentSession = JSON.parse(raw);
        }
      } catch {
        this.currentSession = null;
      }
    }
    return this.currentSession;
  }

  public isAuthenticated(): boolean {
    return Boolean(this.getSession()?.token);
  }

  public getUser(): AuthUser | null {
    return this.getSession()?.user || null;
  }

  public getToken(): string | null {
    return this.getSession()?.token || null;
  }

  public getActiveDeviceOwner(): 'Carlos' | 'Paula' | string {
    if (typeof window === 'undefined') return 'Carlos';
    const stored = localStorage.getItem(STORAGE_KEY_DEVICE_OWNER);
    if (stored && (stored.toLowerCase().includes('paula') || stored.toLowerCase().includes('esposa'))) {
      return 'Paula';
    }
    return 'Carlos';
  }

  public setActiveDeviceOwner(owner: 'Carlos' | 'Paula' | string): void {
    if (typeof window === 'undefined') return;
    const clean = owner.toLowerCase().includes('paula') || owner.toLowerCase().includes('esposa') ? 'Paula' : 'Carlos';
    localStorage.setItem(STORAGE_KEY_DEVICE_OWNER, clean);
    localStorage.setItem('financas_active_user_name', clean);
    localStorage.setItem('financas_my_role', clean === 'Paula' ? 'Esposa' : 'Titular');
    localStorage.setItem('financas_my_device_custom_name', clean === 'Paula' ? 'Paula (iPhone)' : 'Carlos (iPhone)');
    this.notifyListeners();
  }

  public async register(payload: {
    email: string;
    password: string;
    householdName?: string;
    titularName?: string;
    spouseName?: string;
    existingHouseholdId?: string;
  }): Promise<{ success: boolean; error?: string; session?: AuthSessionData }> {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Falha ao criar conta da família.' };
      }

      const session: AuthSessionData = {
        token: data.token,
        user: data.user,
      };

      this.saveSession(session);
      return { success: true, session };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro de conexão com o servidor.' };
    }
  }

  public async login(email: string, password: string): Promise<{ success: boolean; error?: string; session?: AuthSessionData }> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Falha no login.' };
      }

      const session: AuthSessionData = {
        token: data.token,
        user: data.user,
      };

      this.saveSession(session);
      return { success: true, session };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro de conexão com o servidor.' };
    }
  }

  public async changePassword(
    email: string,
    newPassword: string,
    oldPassword?: string
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword, oldPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Falha ao alterar senha.' };
      }
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro de comunicação com o servidor.' };
    }
  }

  public async checkSession(): Promise<boolean> {
    const token = this.getToken();
    if (!token) return false;

    try {
      const res = await fetch('/api/auth/session', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        // Token is invalid/expired
        return false;
      }

      const data = await res.json();
      if (data.authenticated && data.user) {
        const session: AuthSessionData = {
          token,
          user: data.user,
        };
        this.saveSession(session);
        return true;
      }
      return false;
    } catch {
      // Offline: keep cached session
      return Boolean(this.currentSession);
    }
  }

  public async logout(): Promise<void> {
    const token = this.getToken();
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    }

    this.currentSession = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_AUTH);
    }
    this.notifyListeners();
  }

  private saveSession(session: AuthSessionData) {
    this.currentSession = session;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(session));
      if (session.user.householdId) {
        localStorage.setItem('financas_household_id', session.user.householdId);
      }
    }
    this.notifyListeners();
  }

  public subscribe(listener: (session: AuthSessionData | null) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(fn => {
      try {
        fn(this.currentSession);
      } catch (e) {
        console.error('Auth listener error:', e);
      }
    });
  }
}

export const authService = new AuthService();
