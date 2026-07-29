import { NextRequest, NextResponse } from "next/server";
import {
  extractYTPlaylistId,
  getYTPlaylistInfo,
  getYTPlaylistTracks,
} from "@/lib/youtube";

/**
 * GET /api/youtube?playlist=<url>                     → full metadata + tracks
 * GET /api/youtube?playlist=<url>&preview=true         → metadata + first track only
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const playlistUrl = searchParams.get("playlist");
  const previewOnly = searchParams.get("preview") === "true";
  const apiKey = req.headers.get("x-youtube-api-key") || process.env.YOUTUBE_API_KEY || "";

  if (!playlistUrl) {
    return NextResponse.json({ error: "Missing ?playlist= parameter" }, { status: 400 });
  }

  try {
    const id = extractYTPlaylistId(playlistUrl);
    if (!id) {
      return NextResponse.json({ error: "Invalid YouTube playlist URL" }, { status: 400 });
    }

    if (previewOnly) {
      const info = await getYTPlaylistInfo(id, apiKey);
      const { total, tracks } = await getYTPlaylistTracks(id, 5, apiKey);
      return NextResponse.json({
        playlist: {
          ...info,
          hasItems: tracks.length > 0,
        },
        total,
      });
    }

    const info = await getYTPlaylistInfo(id, apiKey);
    const { tracks, total } = await getYTPlaylistTracks(id, 200, apiKey);

    return NextResponse.json({
      playlist: info,
      tracks: tracks.map((t) => ({
        name: t.name,
        artist: t.artist,
        albumArt: t.albumArt,
      })),
      total,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("YouTube API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
