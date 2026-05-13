import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { AuthUser } from "../types";
import { ApiError, apiRequest, setBearerToken } from "../../../lib/apiClient";
import {
  clearSession,
  loadStoredToken,
  loadStoredUserJson,
  persistSession,
} from "../../../lib/sessionStorage";

interface AuthResponse {
  token: string;
  user: { id: string; email: string; displayName: string };
}

interface AuthContextValue {
  user: AuthUser | null;
  isBusy: boolean;
  isReady: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapUser(dto: AuthResponse["user"]): AuthUser {
  return {
    id: dto.id,
    email: dto.email,
    displayName: dto.displayName,
  };
}

function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const body = e.body as { error?: string } | null;
    if (body && typeof body === "object" && typeof body.error === "string") {
      return body.error;
    }
    return e.message;
  }
  if (e instanceof Error) {
    return e.message;
  }
  return "Something went wrong";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [token, userJson] = await Promise.all([loadStoredToken(), loadStoredUserJson()]);
        if (token && userJson) {
          setBearerToken(token);
          setUser(JSON.parse(userJson) as AuthUser);
        }
      } catch {
        await clearSession();
        setBearerToken(null);
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsBusy(true);
    setAuthError(null);
    try {
      const data = await apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        json: { email: email.trim(), password },
        skipAuth: true,
      });
      setBearerToken(data.token);
      const u = mapUser(data.user);
      setUser(u);
      try {
        await persistSession(data.token, JSON.stringify(u));
      } catch {
        setAuthError(
          "Signed in, but saving the session on this device failed. Check storage permissions or try again.",
        );
      }
    } catch (e: unknown) {
      setAuthError(errorMessage(e));
    } finally {
      setIsBusy(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    setIsBusy(true);
    setAuthError(null);
    try {
      const data = await apiRequest<AuthResponse>("/auth/register", {
        method: "POST",
        json: {
          email: email.trim(),
          password,
          displayName: displayName.trim(),
        },
        skipAuth: true,
      });
      setBearerToken(data.token);
      const u = mapUser(data.user);
      setUser(u);
      try {
        await persistSession(data.token, JSON.stringify(u));
      } catch {
        setAuthError(
          "Account created, but saving the session on this device failed. Check storage permissions or try again.",
        );
      }
    } catch (e: unknown) {
      setAuthError(errorMessage(e));
    } finally {
      setIsBusy(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setBearerToken(null);
    setUser(null);
    await clearSession();
  }, []);

  const value = useMemo(
    () => ({
      user,
      isBusy,
      isReady,
      authError,
      clearAuthError,
      signIn,
      signUp,
      signOut,
    }),
    [user, isBusy, isReady, authError, clearAuthError, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
