import { NextRequest, NextResponse } from "next/server";
import { extractPlaylistId, getPlaylistTracks, searchTrack } from "@/lib/spotify";
import { analyzeMood } from "@/lib/deepseek";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, url, songs: rawSongs } = body as {
      type: "link" | "file" | "manual";
      url?: string;
      songs?: string[];
    };

    let tracks: { name: string; artist: string }[] = [];

    // ── Resolve songs depending on input type ──
    if (type === "link" && url) {
      const playlistId = extractPlaylistId(url);
      if (!playlistId) {
        return NextResponse.json({ error: "Could not parse playlist ID from URL" }, { status: 400 });
      }
      const spotifyTracks = await getPlaylistTracks(playlistId);
      tracks = spotifyTracks.map((t) => ({ name: t.name, artist: t.artist }));
    } else if ((type === "file" || type === "manual") && rawSongs?.length) {
      // Search Spotify for each song string to enrich with artist info.
      const results = await Promise.all(
        rawSongs.map(async (q) => {
          const match = await searchTrack(q);
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
    const analysis = await analyzeMood(tracks);

    return NextResponse.json({
      tracks: tracks.slice(0, 5), // preview of first 5
      totalTracks: tracks.length,
      ...analysis,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Analyze error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
