"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

export interface SavedPlaylist {
  id: string;
  name: string;
  image: string;
  owner: string;
  trackCount: number;
  url: string;
  source: "spotify" | "youtube";
  savedAt: number; // timestamp
}

const STORAGE_KEY = "music-mood-playlists";
const MAX_ITEMS = 20;

interface PlaylistContextValue {
  playlists: SavedPlaylist[];
  addPlaylist: (p: Omit<SavedPlaylist, "savedAt">) => void;
  removePlaylist: (id: string) => void;
  clearPlaylists: () => void;
}

const Ctx = createContext<PlaylistContextValue | null>(null);

function load(): SavedPlaylist[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function save(list: SavedPlaylist[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function PlaylistProvider({ children }: { children: ReactNode }) {
  const [playlists, setPlaylists] = useState<SavedPlaylist[]>(load);

  useEffect(() => {
    save(playlists);
  }, [playlists]);

  const addPlaylist = useCallback((p: Omit<SavedPlaylist, "savedAt">) => {
    setPlaylists((prev) => {
      // Remove duplicate if already exists
      const filtered = prev.filter((x) => x.id !== p.id);
      return [{ ...p, savedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
    });
  }, []);

  const removePlaylist = useCallback((id: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clearPlaylists = useCallback(() => {
    setPlaylists([]);
  }, []);

  return (
    <Ctx.Provider value={{ playlists, addPlaylist, removePlaylist, clearPlaylists }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePlaylists() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePlaylists must be used within PlaylistProvider");
  return ctx;
}
