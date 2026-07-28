import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/callback?code=... — Spotify redirects here after user authorizes.
 * Exchanges the code for tokens and displays the refresh token.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return new NextResponse(`<html><body style="font-family:sans-serif;padding:2rem"><h1>Auth denied</h1><p>${error}</p></body></html>`, {
      headers: { "Content-Type": "text/html" },
    });
  }

  if (!code) {
    const loginUrl = "/api/auth/login";
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:2rem"><h1>No code</h1><p><a href="${loginUrl}">Click here to log in with Spotify</a></p></body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:2rem"><h1>Config error</h1><p>Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in .env.local</p></body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: "http://127.0.0.1:3000/api/auth/callback",
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:2rem"><h1>Token error</h1><pre>${JSON.stringify(data, null, 2)}</pre></body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  }

  return new NextResponse(
    `<!DOCTYPE html>
<html>
<body style="font-family:monospace;padding:2rem;background:#0a0a0f;color:#e4e4ed">
<h1 style="color:#6c5ce7">✓ Token obtained!</h1>
<p>Copy this into your <code>.env.local</code>:</p>
<pre style="background:#111;padding:1rem;border-radius:8px;overflow-x:auto">SPOTIFY_REFRESH_TOKEN=${data.refresh_token}</pre>
${data.access_token ? `<p style="color:#666">Access token (just confirming it worked):<br><code style="word-break:break-all">${data.access_token.substring(0, 20)}…</code></p>` : ""}
${data.refresh_token ? "" : '<p style="color:#ef4444">⚠️ No refresh_token in response — you may need to re-authorize. Remove the app from your <a href="https://www.spotify.com/account/apps/" style="color:#6c5ce7">Spotify Apps</a> and try again.</p>'}
</body>
</html>`,
    { headers: { "Content-Type": "text/html" } },
  );
}
