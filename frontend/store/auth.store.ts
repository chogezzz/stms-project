"use client";
import { AuthState } from "@/types/auth";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      expiresIn: null,
      login: (token, user, expiresIn) => set({ token, user, expiresIn }),
      logout: () => {
        set({ token: null, user: null, expiresIn: null });
        localStorage.removeItem("auth-storage"); // destroy persisted state
      },
    }),
    {
      name: "auth-storage", // for key in storage
      storage: createJSONStorage(() => localStorage),
    }
  )
);
