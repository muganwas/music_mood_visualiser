"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { MusicIcon } from "./icons";

// ── Types ────────────────────────────────────────────────────

interface ResolvedSong {
  name: string;
  artist: string;
}

interface Props {
  onAnalyze: (payload: {
    type: "file";
    songs: ResolvedSong[];
    fileName: string;
  }) => void;
  credentials: {
    spotifyClientId: string;
    spotifyClientSecret: string;
    spotifyRefreshToken: string;
    spotifyMarket: string;
  };
}

// ── Parsing ──────────────────────────────────────────────────

/** Split a CSV line into cells, respecting quoted fields */
function splitCSV(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { cells.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

/** Map header column names to a known field */
type ColumnMap = { titleIdx: number; artistIdx: number };

function detectColumns(headerCells: string[]): ColumnMap | null {
  const lower = headerCells.map((c) => c.toLowerCase().replace(/[^a-z]/g, ""));
  let titleIdx = -1;
  let artistIdx = -1;

  for (let i = 0; i < lower.length; i++) {
    const c = lower[i];
    if (titleIdx === -1 && /^(track|title|song|name)$/.test(c)) titleIdx = i;
    if (artistIdx === -1 && /^(artist|by|performer)$/.test(c)) artistIdx = i;
  }

  if (titleIdx === -1) return null; // need at least a title column
  return { titleIdx, artistIdx };
}

/** Detect if a line looks like a CSV/txt header row */
const HEADER_WORDS = /^(title|song|track|artist|name|number|#|no\.?)\b/i;
function isHeaderRow(line: string): boolean {
  return HEADER_WORDS.test(line.trim());
}

/** Parse a single line into {name, artist} — used when no CSV columns detected */
function parseLine(line: string): ResolvedSong {
  // "Artist – Song" or "Artist - Song" (em-dash or regular dash)
  const dashMatch = line.match(/^(.+?)\s+[–-]\s+(.+)$/);
  if (dashMatch) {
    const [, first, second] = dashMatch;
    if (first.length <= second.length) {
      return { name: second.trim(), artist: first.trim() };
    }
    return { name: first.trim(), artist: second.trim() };
  }
  return { name: line, artist: "" };
}

/** Parse file text into resolved songs.
 *  Detects CSV headers with Track/Artist columns, or falls back to line-by-line parsing. */
function parseSongs(text: string): ResolvedSong[] {
  const rawLines = text.split(/[\n]+/).map((s) => s.trim()).filter((s) => s.length > 0);
  if (rawLines.length === 0) return [];

  // ── Try CSV column detection ──
  const firstCells = splitCSV(rawLines[0]);
  const columnMap = detectColumns(firstCells);

  if (columnMap) {
    // CSV with header — parse each row using column map
    return rawLines.slice(1).map((line) => {
      const cells = splitCSV(line);
      const name = cells[columnMap.titleIdx]?.trim() || "";
      const artist = columnMap.artistIdx >= 0 ? (cells[columnMap.artistIdx]?.trim() || "") : "";
      return { name, artist };
    }).filter((s) => s.name.length > 0);
  }

  // ── Fallback: line-by-line with dash detection ──
  const startIdx = rawLines.length > 0 && isHeaderRow(rawLines[0]) ? 1 : 0;
  return rawLines.slice(startIdx).map(parseLine);
}

// ── Component ────────────────────────────────────────────────

export default function FileUpload({ onAnalyze, credentials }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [songs, setSongs] = useState<ResolvedSong[]>([]);
  const [resolving, setResolving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const missingArtist = songs.filter((s) => !s.artist).length;

  const processFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseSongs(reader.result as string);
      setSongs(parsed);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  /** Search Spotify for each song missing an artist */
  const handleResolveArtists = async () => {
    setResolving(true);
    const updated = await Promise.all(
      songs.map(async (s) => {
        if (s.artist) return s;
        try {
          const res = await fetch(
            `/api/spotify?q=${encodeURIComponent(s.name)}`,
            {
              headers: {
                "x-spotify-client-id": credentials.spotifyClientId,
                "x-spotify-client-secret": credentials.spotifyClientSecret,
                "x-spotify-refresh-token": credentials.spotifyRefreshToken,
                "x-spotify-market": credentials.spotifyMarket,
              },
            },
          );
          const data = await res.json();
          if (data.track) {
            return { name: data.track.name, artist: data.track.artist };
          }
        } catch { /* keep as-is */ }
        return s;
      }),
    );
    setSongs(updated);
    setResolving(false);
  };

  const updateArtist = (i: number, artist: string) => {
    const next = [...songs];
    next[i] = { ...next[i], artist };
    setSongs(next);
  };

  const autoResolved = songs.filter((s) => s.artist).length;

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition ${
          dragOver
            ? "border-brand-500 bg-brand-500/10"
            : "border-white/15 bg-white/[0.02] hover:border-white/30"
        }`}
      >
        <p className="text-3xl">📁</p>
        <p className="mt-3 text-sm text-gray-400">
          {fileName
            ? `Loaded: ${fileName}`
            : "Drag & drop a .csv or .txt file, or click to browse"}
        </p>
        <p className="mt-1 text-xs text-gray-600">
          One song per line · <code>Artist - Title</code> auto-detected · header row skipped
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          onChange={handleChange}
          className="hidden"
        />
      </div>

      {/* Format guide — shown before a file is loaded */}
      {!fileName && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs leading-relaxed text-gray-500">
          <p className="mb-2 font-medium text-gray-400">Supported formats:</p>
          <ul className="space-y-1">
            <li><span className="text-gray-300">CSV with headers</span> — columns named <code>Track</code>, <code>Artist</code>, <code>Album</code> are auto-mapped. Album column is ignored.</li>
            <li><span className="text-gray-300">Plain text</span> — one song per line. We detect <code>Artist - Title</code> automatically.</li>
            <li>Artists are optional. Use the <em>Find artists</em> button to enrich with Spotify.</li>
          </ul>
        </div>
      )}

      {/* Song preview with artist resolution */}
      {songs.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">
              {songs.length} song{songs.length > 1 ? "s" : ""} detected
              {autoResolved > 0 && (
                <span className="ml-1 text-green-400">
                  · {autoResolved} with artist
                </span>
              )}
            </p>
            {missingArtist > 0 && (
              <button
                type="button"
                onClick={handleResolveArtists}
                disabled={resolving}
                className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/10 transition disabled:opacity-50"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                {resolving ? "Searching…" : `Find artists for ${missingArtist}`}
              </button>
            )}
          </div>

          <ul className="max-h-52 space-y-0.5 overflow-y-auto rounded-lg bg-white/[0.02] p-2">
            {songs.slice(0, 30).map((s, i) => (
              <li key={i} className="flex items-center gap-2 rounded px-2 py-1 text-sm group hover:bg-white/5">
                <MusicIcon className="h-3 w-3 shrink-0 text-gray-500" />
                <span className="truncate text-gray-200">{s.name}</span>
                <span className="text-gray-600">—</span>
                <input
                  value={s.artist}
                  onChange={(e) => updateArtist(i, e.target.value)}
                  placeholder="Unknown artist"
                  className={`min-w-0 flex-1 rounded bg-transparent px-1 py-0.5 text-xs outline-none transition focus:bg-white/5 ${
                    s.artist ? "text-gray-400" : "text-amber-500 placeholder-gray-700"
                  }`}
                />
              </li>
            ))}
            {songs.length > 30 && (
              <li className="px-2 py-1 text-xs text-gray-600">
                …and {songs.length - 30} more
              </li>
            )}
          </ul>
        </div>
      )}

      <button
        onClick={() => onAnalyze({ type: "file", songs, fileName: fileName ?? "" })}
        disabled={songs.length === 0}
        className="w-full rounded-xl bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        🎧 Analyze {songs.length > 0 ? `${songs.length} ` : ""}Songs
      </button>
    </div>
  );
}
