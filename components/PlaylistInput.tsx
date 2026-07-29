"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import type { UserCredentials } from "@/stores/credentials";

// ── Types ────────────────────────────────────────────────────

interface PlaylistPreview {
  id: string;
  name: string;
  image: string;
  owner: string;
  trackCount: number;
  hasItems: boolean;
}

type UrlState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "valid"; playlist: PlaylistPreview }
  | { status: "invalid"; reason: string }
  | { status: "error"; message: string };

interface Props {
  onAnalyze: (payload: { type: "link"; url: string; source: "spotify" | "youtube" }) => void;
  credentials: UserCredentials;
  onPlaylistFound: (info: { id: string; name: string; image: string; owner: string; trackCount: number; url: string; source: "spotify" | "youtube" }) => void;
}

// ── Helpers ──────────────────────────────────────────────────

/** Quick client-side check: does this look like a Spotify playlist link? */
function looksLikeSpotify(input: string): boolean {
  const lower = input.trim().toLowerCase();
  return lower.includes("spotify") && lower.includes("playlist");
}

/** Extract playlist ID client-side (mirrors server logic for instant feedback). */
function extractIdLocally(input: string): string | null {
  const trimmed = input.trim();
  const uri = trimmed.match(/spotify:playlist:([a-zA-Z0-9]{22})/);
  if (uri) return uri[1];
  const urlMatch = trimmed.match(/playlist\/([a-zA-Z0-9]{22})/);
  return urlMatch ? urlMatch[1] : null;
}

// ── Component ────────────────────────────────────────────────

import { MusicIcon, CloseIcon, WarningIcon, CheckIcon } from "./icons";

/** Quick client-side check: YouTube playlist? */
function looksLikeYoutube(input: string): boolean {
  const lower = input.trim().toLowerCase();
  return (lower.includes("youtube") || lower.includes("youtu.be")) && lower.includes("list=");
}

function isSpotify(input: string): boolean {
  return input.trim().toLowerCase().includes("spotify");
}

export default function PlaylistInput({ onAnalyze, credentials, onPlaylistFound }: Props) {
  const [url, setUrl] = useState("");
  const [urlState, setUrlState] = useState<UrlState>({ status: "idle" });
  const [source, setSource] = useState<"spotify" | "youtube" | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced preview fetch whenever the URL changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = url.trim();

    // Reset if empty
    if (!trimmed) {
      setUrlState({ status: "idle" });
      setSource(null);
      return;
    }

    // Determine source
    let detected: "spotify" | "youtube" | null = null;
    if (looksLikeYoutube(trimmed)) detected = "youtube";
    else if (isSpotify(trimmed)) detected = "spotify";

    if (!detected) {
      setUrlState({ status: "idle" });
      setSource(null);
      return;
    }
    setSource(detected);

    // Debounce: wait 600 ms after the user stops typing
    debounceRef.current = setTimeout(async () => {
      setUrlState({ status: "checking" });

      const previewUrl = detected === "youtube"
        ? `/api/youtube?playlist=${encodeURIComponent(trimmed)}&preview=true`
        : `/api/spotify?playlist=${encodeURIComponent(trimmed)}&preview=true`;

      const headers: Record<string, string> = {};
      if (detected === "spotify") {
        headers["x-spotify-client-id"] = credentials.spotifyClientId;
        headers["x-spotify-client-secret"] = credentials.spotifyClientSecret;
        headers["x-spotify-refresh-token"] = credentials.spotifyRefreshToken;
        headers["x-spotify-market"] = credentials.spotifyMarket;
      }
      if (detected === "youtube") {
        headers["x-youtube-api-key"] = credentials.youtubeApiKey;
      }

      try {
        const res = await fetch(previewUrl, { headers });
        const data = await res.json();

        if (!res.ok || data.error) {
          setUrlState({ status: "invalid", reason: data.error ?? "Playlist not found." });
          return;
        }

        setUrlState({
          status: "valid",
          playlist: {
            id: data.playlist.id,
            name: data.playlist.name,
            image: data.playlist.image,
            owner: data.playlist.owner,
            trackCount: data.playlist.trackCount,
            hasItems: data.playlist.hasItems,
          },
        });

        onPlaylistFound({
          id: data.playlist.id,
          name: data.playlist.name,
          image: data.playlist.image,
          owner: data.playlist.owner,
          trackCount: data.playlist.trackCount,
          url: trimmed,
          source: detected,
        });
      } catch {
        setUrlState({ status: "error", message: "Network error — check your connection." });
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [url]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (urlState.status !== "valid" || !source) return;
    onAnalyze({ type: "link", url: url.trim(), source });
  };

  const handleClear = () => {
    setUrl("");
    setUrlState({ status: "idle" });
  };

  // ── Render ─────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Label + input */}
      <div>
        <label htmlFor="playlist-url" className="mb-2 block text-sm font-medium text-gray-300">
          {source === "youtube" ? "YouTube" : "Spotify"} Playlist Link
        </label>
        <div className="relative">
          <input
            id="playlist-url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://open.spotify.com/playlist/… or https://youtube.com/playlist?list=…"
            className="w-full rounded-xl border bg-white/5 px-4 py-3 pr-10 text-white placeholder-gray-500 outline-none transition focus:ring-2"
            style={{
              borderColor:
                urlState.status === "valid"
                  ? "#22c55e55"
                  : urlState.status === "invalid" || urlState.status === "error"
                    ? "#ef444455"
                    : "#ffffff15",
            }}
          />
          {/* Spinner / status icon */}
          {urlState.status === "checking" && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-500">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
              </svg>
            </span>
          )}
          {urlState.status === "valid" && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
              <CheckIcon className="h-5 w-5" />
            </span>
          )}
          {(urlState.status === "invalid" || urlState.status === "error") && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
              aria-label="Clear"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Validation messages */}
        {urlState.status === "invalid" && (
          <p className="mt-1.5 text-xs text-red-400">{urlState.reason}</p>
        )}
        {urlState.status === "error" && (
          <p className="mt-1.5 text-xs text-red-400">{urlState.message}</p>
        )}
      </div>

      {/* Playlist preview card */}
      {urlState.status === "valid" && (
        <div className="flex items-center gap-4 rounded-xl border border-green-500/20 bg-green-500/[0.04] p-4">
          {/* Album art */}
          {urlState.playlist.image ? (
            <img
              src={urlState.playlist.image}
              alt={urlState.playlist.name}
              className="h-16 w-16 rounded-lg object-cover shadow-soft"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white/5 text-2xl">
              <MusicIcon className="h-10 w-10 text-gray-500" />
            </div>
          )}

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-white">{urlState.playlist.name}</p>
            <p className="text-sm text-gray-400">
              {urlState.playlist.owner} · {urlState.playlist.trackCount.toLocaleString()} tracks
            </p>
            {!urlState.playlist.hasItems && (
              <p className="mt-1 text-xs text-amber-400">
                <WarningIcon className="mr-1 inline h-3 w-3" /> No retrievable tracks — the playlist may be empty or private.
              </p>
            )}
            {urlState.playlist.hasItems && (
              <p className="mt-1 text-xs text-green-400"><CheckIcon className="mr-1 inline h-3 w-3" /> Tracks retrieved successfully</p>
            )}
          </div>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={urlState.status !== "valid" || !urlState.playlist.hasItems}
        className="w-full rounded-xl bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        🎧 Analyze My Playlist
        {source === "youtube" && " (YouTube)"}
        {source === "spotify" && " (Spotify)"}
      </button>
    </form>
  );
}
