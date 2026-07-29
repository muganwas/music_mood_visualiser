"use client";

import { useState, useEffect } from "react";
import { usePlaylists } from "@/stores/PlaylistContext";
import { CloseIcon, MusicIcon, FolderIcon } from "../icons";
import type { SavedPlaylist } from "@/stores/PlaylistContext";

interface Props {
  onSelect: (p: SavedPlaylist) => void;
  activeId?: string | null;
}

export default function PlaylistHistory({ onSelect, activeId }: Props) {
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
          const isActive = activeId === p.id;
          const isFile = p.type === "file";
          return (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 pr-2 group transition cursor-pointer ${
              isActive
                ? "border-brand-500/60 bg-brand-500/20 shadow-soft-md"
                : "border-white/10 bg-white/[0.03] hover:border-brand-500/40 hover:bg-brand-500/10"
            }`}
          >
            {p.image ? (
              <img src={p.image} alt="" className="h-5 w-5 rounded-full object-cover" />
            ) : isFile ? (
              <FolderIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <MusicIcon className="h-4 w-4 text-gray-500" />
            )}
            <span className={`max-w-32 truncate text-xs ${isActive ? "text-white font-medium" : "text-gray-300"}`}>{p.name}</span>
            {isFile ? (
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
                FILE
              </span>
            ) : (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                p.source === "youtube" ? "bg-red-500/15 text-red-400" : "bg-green-500/15 text-green-400"
              }`}>
                {p.source === "youtube" ? "YT" : "SP"}
              </span>
            )}
            <span className={`text-xs ${isActive ? "text-brand-300" : "text-gray-600"}`}>{p.trackCount}</span>
            <span
              onClick={(e) => { e.stopPropagation(); removePlaylist(p.id); }}
              className="ml-1 rounded-full p-0.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
              aria-label="Remove"
              title="Remove playlist"
            >
              <CloseIcon className="h-3 w-3" />
            </span>
          </button>
        )})}
      </div>
    </div>
  );
}
