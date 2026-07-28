/**
 * DeepSeek API helper — sends playlist data and receives mood analysis.
 * Requires DEEPSEEK_API_KEY in .env.local.
 *
 * Uses the DeepSeek Chat API (OpenAI-compatible endpoint).
 */

const DEEPSEEK_BASE = "https://api.deepseek.com/v1";

export interface MoodAnalysis {
  moodSummary: string;
  topThemes: string[];
  audioProfile: {
    tempo: string;
    energy: string;
    danceability: string;
  };
  palette: string[]; // hex colour suggestions
  keywords: string[];
}

const SYSTEM_PROMPT = `You are a music mood analyst. Given a list of songs (title + artist), return a JSON object with:
- moodSummary: a short, evocative phrase (e.g. "angsty optimism")
- topThemes: array of 3 dominant lyrical/musical themes (e.g. ["rebellion", "nostalgia", "love"])
- audioProfile: { tempo: "fast|medium|slow", energy: "high|medium|low", danceability: "high|medium|low" }
- palette: array of 5 hex colour codes that match the mood. Choose colours that strongly reflect the thematic content:
  seduction/desire → deep reds (#8B0000-#DC143C) and purples (#800080-#9932CC)
  romance/love → soft pinks, warm corals, rose golds
  aggression/anger/rage → dark reds to maroon (#8B0000, #800020, #4A0000)
  swagger/confidence/bravado → black, dark navy (#0a0a1a, #1a1a2e, #0f0f2e), or deep purple-black
  rebellion/defiance → fiery oranges and bold reds
  melancholy/sadness → muted blues and cool greys
  joy/celebration/euphoria → bright yellows, golds, vibrant pinks
  nostalgia/sentiment → warm ambers, sepia tones, dusty rose
  Prefer vibrant, mid-to-bright colours. Reserve very dark or near-black shades (e.g. #1a1a1a, #0d0d0d) strictly for swagger/confidence, heavy metal, industrial, or deeply melancholic themes.
- keywords: array of 5-8 words or short phrases that capture the vibe. Each keyword's emotional weight should correspond to a palette colour — darker keywords map to darker palette entries, energetic/bright keywords to vibrant palette entries.

Respond with ONLY the JSON object, no markdown or extra text.`;

export async function analyzeMood(
  songs: { name: string; artist: string }[],
  apiKey?: string,
): Promise<MoodAnalysis> {
  const key = apiKey || process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("Missing DeepSeek API key. Add it in Settings.");

  const songList = songs
    .map((s) => `"${s.name}" by ${s.artist}`)
    .join("\n");

  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Analyse this playlist:\n${songList}` },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? "";
  return JSON.parse(raw.trim()) as MoodAnalysis;
}
