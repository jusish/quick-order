import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StateCreator } from "zustand";
import { authService, LoginDto } from "@/services/auth.service";
import {
  clearStoredAuthTokens,
  setStoredAuthTokens,
} from "@/lib/auth-tokens";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: "ADMIN" | "STOCK_OWNER" | "STOCK_MANAGER";
  status: string;
}

interface AuthState {
  user: User | null;
  selectedStockId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  login: (dto: LoginDto) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<User | null>;
  setSelectedStockId: (stockId: string | null) => void;
}

const authStoreCreator: StateCreator<AuthState> = (set) => ({
      user: null,
      selectedStockId: null,
      isAuthenticated: false,
      isLoading: false,
      accessToken: null,
      refreshToken: null,

      login: async (dto) => {
        set({ isLoading: true });
        try {
          const res = await authService.login(dto);
          if (res.success && res.data?.user) {
            // Set session flag cookie (browser-accessible check for middleware)
            document.cookie = "AUTH_SESSION_FLAG=true; path=/; max-age=86400";
            const accessToken = res.data.accessToken ?? null;
            const refreshToken = res.data.refreshToken ?? null;
            if (accessToken && refreshToken) {
              setStoredAuthTokens({ accessToken, refreshToken });
            }
            set({
              user: res.data.user,
              isAuthenticated: true,
              accessToken,
              refreshToken,
              isLoading: false,
            });
            return { success: true };
          }
          set({ isLoading: false });
          return { success: false, message: res.message || "Login failed" };
        } catch (err: any) {
          set({ isLoading: false });
          return {
            success: false,
            message: err.response?.data?.message || "Invalid credentials",
          };
        }
      },

      logout: async () => {
        try {
          await authService.logout();
        } catch (e) {
          // ignore
        }
        // Clear flag cookie
        document.cookie =
          "AUTH_SESSION_FLAG=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
        clearStoredAuthTokens();
        set({
          user: null,
          selectedStockId: null,
          isAuthenticated: false,
          accessToken: null,
          refreshToken: null,
        });
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      },

      checkAuth: async () => {
        try {
          const res = await authService.getProfile();
          if (res.success && res.data) {
            set({
              user: res.data,
              isAuthenticated: true,
            });
            return res.data;
          }
          return null;
        } catch {
          set({
            user: null,
            isAuthenticated: false,
          });
          return null;
        }
      },

      setSelectedStockId: (stockId) => set({ selectedStockId: stockId }),
    });

export const useAuthStore = create<AuthState>()(
  persist(authStoreCreator as any, {
      name: "quick-order-auth-storage",
      partialize: (state) => ({
        user: state.user,
        selectedStockId: state.selectedStockId,
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }) as StateCreator<AuthState>
);
