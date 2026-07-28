import { NextRequest, NextResponse } from "next/server";
import { getPlaylistTracks, extractPlaylistId, searchTrack } from "@/lib/spotify";

/**
 * GET /api/spotify?playlist=<url>  → returns tracks from a playlist
 * GET /api/spotify?q=<search>      → searches for a single track
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const playlistUrl = searchParams.get("playlist");
  const query = searchParams.get("q");

  try {
    if (playlistUrl) {
      const id = extractPlaylistId(playlistUrl);
      if (!id) {
        return NextResponse.json({ error: "Invalid playlist URL" }, { status: 400 });
      }
      const tracks = await getPlaylistTracks(id);
      return NextResponse.json({ tracks });
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
