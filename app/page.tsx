"use client";

import { useState, useRef, useEffect } from "react";
import PlaylistInput from "@/components/PlaylistInput";
import FileUpload from "@/components/FileUpload";
import SongList from "@/components/SongList";
import PlaylistHistory from "@/components/profile/PlaylistHistory";
import MoodboardResult from "@/components/MoodboardResult";
import { useCredentials } from "@/stores/CredentialsContext";
import { usePlaylists } from "@/stores/PlaylistContext";

type InputMode = "link" | "upload" | "manual";

export default function Home() {
  const [mode, setMode] = useState<InputMode>("link");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<object | null>(null);
  const [lastPayload, setLastPayload] = useState<object | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const { credentials } = useCredentials();
  const { addPlaylist } = usePlaylists();

  // Smooth-scroll to result when analysis finishes (custom slower easing)
  useEffect(() => {
    if (result && resultRef.current) {
      const el = resultRef.current;
      const target = el.getBoundingClientRect().top + window.scrollY - 80;
      const start = window.scrollY;
      const distance = target - start;
      const duration = 1200; // ms — slower than native smooth
      let startTime: number | null = null;

      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      const step = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        window.scrollTo(0, start + distance * easeOutCubic(progress));
        if (progress < 1) requestAnimationFrame(step);
      };

      requestAnimationFrame(step);
    }
  }, [result]);

  const handleAnalyze = async (payload: object) => {
    setLastPayload(payload);
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

  const activeUrl =
    lastPayload && (lastPayload as { type: string; url?: string }).type === "link"
      ? (lastPayload as { url?: string }).url
      : undefined;

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
      <PlaylistHistory onSelect={handleHistorySelect} activeUrl={activeUrl} />

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
        <div ref={resultRef} className="mt-10 space-y-3 text-center">
          <div className="mx-auto h-2 w-48 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-brand-500" />
          </div>
          <p className="text-sm text-gray-500 animate-pulse">
            Analysing your playlist…
          </p>
        </div>
      )}

      {result && !("error" in result) && (
        <div ref={resultRef}>
        <MoodboardResult
          data={result as { trackCount: number; albumArts: string[]; moodSummary: string; topThemes: string[]; audioProfile: { tempo: string; energy: string; danceability: string }; palette: string[]; keywords: string[] }}
          onRegenerate={() => lastPayload && handleAnalyze(lastPayload)}
        />
        </div>
      )}

      {result && "error" in result && (
        <section className="mt-10 rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-8 text-center">
          <p className="text-red-400">{(result as { error: string }).error}</p>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-20 text-center text-xs text-gray-600">
        Built with Next.js · Spotify API · DeepSeek AI
      </footer>
    </main>
  );
}
