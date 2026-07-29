/**
 * YouTube Data API v3 helper — playlist detection and track listing.
 * API key is passed explicitly (from user's browser localStorage via headers)
 * with fallback to YOUTUBE_API_KEY env var.
 *
 * Uses the YouTube Data API to fetch playlist metadata and video titles.
 * Each video title is treated as a "song" for mood analysis.
 */

const YT_API_BASE = "https://www.googleapis.com/youtube/v3";

export interface YTPlaylistInfo {
  id: string;
  name: string;
  image: string;
  owner: string;
  trackCount: number;
}

export interface YTTrack {
  name: string;
  artist: string;
  albumArt: string; // thumbnail URL
  videoId: string;
}

/** Extract YouTube playlist ID from any supported URL or raw ID format */
export function extractYTPlaylistId(input: string): string | null {
  const trimmed = input.trim();

  // Already a raw ID (e.g. "PLxxx..." or "OLAK5uy_xxx...")
  if (/^[A-Za-z0-9_-]{18,}$/.test(trimmed) && !trimmed.includes("/") && !trimmed.includes(".")) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    // Standard youtube.com/playlist?list=PLxxx
    const listParam = url.searchParams.get("list");
    if (listParam) return listParam;
  } catch {
    // Not a valid URL, try raw ID fallback
    if (/^[A-Za-z0-9_-]{18,}$/.test(trimmed)) return trimmed;
  }

  return null;
}

/** Check if input looks like a YouTube playlist URL */
export function looksLikeYoutube(input: string): boolean {
  const lower = input.trim().toLowerCase();
  return (lower.includes("youtube") || lower.includes("youtu.be")) && lower.includes("list=");
}

function resolveKey(provided?: string): string {
  return provided || process.env.YOUTUBE_API_KEY || "";
}

/** Fetch playlist metadata (title, thumbnail, owner, item count) */
export async function getYTPlaylistInfo(id: string, apiKey?: string): Promise<YTPlaylistInfo> {
  const key = resolveKey(apiKey);
  if (!key) throw new Error("Missing YouTube API key. Add it in Settings.");

  const res = await fetch(
    `${YT_API_BASE}/playlists?part=snippet,contentDetails&id=${id}&key=${key}`,
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YouTube API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const item = data.items?.[0];
  if (!item) throw new Error("Playlist not found or is private");

  const snippet = item.snippet;
  const content = item.contentDetails;

  return {
    id,
    name: snippet.title,
    image: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || "",
    owner: snippet.channelTitle,
    trackCount: content.itemCount,
  };
}

/** Fetch all playlist items (paginated) */
export async function getYTPlaylistTracks(
  id: string,
  maxResults = 200,
  apiKey?: string,
): Promise<{ tracks: YTTrack[]; total: number }> {
  const key = resolveKey(apiKey);
  if (!key) throw new Error("Missing YouTube API key. Add it in Settings.");

  let tracks: YTTrack[] = [];
  let pageToken: string | undefined;
  let total = 0;

  do {
    const params = new URLSearchParams({
      part: "snippet",
      playlistId: id,
      maxResults: String(Math.min(maxResults - tracks.length, 50)),
      key,
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(`${YT_API_BASE}/playlistItems?${params}`);

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`YouTube API error: ${res.status} ${err}`);
    }

    const data = await res.json();
    total = data.pageInfo?.totalResults ?? total;

    for (const item of data.items ?? []) {
      const snippet = item.snippet;
      const title = snippet.title;

      // Title often contains "Artist - Song" or just "Song" — use channel as fallback artist
      tracks.push({
        name: title,
        artist: snippet.videoOwnerChannelTitle || snippet.channelTitle || "Unknown",
        albumArt: snippet.thumbnails?.default?.url || "",
        videoId: snippet.resourceId?.videoId || "",
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken && tracks.length < maxResults);

  return { tracks: tracks.slice(0, maxResults), total };
}

/** Search YouTube for a single track — used as album-art fallback */
export async function searchYTTrack(
  query: string,
  apiKey?: string,
): Promise<{ albumArt: string } | null> {
  const key = resolveKey(apiKey);
  if (!key) return null;

  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    maxResults: "1",
    key,
  });

  try {
    const res = await fetch(`${YT_API_BASE}/search?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    const item = data.items?.[0];
    if (!item) return null;
    const thumb = item.snippet?.thumbnails;
    return { albumArt: thumb?.medium?.url || thumb?.default?.url || "" };
  } catch {
    return null;
  }
}
