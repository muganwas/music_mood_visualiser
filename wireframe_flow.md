🖼️ Wireframe Outline
1. Landing Page

Header: “AI Music Moodboard”

CTA: “Upload Playlist” / “Paste Link”

Preview: Example moodboard thumbnail (to spark curiosity)

Footer: About + Tech credits

2. Playlist Input Screen

Option A: Paste Spotify/YouTube playlist link (auto-detected, preview before analyze)

Option B: Upload CSV/text list of songs — see §7 for parsing & matching

Option C: Manual entry (add songs one by one) — see §7 for unmatched handling

Button: “Analyze My Playlist”

3. Analysis Loading Screen

Animated progress bar with text like:
“Extracting lyrical themes…”  
“Detecting audio moods…”  
“Generating palette suggestions…”

4. Moodboard Results Screen

Main Canvas: Collage layout with:

Album covers / abstract textures

Color palette swatches

Typography samples (lyrics snippets, keywords)

Sidebar:

Mood summary (e.g., “Angsty optimism”)

Top 3 lyrical themes (e.g., rebellion, nostalgia, love)

Audio profile (tempo, energy, danceability)

5. Interaction Options

Hover: See which song inspired each element

Style Switcher: Dropdown (grunge, neon, minimalist, pastel)

Regenerate Button: “Try a new variation”

6. Export Screen

Options:

Download PNG/SVG moodboard

Export responsive banner set (desktop/mobile)

Affinity‑ready layered file (optional advanced feature)

---

## 7. File Upload & Manual Entry — Song Matching

### File Upload Flow

1. **Drag & drop or browse** for `.csv` or `.txt` files.
2. **CSV parsing**: Headers named `Track`/`Title`/`Song`/`Name` and `Artist`/`By`/`Performer` are auto-mapped. Album column is ignored. Quoted fields with commas are supported.
3. **Plain text fallback**: Lines parsed as `Artist – Title` (supports both `–` em-dash and `-` regular dash). Header rows like `Title` or `#` are auto-skipped.
4. **Artist resolution**: Songs without an artist show an amber input placeholder. Click **"Find artists"** to search Spotify for each missing artist.
   - **Confirmed match**: Spotify suggestion shown with ✅/✕ buttons. Click ✅ to accept, ✕ to reject.
   - **Not found**: Songs that return no Spotify results are flagged with a ⚠️ icon and `notFound: true`.
   - Songs without an artist and without a confirmed match **cannot** proceed to analysis.
5. **Unmatched songs on retry**: After a failed analysis (422), the parent passes `unmatchedSongs` back down. Rows matching those song titles get a red highlight ring and amber text so the user knows exactly which songs to fix.

### Manual Entry Flow

1. **One input at a time** — typing in the last row and pressing Enter or tabbing away reveals the next empty input.
2. **Analyze button suppression**: Clicking "Analyze N Songs" uses `onMouseDown` + an `ignoreNextBlur` ref flag so the blur event does not add a spurious empty row during analysis.
3. **Unmatched highlighting**: After a 422 response, `unmatchedSongs` is passed to `SongList`. Any input whose trimmed text matches an unmatched entry gets:
   - Red border (`border-red-500/50`)
   - Red-tinted background (`bg-red-500/10`)
   - Placeholder text changes to `"Not found — check title"`

### Analysis Blocking (422)

- The `/api/analyze` endpoint returns **HTTP 422** when any file or manual song has no artist.
- The response body includes `{ unmatched: ["Song Title A", "Song Title B"] }`.
- The UI **stops at the input stage** — the moodboard is never reached with incomplete data.
- After fixing the flagged songs (correcting titles, accepting Spotify matches, or removing them), the user can re-submit.

### Playlist History Behavior

- Playlists are **only saved to localStorage after a successful analysis** (HTTP 200, no error, no unmatched). Failed/blocked analyses never persist.
- **Link playlists**: Preview info is cached in a ref; only committed on success.
- **File playlists**: Saved with `fingerprint` (hash of sorted song names) for deduplication.
- **Delete**: Each chip has a visible ✕ button (not hover-only — works on touch devices).
- **Clear all**: Removes all saved history at once.