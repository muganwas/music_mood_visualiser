import { NextRequest, NextResponse } from "next/server";
import {
  getPlaylistTracks,
  getPlaylistInfo,
  extractPlaylistId,
  searchTrack,
} from "@/lib/spotify";

/**
 * GET /api/spotify?playlist=<url>  → returns playlist metadata + full tracks
 * GET /api/spotify?playlist=<url>&preview=true  → returns metadata + first track (to verify accessibility)
 * GET /api/spotify?q=<search>      → searches for a single track
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const playlistUrl = searchParams.get("playlist");
  const previewOnly = searchParams.get("preview") === "true";
  const query = searchParams.get("q");

  try {
    if (playlistUrl) {
      const id = extractPlaylistId(playlistUrl);
      if (!id) {
        return NextResponse.json({ error: "Invalid Spotify playlist URL" }, { status: 400 });
      }

      const info = await getPlaylistInfo(id);

      if (previewOnly) {
        const { total, tracks } = await getPlaylistTracks(id);
        return NextResponse.json({
          playlist: {
            ...info,
            trackCount: total,
            hasItems: tracks.length > 0,
          },
        });
      }

      const { tracks } = await getPlaylistTracks(id);
      return NextResponse.json({ playlist: info, tracks });
    }

    if (query) {
      const track = await searchTrack(query);
      return NextResponse.json({ track: track ?? null });
    }

    return NextResponse.json({ error: "Pass ?playlist= or ?q=" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Spotify error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
