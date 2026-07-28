"use client";

import { useState, FormEvent } from "react";

interface Props {
  onAnalyze: (payload: { type: "link"; url: string }) => void;
}

export default function PlaylistInput({ onAnalyze }: Props) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    onAnalyze({ type: "link", url: url.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="playlist-url" className="mb-2 block text-sm font-medium text-gray-300">
          Spotify or YouTube Playlist Link
        </label>
        <input
          id="playlist-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://open.spotify.com/playlist/…"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        />
      </div>
      <button
        type="submit"
        disabled={!url.trim()}
        className="w-full rounded-xl bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        🎧 Analyze My Playlist
      </button>
    </form>
  );
}
