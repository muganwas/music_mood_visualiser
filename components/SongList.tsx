"use client";

import { useState, useRef, KeyboardEvent } from "react";

interface Props {
  onAnalyze: (payload: { type: "manual"; songs: string[] }) => void;
}

export default function SongList({ onAnalyze }: Props) {
  // Always start with one empty input; reveal next only when the last is non-empty.
  const [songs, setSongs] = useState<string[]>([""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const lastIndex = songs.length - 1;

  const handleChange = (index: number, value: string) => {
    const next = [...songs];
    next[index] = value;
    setSongs(next);
  };

  // Reveal a new row when the user finishes typing in the last row.
  const handleBlur = (index: number) => {
    if (index === lastIndex && songs[index].trim() !== "") {
      setSongs((prev) => [...prev, ""]);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (index === lastIndex && songs[index].trim() !== "") {
        setSongs((prev) => [...prev, ""]);
        // Focus the new input on next tick.
        setTimeout(() => inputRefs.current[index + 1]?.focus(), 0);
      }
    }
  };

  // Only allow removing rows beyond the first one.
  const removeRow = (index: number) => {
    if (songs.length <= 1) return;
    setSongs((prev) => prev.filter((_, i) => i !== index));
  };

  const filledSongs = songs.filter((s) => s.trim() !== "");

  return (
    <div className="space-y-5">
      <p className="text-sm font-medium text-gray-300">
        Add songs one by one — press Enter or tab away to add another.
      </p>

      <ul className="space-y-2">
        {songs.map((song, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="text-xs text-gray-600 w-6 tabular-nums">
              {i + 1}.
            </span>
            <input
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              value={song}
              onChange={(e) => handleChange(i, e.target.value)}
              onBlur={() => handleBlur(i)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              placeholder="Song title…"
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
            {songs.length > 1 && (
              <button
                onClick={() => removeRow(i)}
                className="rounded-lg p-2 text-gray-600 hover:bg-white/5 hover:text-red-400 transition"
                aria-label="Remove song"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onAnalyze({ type: "manual", songs: filledSongs })}
        disabled={filledSongs.length === 0}
        className="w-full rounded-xl bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        🎧 Analyze {filledSongs.length > 0 ? `${filledSongs.length} Song${filledSongs.length > 1 ? "s" : ""}` : "Songs"}
      </button>
    </div>
  );
}
