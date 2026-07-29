import { NextRequest, NextResponse } from "next/server";
import { extractPlaylistId, getPlaylistTracks, searchTrack, getSpotifyCredentials } from "@/lib/spotify";
import { extractYTPlaylistId, getYTPlaylistTracks } from "@/lib/youtube";
import { analyzeMood } from "@/lib/deepseek";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, url, source, songs: rawSongs } = body as {
      type: "link" | "file" | "manual";
      url?: string;
      source?: "spotify" | "youtube";
      songs?: string[];
    };

    const creds = getSpotifyCredentials(req.headers);
    const deepseekKey = req.headers.get("x-deepseek-api-key") || process.env.DEEPSEEK_API_KEY || "";
    const ytApiKey = req.headers.get("x-youtube-api-key") || process.env.YOUTUBE_API_KEY || "";

    let tracks: { name: string; artist: string }[] = [];

    // ── Resolve songs depending on input type ──
    if (type === "link" && url) {
      if (source === "youtube") {
        const ytId = extractYTPlaylistId(url);
        if (!ytId) {
          return NextResponse.json({ error: "Could not parse YouTube playlist ID from URL" }, { status: 400 });
        }
        const { tracks: ytTracks } = await getYTPlaylistTracks(ytId, 200, ytApiKey);
        tracks = ytTracks.map((t) => ({ name: t.name, artist: t.artist }));
      } else {
        const playlistId = extractPlaylistId(url);
        if (!playlistId) {
          return NextResponse.json({ error: "Could not parse playlist ID from URL" }, { status: 400 });
        }
        const { tracks: spotifyTracks } = await getPlaylistTracks(playlistId, creds);
        tracks = spotifyTracks.map((t) => ({ name: t.name, artist: t.artist }));
      }
    } else if ((type === "file" || type === "manual") && rawSongs?.length) {
      // Search Spotify for each song string to enrich with artist info.
      const results = await Promise.all(
        rawSongs.map(async (q) => {
          const match = await searchTrack(q, creds);
          return match
            ? { name: match.name, artist: match.artist }
            : { name: q, artist: "Unknown" }; // fallback if not found
        })
      );
      tracks = results;
    } else {
      return NextResponse.json({ error: "No songs provided" }, { status: 400 });
    }

    if (tracks.length === 0) {
      return NextResponse.json({ error: "No tracks found" }, { status: 404 });
    }

    // ── AI mood analysis ──
    const analysis = await analyzeMood(tracks, deepseekKey);

    // For link type, re-fetch full tracks to get album art for the collage
    let albumArts: string[] = [];
    if (type === "link" && url) {
      if (source === "youtube") {
        const ytId = extractYTPlaylistId(url);
        if (ytId) {
          const { tracks: ytTracks } = await getYTPlaylistTracks(ytId, 200, ytApiKey);
          albumArts = [...new Set(ytTracks.map((t) => t.albumArt).filter(Boolean))];
        }
      } else {
        const playlistId = extractPlaylistId(url);
        if (playlistId) {
          const { tracks: fullTracks } = await getPlaylistTracks(playlistId, creds);
          albumArts = [...new Set(fullTracks.map((t) => t.albumArt).filter(Boolean))];
        }
      }
    }

    return NextResponse.json({
      trackCount: tracks.length,
      albumArts: albumArts.slice(0, 50),
      ...analysis,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Analyze error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
