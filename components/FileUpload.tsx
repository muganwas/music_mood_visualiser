"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";

interface Props {
  onAnalyze: (payload: { type: "file"; songs: string[]; fileName: string }) => void;
}

/** Parse song titles from CSV or plain text (one per line). */
function parseSongs(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export default function FileUpload({ onAnalyze }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [songs, setSongs] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

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
          One song per line, or comma-separated
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          onChange={handleChange}
          className="hidden"
        />
      </div>

      {/* Preview */}
      {songs.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="mb-2 text-xs font-medium text-gray-500">
            {songs.length} song{songs.length > 1 ? "s" : ""} detected
          </p>
          <ul className="max-h-40 space-y-1 overflow-y-auto text-sm text-gray-300">
            {songs.slice(0, 10).map((s, i) => (
              <li key={i} className="truncate">🎵 {s}</li>
            ))}
            {songs.length > 10 && (
              <li className="text-gray-600">…and {songs.length - 10} more</li>
            )}
          </ul>
        </div>
      )}

      <button
        onClick={() => onAnalyze({ type: "file", songs, fileName: fileName ?? "" })}
        disabled={songs.length === 0}
        className="w-full rounded-xl bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        🎧 Analyze These Songs
      </button>
    </div>
  );
}
