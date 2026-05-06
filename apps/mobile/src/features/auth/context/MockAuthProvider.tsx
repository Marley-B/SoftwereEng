import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { AuthUser } from "../types";

interface MockAuthContextValue {
  user: AuthUser | null;
  isBusy: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  signOut: () => void;
}

const MockAuthContext = createContext<MockAuthContextValue | null>(null);

const MOCK_LATENCY_MS = 550;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const signIn = useCallback(async (email: string, _password: string) => {
    setIsBusy(true);
    await delay(MOCK_LATENCY_MS);
    const trimmed = email.trim();
    const localPart = trimmed.split("@")[0] ?? "there";
    const displayName =
      localPart.length > 0
        ? localPart.charAt(0).toUpperCase() + localPart.slice(1)
        : "there";
    setUser({ email: trimmed, displayName });
    setIsBusy(false);
  }, []);

  const signUp = useCallback(
    async (email: string, _password: string, displayName: string) => {
      setIsBusy(true);
      await delay(MOCK_LATENCY_MS);
      setUser({
        email: email.trim(),
        displayName: displayName.trim(),
      });
      setIsBusy(false);
    },
    [],
  );

  const signOut = useCallback(() => {
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isBusy,
      signIn,
      signUp,
      signOut,
    }),
    [user, isBusy, signIn, signUp, signOut],
  );

  return (
    <MockAuthContext.Provider value={value}>{children}</MockAuthContext.Provider>
  );
}

export function useMockAuth(): MockAuthContextValue {
  const ctx = useContext(MockAuthContext);
  if (!ctx) {
    throw new Error("useMockAuth must be used within MockAuthProvider");
  }
  return ctx;
}
