"use client";

import { usePlaylists } from "@/stores/PlaylistContext";

export default function PlaylistHistory() {
  const { playlists, removePlaylist, clearPlaylists } = usePlaylists();

  if (playlists.length === 0) return null;

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
        {playlists.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 pr-2 group hover:border-white/20 transition"
          >
            {p.image ? (
              <img src={p.image} alt="" className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <span className="text-xs">🎵</span>
            )}
            <span className="max-w-32 truncate text-xs text-gray-300">{p.name}</span>
            <span className="text-xs text-gray-600">{p.trackCount}</span>
            <button
              onClick={(e) => { e.stopPropagation(); removePlaylist(p.id); }}
              className="ml-1 rounded-full p-0.5 text-gray-600 opacity-0 group-hover:opacity-100 hover:text-red-400 transition"
              aria-label="Remove"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
