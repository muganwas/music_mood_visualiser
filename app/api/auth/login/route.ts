import { NextResponse } from "next/server";

/**
 * GET /api/auth/login — redirect to Spotify to authorize the app.
 * Scopes: playlist-read-private, playlist-read-collaborative
 */
export function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Missing SPOTIFY_CLIENT_ID" }, { status: 500 });
  }

  const redirectUri = "http://127.0.0.1:3000/api/auth/callback";
  const scope = "playlist-read-private playlist-read-collaborative";

  const url =
    `https://accounts.spotify.com/authorize?` +
    new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope,
    });

  return NextResponse.redirect(url);
}
