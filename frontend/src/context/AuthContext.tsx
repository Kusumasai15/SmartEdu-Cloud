"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UserProfile, AuthTokens, RoleName } from "@/types";
import { fetchApi, setApiAccessToken, getApiAccessToken } from "@/lib/api-client";

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginAsRole: (role: RoleName) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const getRoleDashboardRoute = (role: string): string => {
    switch (role) {
      case "STUDENT":
        return "/student";
      case "FACULTY":
        return "/faculty";
      case "HOD":
        return "/hod";
      case "VC":
        return "/vc";
      case "ADMINISTRATOR":
      case "ADMIN":
        return "/admin";
      case "EXAMINATION":
      case "EXAM":
      case "COE":
        return "/examination";
      default:
        return "/";
    }
  };

  const loadUserProfile = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const response = await fetchApi<UserProfile>("/auth/me", { signal: controller.signal });
      clearTimeout(timeoutId);
      if (response.success && response.data) {
        setUser(response.data);
        return response.data;
      }
      return null;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const token = getApiAccessToken();
      let profile = token ? await loadUserProfile() : null;
      const refreshToken = typeof window !== "undefined" ? sessionStorage.getItem("smartedu_refresh_token") : null;
      if (!profile && refreshToken) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          const refreshed = await fetchApi<AuthTokens>("/auth/refresh", {
            method: "POST",
            body: JSON.stringify({ refresh_token: refreshToken }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (refreshed.data) {
            setApiAccessToken(refreshed.data.access_token);
            sessionStorage.setItem("smartedu_refresh_token", refreshed.data.refresh_token);
            profile = await loadUserProfile();
          }
        } catch {
          // A revoked or expired refresh token requires a new login.
        }
      }
      if (!profile) {
        setApiAccessToken(null);
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("smartedu_refresh_token");
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, [loadUserProfile]);

  const loginAsRole = async (roleName: RoleName) => {
    const message = `Direct ${roleName.toLowerCase()} impersonation is disabled. Sign in with an authorized account.`;
    setError(message);
    throw new Error(message);
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    const cleanEmail = email.trim().toLowerCase();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetchApi<AuthTokens>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: cleanEmail, password }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.success && response.data) {
        setApiAccessToken(response.data.access_token);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("smartedu_refresh_token", response.data.refresh_token);
        }

        const profile = await loadUserProfile();
        if (profile) {
          setIsLoading(false);
          router.push(getRoleDashboardRoute(profile.role.name));
          return;
        }
      }
      throw new Error("Authentication failed. Verify your credentials and try again.");
    } catch (err: any) {
      setUser(null);
      setApiAccessToken(null);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("smartedu_refresh_token");
      }
      setIsLoading(false);
      const message = err?.message || "Unable to sign in. Verify your credentials and service connection.";
      setError(message);
      throw new Error(message);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    const refreshToken = typeof window !== "undefined" ? sessionStorage.getItem("smartedu_refresh_token") : null;
    try {
      if (refreshToken) {
        await fetchApi("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      }
    } catch {
      // Proceed with local logout
    } finally {
      setUser(null);
      setApiAccessToken(null);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("smartedu_refresh_token");
      }
      setIsLoading(false);
      router.push("/login");
    }
  };

  const refreshProfile = async () => {
    await loadUserProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        loginAsRole,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
