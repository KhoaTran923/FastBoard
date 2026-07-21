import { create } from 'zustand';
import { fetchMe, loginRequest, registerRequest, type RegisterInput } from '../services/auth';
import { isNetworkError, tokenStore } from '../services/http';
import { connectSocket, disconnectSocket } from '../services/socket';
import type { User } from '../types';

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: User | null;
  status: AuthStatus;
  /** Restore a session from a stored token on app start. */
  loadSession: () => Promise<void>;
  /** Fill in the profile after an offline start (no status flips). */
  refreshUser: () => Promise<void>;
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
    } catch (err) {
      if (isNetworkError(err)) {
        // Offline: trust the stored token so the snapshot board can show;
        // the socket reconnects (and resyncs) once the network returns
        set({ user: null, status: 'authenticated' });
        connectSocket();
      } else {
        tokenStore.clear();
        set({ user: null, status: 'unauthenticated' });
      }
    }
  },

  refreshUser: async () => {
    try {
      const user = await fetchMe();
      set({ user });
    } catch {
      // Still offline or token expired; loadSession handles the next start
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
