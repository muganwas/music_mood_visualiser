export interface UserCredentials {
  spotifyClientId: string;
  spotifyClientSecret: string;
  spotifyRefreshToken: string;
  spotifyMarket: string;
  deepseekApiKey: string;
  youtubeApiKey: string;
}

export type CredentialKey = keyof UserCredentials;

export const CREDENTIAL_LABELS: Record<CredentialKey, string> = {
  spotifyClientId: "Spotify Client ID",
  spotifyClientSecret: "Spotify Client Secret",
  spotifyRefreshToken: "Spotify Refresh Token",
  spotifyMarket: "Spotify Market (optional, e.g. US)",
  deepseekApiKey: "DeepSeek API Key",
  youtubeApiKey: "YouTube API Key",
};

export const CREDENTIAL_HELP: Record<CredentialKey, string> = {
  spotifyClientId: "From your Spotify Developer Dashboard app",
  spotifyClientSecret: "From your Spotify Developer Dashboard app",
  spotifyRefreshToken: "Get it via /api/auth/login (one-time setup)",
  spotifyMarket: "ISO 3166-1 alpha-2 code — restricts results to a country",
  deepseekApiKey: "From platform.deepseek.com → API Keys",
  youtubeApiKey: "From Google Cloud Console → APIs & Services",
};

export const EMPTY_CREDENTIALS: UserCredentials = {
  spotifyClientId: "",
  spotifyClientSecret: "",
  spotifyRefreshToken: "",
  spotifyMarket: "",
  deepseekApiKey: "",
  youtubeApiKey: "",
};
