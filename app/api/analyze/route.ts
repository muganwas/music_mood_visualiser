import { NextRequest, NextResponse } from "next/server";
import { extractPlaylistId, getPlaylistTracks, searchTrack, getSpotifyCredentials } from "@/lib/spotify";
import { extractYTPlaylistId, getYTPlaylistTracks, searchYTTrack } from "@/lib/youtube";
import { analyzeMood } from "@/lib/deepseek";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, url, source, songs: rawSongs } = body as {
      type: "link" | "file" | "manual";
      url?: string;
      source?: "spotify" | "youtube";
      songs?: (string | { name: string; artist: string })[];
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
      // Accept pre-resolved {name, artist} pairs or plain strings
      tracks = rawSongs.map((s) => {
        if (typeof s === "object" && "name" in s) {
          return { name: s.name, artist: s.artist || "" };
        }
        return { name: s as string, artist: "" };
      });

      // For any still missing artists, try Spotify
      const enriched = await Promise.all(
        tracks.map(async (t) => {
          if (t.artist) return t;
          const match = await searchTrack(t.name, creds);
          return match
            ? { name: match.name, artist: match.artist }
            : t; // leave artist empty — don't guess
        })
      );
      tracks = enriched;
    } else {
      return NextResponse.json({ error: "No songs provided" }, { status: 400 });
    }

    if (tracks.length === 0) {
      return NextResponse.json({ error: "No tracks found" }, { status: 404 });
    }

    // ── AI mood analysis ──
    const analysis = await analyzeMood(tracks, deepseekKey);

    // ── Album art collage ──
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
    } else {
      // File / manual: search Spotify for each track, fall back to YouTube
      const arts = await Promise.all(
        tracks.map(async (t) => {
          // Try Spotify
          const match = await searchTrack(`${t.name} ${t.artist}`, creds);
          if (match?.albumArt) return match.albumArt;
          // Fall back to YouTube
          const yt = await searchYTTrack(`${t.name} ${t.artist}`, ytApiKey);
          return yt?.albumArt || "";
        })
      );
      albumArts = [...new Set(arts.filter(Boolean))];
    }

    const unmatchedTitles = tracks.filter((t) => !t.artist).map((t) => t.name);
    const unmatchedCount = unmatchedTitles.length;

    // Block analysis if any tracks are unmatched — user should fix first
    if (unmatchedCount > 0 && (type === "file" || type === "manual")) {
      return NextResponse.json({
        error: `${unmatchedCount} track${unmatchedCount > 1 ? "s" : ""} could not be matched. Please verify the title and artist, or remove the song.`,
        unmatched: unmatchedTitles,
      }, { status: 422 });
    }

    return NextResponse.json({
      trackCount: tracks.length,
      unmatchedCount,
      albumArts: albumArts.slice(0, 50),
      ...analysis,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Analyze error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
