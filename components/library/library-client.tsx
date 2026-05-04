"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ExternalLink, Pencil, Pause, Play, Plus, Waves, Youtube } from "lucide-react";
import YouTubeEmbedPanel from "@/features/dashboard/components/youtube-embed-panel";
import { parseYouTubeInput } from "@/lib/youtube";
import { writeDashboardLecture } from "@/lib/dashboard-lecture";
import { useWhiteNoise } from "@/components/white-noise-provider";
import { DEVELOPER_LIKES_AMBIENT, FEATURED_AMBIENT, type WhiteNoiseToneId } from "@/lib/ambient-sounds";

export type LibraryItemView = {
  id: string;
  url: string;
  mediaKind: "VIDEO" | "PLAYLIST";
  videoId: string | null;
  playlistId: string | null;
  title: string | null;
  createdAtIso: string;
  updatedAtIso: string;
  embedUrl: string | null;
};

type AddResponse = {
  item: {
    id: string;
    url: string;
    mediaKind: "VIDEO" | "PLAYLIST";
    videoId: string | null;
    playlistId: string | null;
    title: string | null;
    createdAt: string;
    updatedAt: string;
    embedUrl: string | null;
  };
};

function shortLabel(item: LibraryItemView) {
  if (item.mediaKind === "PLAYLIST") return `Playlist ${item.playlistId ?? ""}`.trim();
  return `Video ${item.videoId ?? ""}`.trim();
}

