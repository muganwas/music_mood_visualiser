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
  type: "link" | "file";
  fingerprint?: string;
  songs?: { name: string; artist: string }[]; // stored for file replays
  savedAt: number;
}

const STORAGE_KEY = "music-mood-playlists";
const MAX_ITEMS = 20;

interface PlaylistContextValue {
  playlists: SavedPlaylist[];
  addPlaylist: (p: Omit<SavedPlaylist, "savedAt">) => void;
  addFilePlaylist: (fileName: string, songCount: number, fingerprint: string, songs: { name: string; artist: string }[]) => void;
  removePlaylist: (id: string) => void;
  clearPlaylists: () => void;
}

const Ctx = createContext<PlaylistContextValue | null>(null);

function load(): SavedPlaylist[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedPlaylist[];
    // Filter out stale file entries saved before the songs field was added
    return parsed.filter((p) => !(p.type === "file" && !p.songs?.length));
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
      const filtered = prev.filter((x) => x.id !== p.id);
      return [{ ...p, savedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
    });
  }, []);

  const addFilePlaylist = useCallback((fileName: string, songCount: number, fingerprint: string, songs: { name: string; artist: string }[]) => {
    setPlaylists((prev) => {
      const exists = prev.some((p) => p.fingerprint === fingerprint);
      if (exists) return prev;

      const id = `file-${Date.now()}`;
      const entry: SavedPlaylist = {
        id, name: fileName, image: "", owner: "Uploaded file",
        trackCount: songCount, url: "",
        source: "spotify", type: "file", fingerprint, songs,
        savedAt: Date.now(),
      };
      return [entry, ...prev].slice(0, MAX_ITEMS);
    });
  }, []);

  const removePlaylist = useCallback((id: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clearPlaylists = useCallback(() => {
    setPlaylists([]);
  }, []);

  return (
    <Ctx.Provider value={{ playlists, addPlaylist, addFilePlaylist, removePlaylist, clearPlaylists }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePlaylists() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePlaylists must be used within PlaylistProvider");
  return ctx;
}
