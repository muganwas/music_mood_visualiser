/**
 * Spotify API helper.
 * - Client Credentials for public playlist metadata.
 * - Refresh Token flow for user-scoped access (required for /items endpoint).
 *
 * Credentials are passed explicitly (from user's browser localStorage via headers)
 * with fallback to SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET / SPOTIFY_REFRESH_TOKEN env vars.
 */

const TOKEN_URL = "https://accounts.spotify.com/api/token";

export interface SpotifyCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken?: string;
  market?: string;
}

/** Extract Spotify credentials from headers (user-provided) or env vars (host-provided). */
export function getSpotifyCredentials(headers: Headers): SpotifyCredentials {
  return {
    clientId: headers.get("x-spotify-client-id") || process.env.SPOTIFY_CLIENT_ID || "",
    clientSecret: headers.get("x-spotify-client-secret") || process.env.SPOTIFY_CLIENT_SECRET || "",
    refreshToken: headers.get("x-spotify-refresh-token") || process.env.SPOTIFY_REFRESH_TOKEN || "",
    market: headers.get("x-spotify-market") || process.env.SPOTIFY_MARKET || "",
  };
}

// Simple token cache keyed by clientId
const tokenCache = new Map<string, { access_token: string; expires_at: number }>();

function cacheKey(creds: SpotifyCredentials, type: "client" | "user"): string {
  return `${creds.clientId}:${type}`;
}

function basicAuth(creds: SpotifyCredentials): string {
  if (!creds.clientId || !creds.clientSecret) {
    throw new Error("Missing Spotify client ID or secret. Add them in Settings.");
  }
  return Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64");
}

async function getAccessToken(creds: SpotifyCredentials): Promise<string> {
  const key = cacheKey(creds, "client");
  const cached = tokenCache.get(key);
  if (cached && Date.now() < cached.expires_at - 60_000) return cached.access_token;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth(creds)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Spotify auth error: ${res.status} ${err}`);
  }

  const data = await res.json();
  tokenCache.set(key, {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  });

  return data.access_token;
}

async function getUserAccessToken(creds: SpotifyCredentials): Promise<string> {
  const key = cacheKey(creds, "user");
  const cached = tokenCache.get(key);
  if (cached && Date.now() < cached.expires_at - 60_000) return cached.access_token;

  if (!creds.refreshToken) {
    throw new Error(
      "Missing Spotify refresh token. Go to Settings and add it, or get one via the Auth flow.",
    );
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth(creds)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: creds.refreshToken,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Spotify refresh error: ${res.status} ${err}`);
  }

  const data = await res.json();
  tokenCache.set(key, {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  });

  return data.access_token;
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
export async function getPlaylistInfo(
  playlistId: string,
  creds: SpotifyCredentials,
): Promise<SpotifyPlaylistInfo> {
  const token = await getAccessToken(creds);

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

/** Fetch all tracks from a Spotify playlist. */
export async function getPlaylistTracks(
  playlistId: string,
  creds: SpotifyCredentials,
): Promise<{ tracks: SpotifyTrack[]; total: number }> {
  const token = await getUserAccessToken(creds);
  const tracks: SpotifyTrack[] = [];

  const params = new URLSearchParams({
    limit: "50",
    fields:
      "next,total,items(item(name,artists(name),album(name,images(url)),preview_url,type),track(name,artists(name),album(name,images(url)),preview_url,type))",
  });

  const market = creds.market || process.env.SPOTIFY_MARKET;
  if (market) params.set("market", market);

  let url: string | null =
    `https://api.spotify.com/v1/playlists/${playlistId}/items?${params}`;
  let total = 0;

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
    if (total === 0) total = page.total ?? 0;

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
  }

  return { tracks, total };
}

/** Search tracks by name + artist (for manual / file-upload flows). */
export async function searchTrack(
  query: string,
  creds: SpotifyCredentials,
): Promise<SpotifyTrack | null> {
  const token = await getAccessToken(creds);

  const searchRes = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=3`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!searchRes.ok) return null;

  const data = await searchRes.json();
  const items = data.tracks?.items ?? [];
  if (items.length === 0) return null;

  // Pick the best match — require at least one shared word between query and result
  const queryWords = query.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 1);

  for (let i = 0; i < Math.min(items.length, 3); i++) {
    const t = items[i] as { name: string; artists: { name: string }[]; album: { name: string; images: { url: string }[] }; preview_url: string | null };
    const nameWords = t.name.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/);
    const shared = queryWords.some((qw) => nameWords.some((nw) => nw === qw || nw.includes(qw) || qw.includes(nw)));
    if (shared || queryWords.length === 0) {
      return {
        name: t.name,
        artist: t.artists?.map((a: { name: string }) => a.name).join(", ") ?? "Unknown",
        album: t.album?.name ?? "Unknown",
        albumArt: t.album?.images?.[0]?.url ?? "",
        previewUrl: t.preview_url ?? null,
      };
    }
  }

  return null; // no reasonable match found
}
