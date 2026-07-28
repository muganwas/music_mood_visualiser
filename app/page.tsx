"use client";

import { useState } from "react";
import PlaylistInput from "@/components/PlaylistInput";
import FileUpload from "@/components/FileUpload";
import SongList from "@/components/SongList";
import PlaylistHistory from "@/components/profile/PlaylistHistory";
import { useCredentials } from "@/stores/CredentialsContext";
import { usePlaylists } from "@/stores/PlaylistContext";

type InputMode = "link" | "upload" | "manual";

export default function Home() {
  const [mode, setMode] = useState<InputMode>("link");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<object | null>(null);
  const { credentials } = useCredentials();
  const { addPlaylist } = usePlaylists();

  const handleAnalyze = async (payload: object) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-spotify-client-id": credentials.spotifyClientId,
          "x-spotify-client-secret": credentials.spotifyClientSecret,
          "x-spotify-refresh-token": credentials.spotifyRefreshToken,
          "x-spotify-market": credentials.spotifyMarket,
          "x-deepseek-api-key": credentials.deepseekApiKey,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error("Analysis failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaylistFound = (info: { id: string; name: string; image: string; owner: string; trackCount: number; url: string }) => {
    addPlaylist(info);
  };

  const handleHistorySelect = (url: string) => {
    setMode("link");
    handleAnalyze({ type: "link", url });
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      {/* Header */}
      <header className="mb-14 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-white">
          AI Music <span className="text-brand-500">Moodboard</span>
        </h1>
        <p className="mt-4 text-lg text-gray-400">
          Paste a playlist, upload a list, or type in songs — we&apos;ll visualise
          the vibe.
        </p>
      </header>

      {/* Playlist History */}
      <PlaylistHistory onSelect={handleHistorySelect} />

      {/* Mode Tabs */}
      <div className="mb-10 flex justify-center gap-2">
        {(
          [
            ["link", "🔗 Playlist Link"],
            ["upload", "📂 Upload File"],
            ["manual", "✍️ Manual Entry"],
          ] as [InputMode, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition ${
              mode === key
                ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30"
                : "bg-white/5 text-gray-300 hover:bg-white/10"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
        {mode === "link" && (
          <PlaylistInput
            onAnalyze={handleAnalyze}
            credentials={credentials}
            onPlaylistFound={handlePlaylistFound}
          />
        )}
        {mode === "upload" && <FileUpload onAnalyze={handleAnalyze} />}
        {mode === "manual" && <SongList onAnalyze={handleAnalyze} />}
      </section>

      {/* Loading */}
      {loading && (
        <div className="mt-10 space-y-3 text-center">
          <div className="mx-auto h-2 w-48 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-brand-500" />
          </div>
          <p className="text-sm text-gray-500 animate-pulse">
            Analysing your playlist…
          </p>
        </div>
      )}

      {/* Result placeholder */}
      {result && (
        <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          <h2 className="text-xl font-semibold">Moodboard Result</h2>
          <pre className="mt-4 overflow-auto text-xs text-gray-400">
            {JSON.stringify(result, null, 2)}
          </pre>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-20 text-center text-xs text-gray-600">
        Built with Next.js · Spotify API · DeepSeek AI
      </footer>
    </main>
  );
}