function displayLabel(item: LibraryItemView) {
  const t = item.title?.trim();
  if (t) return t;
  return shortLabel(item);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function LibraryClient({ initialItems }: { initialItems: LibraryItemView[] }) {
  const router = useRouter();
  const { currentTone, isPlaying, previewSoundId, initAudio, setTone, playTone, playDeveloperPreview } =
    useWhiteNoise();
  const [items, setItems] = useState<LibraryItemView[]>(initialItems);
  const [activeId, setActiveId] = useState<string | null>(initialItems[0]?.id ?? null);
  const [urlInput, setUrlInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRawUrl, setPreviewRawUrl] = useState("");
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [titleBusyId, setTitleBusyId] = useState<string | null>(null);

  const active = useMemo(
    () => items.find((item) => item.id === activeId) ?? items[0] ?? null,
    [activeId, items],
  );

  function openPreview() {
    const raw = urlInput.trim();
    if (!raw) return;
    if (!parseYouTubeInput(raw)) {
      setError("Please enter a valid YouTube video or playlist URL.");
      return;
    }
    setPreviewRawUrl(raw);
    setPreviewOpen(true);
    setError(null);
  }

  async function confirmAddFromPreview() {
    if (busy) return;
    const raw = previewRawUrl.trim();
    if (!raw) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: raw }),
      });
      const json = (await res.json()) as AddResponse & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not save this URL.");
        return;
      }
      const next: LibraryItemView = {
        id: json.item.id,
        url: json.item.url,
        mediaKind: json.item.mediaKind,
        videoId: json.item.videoId,
        playlistId: json.item.playlistId,
        title: json.item.title ?? null,
        createdAtIso: json.item.createdAt,
        updatedAtIso: json.item.updatedAt,
        embedUrl: json.item.embedUrl,
      };
      setItems((prev) => [next, ...prev]);
      setActiveId(next.id);
      setUrlInput("");
      setPreviewOpen(false);
      setPreviewRawUrl("");
    } catch {
      setError("Could not save this URL.");
    } finally {
      setBusy(false);
    }
  }

  async function openItem(id: string) {
    setEditingTitleId(null);
    setDraftTitle("");
    setActiveId(id);
    setItems((prev) => {
      const found = prev.find((x) => x.id === id);
      if (!found) return prev;
      const bumped = { ...found, updatedAtIso: new Date().toISOString() };
      return [bumped, ...prev.filter((x) => x.id !== id)];
    });
    try {
      await fetch(`/api/library/${id}`, { method: "PATCH" });
    } catch {
      // Keep optimistic ordering even if this fails.
    }
  }

  function selectForDashboard(item: LibraryItemView) {
    if (!item.embedUrl) return;
    writeDashboardLecture({
      id: item.id,
      embedUrl: item.embedUrl,
      url: item.url,
      label: displayLabel(item),
    });
    router.push("/dashboard");
  }

  function beginEditTitle(item: LibraryItemView) {
    setEditingTitleId(item.id);
    setDraftTitle(displayLabel(item));
  }

  function cancelTitleEdit() {
    setEditingTitleId(null);
    setDraftTitle("");
  }

  async function saveTitle(itemId: string) {
    if (titleBusyId) return;
    setTitleBusyId(itemId);
    try {
      const res = await fetch(`/api/library/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: draftTitle }),
      });
      const json = (await res.json()) as { ok?: boolean; title?: string | null; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not update title.");
        return;
      }
      const nextTitle = json.title !== undefined ? json.title : draftTitle.trim() || null;
      setItems((prev) => prev.map((x) => (x.id === itemId ? { ...x, title: nextTitle } : x)));
      setEditingTitleId(null);
      setDraftTitle("");
      setError(null);
    } catch {
      setError("Could not update title.");
    } finally {
      setTitleBusyId(null);
    }
  }

  const previewEmbed = previewOpen ? parseYouTubeInput(previewRawUrl)?.embedUrl ?? null : null;
  async function activateTone(tone: WhiteNoiseToneId) {
    void initAudio();
    if (isPlaying) await setTone(tone);
    else await playTone(tone);
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-5 overflow-y-auto overflow-x-hidden px-5 pb-10 pt-8 sm:px-6 sm:pt-10">
      <section
        className="rounded-2xl border border-border/50 bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] p-4
          shadow-[0_1px_2px_rgba(17,24,39,0.04),0_6px_18px_rgba(17,24,39,0.07)]"
      >
        <div className="flex flex-wrap items-end gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Library</p>
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  openPreview();
                }
              }}
              placeholder="Paste YouTube video or playlist URL"
              className="h-10 w-full rounded-lg border border-border/70 bg-background px-3 text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/45"
            />
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={openPreview}
            disabled={busy || !urlInput.trim()}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-cta px-3.5 text-[11.5px] font-medium text-cta-foreground shadow-[0_1px_3px_rgba(17,24,39,0.1)] disabled:opacity-55"
          >
            <Plus size={14} />
            {busy ? "Adding…" : "Add URL"}
          </motion.button>
        </div>
        {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2.4fr)_minmax(20rem,1fr)] xl:items-start">
        <section
          className="rounded-2xl border border-border/50 bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] p-3
            shadow-[0_1px_2px_rgba(17,24,39,0.04),0_6px_18px_rgba(17,24,39,0.07)]"
        >
          <div className="rounded-xl bg-background p-2">
            <YouTubeEmbedPanel
              embedUrl={active?.embedUrl ?? null}
              large
              emptyHint="Add a YouTube URL above to watch here."
            />
          </div>
        </section>

        <section
          className="rounded-2xl border border-border/50 bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] p-3
            shadow-[0_1px_2px_rgba(17,24,39,0.04),0_6px_18px_rgba(17,24,39,0.07)]"
        >
          <div className="flex flex-col rounded-xl bg-background p-3">
            <p className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Saved links
            </p>
            <div className="space-y-2 pr-0.5">
              <AnimatePresence initial={false}>
                {items.map((item) => {
                  const activeRow = item.id === active?.id;
                  return (
                    <motion.div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => void openItem(item.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          void openItem(item.id);
                        }
                      }}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2, ease: [0, 0, 0.58, 1] }}
                      whileTap={{ scale: 0.985 }}
                      className={
                        "w-full rounded-lg border px-3 py-2.5 text-left transition-colors " +
                        (activeRow
                          ? "border-cta/40 bg-cta/10"
                          : "border-border/50 bg-card/65 hover:bg-accent/55")
                      }
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {editingTitleId === item.id ? (
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <Youtube size={14} className="shrink-0 text-red-500" aria-hidden />
                              <input
                                autoFocus
                                value={draftTitle}
                                onChange={(e) => setDraftTitle(e.target.value)}
                                maxLength={200}
                                disabled={titleBusyId === item.id}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    void saveTitle(item.id);
                                  }
                                  if (e.key === "Escape") {
                                    e.preventDefault();
                                    cancelTitleEdit();
                                  }
                                }}
                                className="min-w-0 flex-1 rounded-md border border-border/70 bg-background px-2 py-1 text-[11.5px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring/45"
                              />
                            </div>
                          ) : (
                            <div className="flex min-w-0 items-center gap-1.5 text-[11.5px] font-medium text-foreground">
                              <Youtube size={14} className="shrink-0 text-red-500" aria-hidden />
                              <span className="min-w-0 truncate">{displayLabel(item)}</span>
                            </div>
                          )}
                          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{item.url}</p>
                        </div>
                        <div
                          className="flex shrink-0 items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
                            {formatDate(item.updatedAtIso)}
                          </span>
                          {editingTitleId !== item.id ? (
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.96 }}
                              onClick={() => beginEditTitle(item)}
                              className="-m-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
                              aria-label="Edit title"
                            >
                              <Pencil size={12} strokeWidth={1.75} />
                            </motion.button>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Play size={10} />
                          Resume
                        </span>
                        <div className="flex items-center gap-2">
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.96 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              selectForDashboard(item);
                            }}
                            className="inline-flex h-6 items-center rounded-md border border-border/60 bg-background px-2 text-[10px] font-medium text-foreground hover:bg-accent/55"
                          >
                            Watch on dashboard
                          </motion.button>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 hover:text-foreground"
                          >
                            Open
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {items.length === 0 && (
                <div className="flex min-h-[10rem] items-center justify-center rounded-lg border border-dashed border-border/60 text-center">
                  <p className="px-6 text-[11px] text-muted-foreground">
                    No links yet. Add a YouTube URL above and it will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <section
        className="rounded-2xl border border-border/50 bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] p-3
          shadow-[0_1px_2px_rgba(17,24,39,0.04),0_6px_18px_rgba(17,24,39,0.07)]"
      >
        <div className="rounded-xl bg-background p-3">
          <p className="mb-2 inline-flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            <Waves size={12} />
            Sound Library
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {FEATURED_AMBIENT.map((sound) => {
              const active =
                Boolean(sound.tone) &&
                currentTone === sound.tone &&
                isPlaying &&
                previewSoundId === null;
              return (
                <motion.button
                  key={sound.id}
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    if (sound.tone) void activateTone(sound.tone);
                  }}
                  className={
                    "flex h-12 items-center justify-center rounded-lg border px-3 text-[11px] font-medium transition-colors " +
                    (active
                      ? "border-cta/45 bg-cta/10 text-foreground"
                      : "border-border/60 bg-card/65 text-foreground/85 hover:bg-accent/55")
                  }
                >
                  {sound.label}
                </motion.button>
              );
            })}
          </div>

          <p className="mt-4 mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            the developer likes these sounds
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {DEVELOPER_LIKES_AMBIENT.map((sound) => (
              <div
                key={sound.id}
                className="flex min-h-[2.75rem] items-center justify-between rounded-lg border border-border/55 bg-card/60 px-3 py-2.5"
              >
                <span className="truncate pr-2 text-[10.5px] text-foreground/85">{sound.label}</span>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => void playDeveloperPreview(sound.id, sound.fileName)}
                  className="inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-border/60 bg-background text-foreground/85 hover:bg-accent/55"
                  aria-label={`Preview ${sound.label}`}
                >
                  {previewSoundId === sound.id ? <Pause size={12} /> : <Play size={12} />}
                </motion.button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {previewOpen && (
          <motion.div
            className="fixed inset-0 z-[140] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0, 0, 0.58, 1] }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !busy) {
                setPreviewOpen(false);
              }
            }}
          >
            <div className="absolute inset-0 bg-background/45 backdrop-blur-sm" />
            <motion.div
              initial={{ y: 8, opacity: 0, scale: 0.985 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 8, opacity: 0, scale: 0.985 }}
              transition={{ duration: 0.2, ease: [0, 0, 0.58, 1] }}
              className="relative z-10 w-full max-w-4xl overflow-hidden rounded-2xl border border-border/50 bg-card/95 p-3 shadow-[0_12px_40px_rgba(17,24,39,0.14)]"
            >
              <p className="mb-2 text-[12px] font-medium text-foreground">Preview before saving</p>
              <div className="rounded-xl bg-background p-2">
                <YouTubeEmbedPanel embedUrl={previewEmbed} large />
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="rounded-lg border border-border/70 bg-background px-3 py-2 text-[11px] font-medium text-foreground"
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void confirmAddFromPreview()}
                  disabled={busy}
                  className="rounded-lg bg-cta px-3 py-2 text-[11px] font-medium text-cta-foreground disabled:opacity-60"
                >
                  {busy ? "Adding…" : "Save to library"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// — Library page UI: add URL, watch YouTube embed, and resume from saved links.
