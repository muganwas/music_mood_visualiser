"use client";

import { useState, useEffect } from "react";
import { usePlaylists } from "@/stores/PlaylistContext";
import { CloseIcon, MusicIcon } from "../icons";

interface Props {
  onSelect: (url: string) => void;
  activeUrl?: string;
}

export default function PlaylistHistory({ onSelect, activeUrl }: Props) {
  const { playlists, removePlaylist, clearPlaylists } = usePlaylists();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted || playlists.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-500">
          Recent playlists ({playlists.length})
        </h2>
        <button
          onClick={clearPlaylists}
          className="text-xs text-gray-600 hover:text-red-400 transition"
        >
          Clear all
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {playlists.map((p) => {
          const isActive = p.url === activeUrl;
          return (
          <button
            key={p.id}
            onClick={() => onSelect(p.url)}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 pr-2 group transition cursor-pointer ${
              isActive
                ? "border-brand-500/60 bg-brand-500/20 shadow-soft-md"
                : "border-white/10 bg-white/[0.03] hover:border-brand-500/40 hover:bg-brand-500/10"
            }`}
          >
            {p.image ? (
              <img src={p.image} alt="" className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <MusicIcon className="h-4 w-4 text-gray-500" />
            )}
            <span className={`max-w-32 truncate text-xs ${isActive ? "text-white font-medium" : "text-gray-300"}`}>{p.name}</span>
            <span className={`text-xs ${isActive ? "text-brand-300" : "text-gray-600"}`}>{p.trackCount}</span>
            <span
              onClick={(e) => { e.stopPropagation(); removePlaylist(p.id); }}
              className="ml-1 rounded-full p-0.5 text-gray-600 opacity-0 group-hover:opacity-100 hover:text-red-400 transition cursor-pointer"
              aria-label="Remove"
            >
              <CloseIcon className="h-3 w-3" />
            </span>
          </button>
        )})}
      </div>
    </div>
  );
}
