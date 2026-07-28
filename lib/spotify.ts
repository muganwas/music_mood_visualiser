/**
 * Spotify API helper.
 * - Client Credentials (server-to-server) for public playlist metadata.
 * - Refresh Token flow for user-scoped access (required for /items endpoint).
 * Requires SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_REFRESH_TOKEN in .env.local.
 */

const TOKEN_URL = "https://accounts.spotify.com/api/token";

let cachedClientToken: { access_token: string; expires_at: number } | null = null;
let cachedUserToken: { access_token: string; expires_at: number } | null = null;

function basicAuth(): string {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET env vars");
  }
  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

/** Server-to-server token — works for public playlist metadata. */
async function getAccessToken(): Promise<string> {
  if (cachedClientToken && Date.now() < cachedClientToken.expires_at - 60_000) {
    return cachedClientToken.access_token;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Spotify client-credentials token error: ${res.status} ${err}`);
  }

  const data = await res.json();
  cachedClientToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  return cachedClientToken.access_token;
}

/** User-scoped token via refresh token — required for /items endpoint. */
async function getUserAccessToken(): Promise<string> {
  if (cachedUserToken && Date.now() < cachedUserToken.expires_at - 60_000) {
    return cachedUserToken.access_token;
  }

  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error(
      "Missing SPOTIFY_REFRESH_TOKEN — required to fetch playlist tracks. " +
        "Get one via the Spotify Authorization Code flow with scopes: playlist-read-private, playlist-read-collaborative.",
    );
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Spotify refresh-token error: ${res.status} ${err}`);
  }

  const data = await res.json();
  cachedUserToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  return cachedUserToken.access_token;
}

/**
 * Extract playlist ID from any Spotify URL or URI format.
 *
 * Supported formats:
 *   https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
 *   https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc123
 *   spotify:playlist:37i9dQZF1DXcBWIGoYBM5M
 *   open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
 */
export function extractPlaylistId(input: string): string | null {
  const trimmed = input.trim();

  // spotify:playlist:ID
  const uriMatch = trimmed.match(/spotify:playlist:([a-zA-Z0-9]{22})/);
  if (uriMatch) return uriMatch[1];

  // Any URL containing /playlist/ID (handles http, https, bare domains, query params)
  const urlMatch = trimmed.match(/playlist\/([a-zA-Z0-9]{22})/);
  if (urlMatch) return urlMatch[1];

  return null;
}

/** Returns true if the input looks like a Spotify playlist link (loose pre-check). */
export function looksLikeSpotifyPlaylist(input: string): boolean {
  const lower = input.trim().toLowerCase();
  return lower.includes("spotify") && lower.includes("playlist");
}

export interface SpotifyTrack {
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  previewUrl: string | null;
}

export interface SpotifyPlaylistInfo {
  id: string;
  name: string;
  description: string;
  image: string; // largest available album/playlist art URL
  owner: string;
  trackCount: number;
}

/** Fetch playlist metadata (name, art, track count) without pulling all tracks. */
export async function getPlaylistInfo(playlistId: string): Promise<SpotifyPlaylistInfo> {
  const token = await getAccessToken();

  const response = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Spotify API error: ${response.status} ${err}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await response.json();

  return {
    id: data.id,
    name: data.name,
    description: data.description ?? "",
    image: data.images?.[0]?.url ?? "",
    owner: data.owner?.display_name ?? "Unknown",
    trackCount: data.tracks?.total ?? 0,
  };
}

/**
 * Fetch tracks from a Spotify playlist.
 * Pass `maxTracks` to stop early (e.g. 1 for a preview count check).
 */
export async function getPlaylistTracks(
  playlistId: string,
  options?: { maxTracks?: number },
): Promise<SpotifyTrack[]> {
  const token = await getUserAccessToken();
  const tracks: SpotifyTrack[] = [];
  const max = options?.maxTracks ?? Infinity;

  const params = new URLSearchParams({
    limit: String(Math.min(max, 50)),
    // total is included so callers can read the real count from page.total
    fields:
      "next,total,items(item(name,artists(name),album(name,images(url)),preview_url,type),track(name,artists(name),album(name,images(url)),preview_url,type))",
  });

  // Optional: set SPOTIFY_MARKET in .env to restrict to a country (e.g. US, GB)
  const market = process.env.SPOTIFY_MARKET;
  if (market) params.set("market", market);

  let url: string | null =
    `https://api.spotify.com/v1/playlists/${playlistId}/items?${params}`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Spotify API error: ${res.status} ${err}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const page: any = await res.json();
    for (const entry of page.items) {
      // Spotify now uses `item` (TrackObject or EpisodeObject); `track` is deprecated
      const t = entry.item ?? entry.track;
      if (!t || t.type === "episode") continue;
      tracks.push({
        name: t.name,
        artist: t.artists?.map((a: { name: string }) => a.name).join(", ") ?? "Unknown",
        album: t.album?.name ?? "Unknown",
        albumArt: t.album?.images?.[0]?.url ?? "",
        previewUrl: t.preview_url ?? null,
      });
    }

    url = page.next ?? null;

    // Stop early if we've hit the max
    if (tracks.length >= max) {
      tracks.length = max;
      break;
    }
  }

  return tracks;
}

/** Search tracks by name + artist (for manual / file-upload flows). */
export async function searchTrack(query: string): Promise<SpotifyTrack | null> {
  const token = await getAccessToken();

  const searchRes = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!searchRes.ok) return null;

  const data = await searchRes.json();
  const t = data.tracks?.items?.[0];
  if (!t) return null;

  return {
    name: t.name,
    artist: t.artists?.map((a: { name: string }) => a.name).join(", ") ?? "Unknown",
    album: t.album?.name ?? "Unknown",
    albumArt: t.album?.images?.[0]?.url ?? "",
    previewUrl: t.preview_url ?? null,
  };
}
