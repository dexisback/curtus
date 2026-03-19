## this file contains what this project is about and where is it gonna go:
# MotionVault

> A personal UI research workspace. Save, study, annotate, and understand any UI interaction you find on the internet.

---

## What Is This

You find a beautiful product interaction on Twitter. A smooth onboarding flow on a competitor's app. An animation on a Dribbble shot someone screen-recorded. Right now you screenshot it messily, dump it in a Notion doc with a vague title, and forget it exists in 3 days.

MotionVault is where you bring it instead.

Upload the screen recording. Watch it in a focused, distraction-free player. Scrub through frame by frame. Capture the exact moments that matter with one click. Write timestamped notes anchored to specific moments in the video. Get a high-level AI "vibe brief" describing the UI language, layout patterns, and interaction feel. Save everything to your personal vault. Search across everything you've ever saved. Share a vault entry with a teammate or on Twitter.

It is not a Dribbble clone. It is not a browsing product. There is no feed, no public discovery, no social following. It is a focused personal tool — the kind you open with a specific video in mind and close having actually understood it.

---

## The Problem

There is no dedicated tool for "I found a UI reference, let me properly process and store it."

- Screenshots in a folder: untagged, unsearchable, no context
- Notion: too generic, no video support, notes disconnected from the actual moment in the video
- Mobbin / Dribbble: curated by someone else, you can only save what they have
- Your browser bookmarks: a graveyard

MotionVault is the dedicated home for this workflow that currently has no home.

---

## Who This Is For

Frontend developers and designers who:
- Use Cursor, v0, Lovable, or Framer to build UI
- Collect inspiration actively but lose it passively
- Want to brief an AI agent or a designer with something more precise than "make it feel like Stripe"
- Study UI interactions the way musicians study songs — by pulling them apart

---

## The /home Page — What Lives Here

The `/home` page is the core of the entire product. Everything else (Library, History, Settings) is secondary. This is where the actual work happens.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [x]  hi, amaan                              [profile avatar]   │
│                                                                 │
│  Dashboard                                                      │
│  Library                    ┌──────────────────────────┐        │
│  History                    │                          │        │
│  Settings                   │    [ video player ]      │        │
│                             │                          │        │
│                             │   drop or upload a video │        │
│                             │                          │        │
│                             │  ▶ ─────────────────── │        │
│                             └──────────────────────────┘        │
│                                                                 │
│              [ Dashboard | Library | History |                  │
│                Camera | Notes | AI | Theme ]                    │
│                                                                 │
│  [N] + Create New                                               │
└─────────────────────────────────────────────────────────────────┘
```

### The Video Player (Hero Element)

The central, dominant element of the page. Neumorphic card design with subtle shadow and rounded corners. Two screw/pin details in top corners — purely decorative, adds character.

**Empty state:** "drop or upload a video" centered in the dark player. Accepts drag-and-drop or click to upload.

**Loaded state:**
- Full video playback with custom controls
- A custom timeline scrubber — not the browser default. Clicking any point on the scrubber both seeks to that timestamp AND opens a capture/note prompt at that exact moment. This is the core interaction that makes the product feel purpose-built.
- Captured frame markers appear as small dots on the scrubber timeline — you can see at a glance which moments you've annotated
- Frame-by-frame stepping with arrow keys (←/→ steps one frame at a time)
- Playback speed control (0.25x, 0.5x, 1x, 2x) — critical for studying fast animations

**What the player does NOT have:**
- No volume slider (screen recordings rarely have audio worth controlling)
- No fullscreen (defeats the purpose of the side-by-side workspace)
- No subtitles, no chapters, no YouTube-style features

### The Floating Pill Toolbar

Sits below the video player, horizontally centered. Pill-shaped container with 7 icon actions. Each icon has a tooltip on hover. The active/selected state has a subtle highlight.

**Icon 1 — Dashboard (grid icon)**
Returns to the home state. Clears the current video and shows the empty player with upload prompt.

**Icon 2 — Library (bars icon)**
Opens a slide-in panel from the right showing all saved vault entries. Each entry shows: video thumbnail (first captured frame), title, number of captures, number of notes, date saved, tags. Clicking an entry loads that video into the player and restores all its captures and notes.

**Icon 3 — History (clock icon)**
Shows recently opened vault entries in chronological order. Quick-access to the last 10 things you worked on.

**Icon 4 — Capture (camera icon)**
Pauses the video at the current timestamp and saves that exact frame to the current vault entry. A thumbnail of the captured frame appears in the captures panel. This is the manual capture action — the user decides what matters.

**Icon 5 — Notes (edit/pen icon)**
Opens a notes panel anchored to the current video timestamp. The note is saved with the exact timestamp — when you click a note later, the video seeks to that moment automatically. Markdown supported in notes.

**Icon 6 — AI Sparkle (stars icon)**
Triggers the Gemini analysis job on the full video. Shows a real-time processing state (via WebSocket) — not a spinner, but a live status: "Analysing layout structure... Identifying interaction patterns... Generating vibe brief..." Output is a structured markdown document with sections:
- **Layout Language** — what kind of UI is this (dashboard, landing page, onboarding, etc.)
- **Component Patterns** — what UI components appear (sidebar, modal, cards, etc.)
- **Colour & Typography** — general colour language, font weight usage, spacing feel
- **Interaction Feel** — how do things move, what's the overall animation personality
- **Vibe Brief** — one paragraph you can paste directly into Cursor or give to a designer

**Icon 7 — Theme toggle (sun/moon icon)**
Switches between light and dark mode. The neumorphic player adapts to both.

### The Captures Panel

When captures exist for the current video, a horizontal filmstrip appears between the video player and the toolbar. Scrollable left/right. Each frame shows: the captured image, the timestamp it was captured at, a small note indicator if a note is attached. Clicking a frame seeks the video to that timestamp.

### The Notes Panel

Slides in from the right when Notes is active. Shows all timestamped notes for the current video in chronological order. Each note shows: timestamp (clickable — seeks video), note content (markdown rendered), edit/delete controls. New note input at the top anchored to current playback position.

### The AI Brief Panel

Slides in from the right after Gemini analysis completes. Shows the structured markdown vibe brief. Has a "Copy to clipboard" button at the top. Has a "Regenerate" button. The brief is saved permanently with the vault entry.

### The "Create New" Button

Bottom left of the sidebar. Opens a modal to start a new vault entry — give it a title, add tags, then upload the video. Title and tags can be edited later.

---

## Other Pages

### /library
Full vault view. Grid of all saved entries. Filter by tags. Sort by date, number of captures, recently opened. Full-text search across titles, notes, and AI briefs. Each card shows: thumbnail, title, tags, capture count, note count, date.

### /vault/[slug]
Public shareable page for a vault entry. Shows the video (if still available), all captured frames in a filmstrip, all notes, and the AI brief. Read-only. Anyone with the link can view. The user controls whether a vault entry is public or private.

### /history
Chronological log of every vault entry opened, with timestamps. Filterable by date range.

### /settings
Account settings, API usage (Gemini calls used this month), storage used (R2), notification preferences, danger zone (delete account).

### /login and /signup
Clean auth pages. Google OAuth + email/password. JWT-based sessions.

### / (Landing Page)
Marketing page. Hero with a demo video of the product in use. Three feature sections: Capture, Annotate, Understand. A "Start for free" CTA. No pricing page for v1 — fully free.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL via Neon |
| ORM | Prisma |
| Auth | NextAuth.js (Google OAuth + credentials) |
| File Storage | Cloudflare R2 |
| Upload | Chunked upload system (already built) |
| Background Jobs | BullMQ + Redis (Upstash) |
| Real-time | WebSockets (job progress, live status) |
| AI | Gemini 1.5 Pro (multimodal video analysis) |
| Caching | Redis (Upstash) |
| Deployment | Vercel |
| Cron | Vercel Cron (R2 cleanup) |
| Styling | Tailwind CSS |
| Validation | Zod |

---

## Backend Architecture

### Upload Flow
```
Client → Chunked Upload → R2 (raw video stored)
                       → Postgres (vault entry created, R2 key saved)
                       → BullMQ job queued (post-upload processing)
