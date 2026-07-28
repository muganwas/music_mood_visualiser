/**
 * Spotify API helper — uses Client Credentials flow for server-side requests.
 * Requires SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env.local.
 */

const TOKEN_URL = "https://accounts.spotify.com/api/token";

let cachedToken: { access_token: string; expires_at: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at - 60_000) {
    return cachedToken.access_token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET env vars");
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Spotify token error: ${res.status} ${err}`);
  }

  const data = await res.json();
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.access_token;
}

/**
 * Extract playlist ID from a Spotify URL.
 * e.g. https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M → 37i9dQZF1DXcBWIGoYBM5M
 */
export function extractPlaylistId(url: string): string | null {
  const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

export interface SpotifyTrack {
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  previewUrl: string | null;
}

/** Fetch all tracks from a Spotify playlist. */
export async function getPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]> {
  const token = await getAccessToken();
  const tracks: SpotifyTrack[] = [];
  let url: string | null = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`;

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
    for (const item of page.items) {
      const t = item.track;
      if (!t) continue;
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
