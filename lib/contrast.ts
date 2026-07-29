/**
 * Colour contrast utilities — ensure text is always readable
 * against the app's dark background (#0a0a0f = luminance ~16).
 */

/** Relative luminance (sRGB) — 0 (black) to 255 (white) */
export function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Lighten a hex colour by a factor (0–1) */
export function lighten(hex: string, factor: number): string {
  const r = Math.round(Math.min(255, parseInt(hex.slice(1, 3), 16) + (255 - parseInt(hex.slice(1, 3), 16)) * factor));
  const g = Math.round(Math.min(255, parseInt(hex.slice(3, 5), 16) + (255 - parseInt(hex.slice(3, 5), 16)) * factor));
  const b = Math.round(Math.min(255, parseInt(hex.slice(5, 7), 16) + (255 - parseInt(hex.slice(5, 7), 16)) * factor));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * Ensure a colour is bright enough to be readable on the dark #0a0a0f background.
 * If the colour's luminance is below the threshold, it's blended toward white.
 *
 * @param hex    The original palette colour
 * @param minLum Minimum acceptable luminance (default 100 — ~40 % grey)
 * @returns      A hex colour guaranteed to have luminance ≥ minLum
 */
export function ensureContrast(hex: string, minLum = 100): string {
  let colour = hex;
  // Iteratively lighten until luminance passes the threshold
  for (let i = 0; i < 10; i++) {
    if (luminance(colour) >= minLum) break;
    colour = lighten(colour, 0.3);
  }
  return colour;
}

/**
 * Choose white or dark text based on a background colour's luminance.
 * Used for keyword pills and other solid-colour-background elements.
 */
export function contrastText(hex: string): string {
  return luminance(hex) > 140 ? "#1a1a2e" : "#ffffff";
}
