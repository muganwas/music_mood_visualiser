"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  type UserCredentials,
  EMPTY_CREDENTIALS,
} from "./credentials";

const STORAGE_KEY = "music-mood-credentials";

interface CredentialsContextValue {
  credentials: UserCredentials;
  setCredentials: (c: UserCredentials) => void;
  updateField: <K extends keyof UserCredentials>(key: K, value: UserCredentials[K]) => void;
  clearCredentials: () => void;
  isComplete: boolean;
}

const Ctx = createContext<CredentialsContextValue | null>(null);

function load(): UserCredentials {
  if (typeof window === "undefined") return EMPTY_CREDENTIALS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...EMPTY_CREDENTIALS, ...JSON.parse(raw) };
  } catch { /* corrupted — fall through */ }
  return EMPTY_CREDENTIALS;
}

function save(c: UserCredentials) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

export function CredentialsProvider({ children }: { children: ReactNode }) {
  const [credentials, setCredentialsState] = useState<UserCredentials>(load);

  useEffect(() => {
    save(credentials);
  }, [credentials]);

  const setCredentials = useCallback((c: UserCredentials) => {
    setCredentialsState(c);
  }, []);

  const updateField = useCallback(
    <K extends keyof UserCredentials>(key: K, value: UserCredentials[K]) => {
      setCredentialsState((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const clearCredentials = useCallback(() => {
    setCredentialsState(EMPTY_CREDENTIALS);
  }, []);

  const isComplete = Boolean(
    credentials.spotifyClientId &&
    credentials.spotifyClientSecret &&
    credentials.spotifyRefreshToken &&
    credentials.deepseekApiKey,
  );

  return (
    <Ctx.Provider value={{ credentials, setCredentials, updateField, clearCredentials, isComplete }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCredentials() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCredentials must be used within CredentialsProvider");
  return ctx;
}
