import { create } from 'zustand';
import { fetchMe, loginRequest, registerRequest, type RegisterInput } from '../services/auth';
import { tokenStore } from '../services/http';
import { connectSocket, disconnectSocket } from '../services/socket';
import type { User } from '../types';

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: User | null;
  status: AuthStatus;
  /** Restore a session from a stored token on app start. */
  loadSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'idle',

  loadSession: async () => {
    if (!tokenStore.access) {
      set({ status: 'unauthenticated' });
      return;
    }
    set({ status: 'loading' });
    try {
      const user = await fetchMe();
      set({ user, status: 'authenticated' });
      connectSocket();
    } catch {
      tokenStore.clear();
      set({ user: null, status: 'unauthenticated' });
    }
  },

  login: async (email, password) => {
    const res = await loginRequest({ email, password });
    tokenStore.set(res.access_token, res.refresh_token);
    set({ user: res.user, status: 'authenticated' });
    connectSocket();
  },

  register: async (input) => {
    const res = await registerRequest(input);
    tokenStore.set(res.access_token, res.refresh_token);
    set({ user: res.user, status: 'authenticated' });
    connectSocket();
  },

  logout: () => {
    tokenStore.clear();
    disconnectSocket();
    set({ user: null, status: 'unauthenticated' });
  },
}));