```

### Processing Job (BullMQ)
```
Job starts
→ Extract first frame (thumbnail for library card)
→ Store thumbnail in R2
→ Update vault entry status to "ready"
→ WebSocket emits "processing_complete" to client
```

### AI Analysis Flow (on demand, not automatic)
```
User clicks AI sparkle
→ BullMQ job queued
→ WebSocket emits job stages live to client
→ Gemini 1.5 Pro receives video file
→ Structured prompt returns markdown sections
→ Zod validates response shape
→ Saved to Postgres on vault entry
→ WebSocket emits "analysis_complete"
→ Brief panel opens automatically
```

### Shareable Slug Flow
```
Each vault entry gets a nanoid slug on creation
/vault/[slug] is public if entry.isPublic = true
Slug is permanent — does not change if title changes
```

---

## Database Schema (High Level)

**User** — id, email, name, avatar, createdAt

**VaultEntry** — id, userId, title, slug, r2Key, thumbnailKey, status, isPublic, vibeBrief, tags, createdAt, updatedAt

**CapturedFrame** — id, vaultEntryId, r2Key, timestampMs, createdAt

**Note** — id, vaultEntryId, userId, content, timestampMs, createdAt, updatedAt

**Tag** — id, name, userId (tags are per-user, not global)

**VaultEntryTag** — vaultEntryId, tagId (join table)

---

## What Makes This Non-CRUD

1. **Chunked resumable upload** — not a simple file input, handles large videos reliably
2. **BullMQ async processing pipeline** — upload and analysis are background jobs, not blocking API calls
3. **WebSocket real-time progress** — live job status streamed to client, not polling
4. **Custom video scrubber** — frame-accurate seeking with capture markers on timeline
5. **Multimodal Gemini pipeline** — structured, Zod-validated multi-section output, not a raw API call
6. **Full-text search** — across notes and AI briefs, not just titles

---

## V1 Scope (What's Included)

- [x] Auth (Google OAuth + email)
- [x] Video upload (chunked → R2)
- [x] Video playback with custom scrubber
- [x] Manual frame capture at timestamp
- [x] Timestamped notes with markdown
- [x] Gemini vibe brief generation
- [x] Personal vault / library
- [x] Tags and search
- [x] Shareable public slug
- [x] Real-time job progress via WebSocket
- [x] Landing page

## What's Explicitly Deferred

- [ ] Auto scene-change detection (flaky on UI recordings, add in v2)
- [ ] R2 file cleanup cron (add before launch)
- [ ] Video compression / transcoding
- [ ] Team vaults / collaboration
- [ ] Browser extension for one-click capture from any tab
- [ ] Mobile responsive (desktop-first for v1)
