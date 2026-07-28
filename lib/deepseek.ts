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
- palette: array of 5 hex colour codes that match the mood
- keywords: array of 5-8 words or short phrases that capture the vibe

Respond with ONLY the JSON object, no markdown or extra text.`;

export async function analyzeMood(songs: { name: string; artist: string }[]): Promise<MoodAnalysis> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("Missing DEEPSEEK_API_KEY env var");

  const songList = songs
    .map((s) => `"${s.name}" by ${s.artist}`)
    .join("\n");

  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
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
