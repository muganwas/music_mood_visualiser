"use client";

import PaletteVisual from "./PaletteVisual";
import { RefreshIcon } from "./icons";
import { ensureContrast, contrastText } from "@/lib/contrast";

interface MoodAnalysis {
  moodSummary: string;
  topThemes: string[];
  audioProfile: {
    tempo: string;
    energy: string;
    danceability: string;
  };
  palette: string[];
  keywords: string[];
}

interface Props {
  data: MoodAnalysis & { trackCount: number; unmatchedCount?: number; albumArts: string[] };
  onRegenerate: () => void;
}

const METER_WIDTH: Record<string, string> = {
  high: "w-full",
  medium: "w-2/3",
  low: "w-1/3",
  fast: "w-full",
  slow: "w-1/3",
};

export default function MoodboardResult({ data, onRegenerate }: Props) {
  const { moodSummary, topThemes, audioProfile, palette, keywords, trackCount, unmatchedCount, albumArts } = data;

  const readableAccent = ensureContrast(palette[0] ?? "#6c5ce7");

  return (
    <section className="mt-10 space-y-14">
      {/* ── Hero mood ── */}
      <div className="text-center">
        <h2
          className="text-4xl font-bold"
          style={{ color: readableAccent }}
        >
          {moodSummary}
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          {trackCount} tracks analysed
        </p>
        {unmatchedCount ? (
          <p className="mt-1 text-xs text-amber-400">
            {unmatchedCount} track{unmatchedCount > 1 ? "s" : ""} could not be matched — results may be less accurate
          </p>
        ) : null}
      </div>

      {/* ── Palette + Album art side by side ── */}
      <div className="grid gap-8 sm:grid-cols-2">
        {/* Left: palette */}
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-600">
            Color Palette
          </p>
          <div className="flex items-start gap-4">
            <PaletteVisual palette={palette} />
            <div className="space-y-1 pt-1">
              {palette.map((hex, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: hex }} />
                  <span className="font-mono text-gray-500">{hex}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: album art */}
        {albumArts.length > 0 && (
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-600">
              Album Covers
            </p>
            <div className="flex flex-wrap gap-2">
              {albumArts.slice(0, 20).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="h-16 w-16 rounded-lg object-cover shadow-soft transition hover:scale-110 hover:shadow-soft-md"
                  loading="lazy"
                />
            ))}
          </div>
        </div>
      )}

      </div>

      {/* ── Themes + Keywords ── */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-600">
            Top Themes
          </p>
          <ul className="space-y-1">
            {topThemes.map((t, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                <span
                  className="inline-block h-2 w-2 rounded-full border border-white/30"
                  style={{ backgroundColor: palette[i] ?? palette[0] }}
                />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-600">
            Keywords
          </p>
          <div className="flex flex-wrap gap-2">
            {keywords.map((k, i) => (
              <span
                key={i}
                className="rounded-full px-3 py-1 text-xs"
                style={{
                  backgroundColor: palette[i % palette.length] ?? "#6c5ce7",
                  color: contrastText(palette[i % palette.length] ?? "#6c5ce7"),
                  borderColor: "transparent",
                }}
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Audio profile meters ── */}
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-600">
          Audio Profile
        </p>
        <div className="space-y-3">
          {(
            [
              ["Tempo", audioProfile.tempo],
              ["Energy", audioProfile.energy],
              ["Danceability", audioProfile.danceability],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-24 text-xs text-gray-500">{label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all ${METER_WIDTH[value] ?? "w-1/2"}`}
                  style={{ backgroundColor: readableAccent }}
                />
              </div>
              <span className="w-12 text-right text-xs capitalize text-gray-400">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Regenerate ── */}
      <div className="text-center">
        <button
          onClick={onRegenerate}
          className="inline-flex items-center gap-2 rounded-full border px-7 py-3 text-sm font-medium transition-all shadow-soft-md hover:shadow-soft-lg hover:-translate-y-0.5 active:translate-y-0"
          style={{ borderColor: readableAccent, color: readableAccent }}
        >
          <RefreshIcon className="h-4 w-4" /> Try a new variation
        </button>
      </div>
    </section>
  );
}
