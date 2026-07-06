import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId: string;
  companySlug: string;
  companyName?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  setAuth: (user: User, accessToken: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  loading: false,
  setAuth: (user, accessToken) => {
    set({ user, accessToken });
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('user', JSON.stringify(user));
    }
  },
  clearAuth: () => {
    set({ user: null, accessToken: null });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
    }
  },
  setLoading: (loading) => set({ loading }),
}));

