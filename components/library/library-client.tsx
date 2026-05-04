"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ExternalLink, Play, Plus, Youtube } from "lucide-react";
import YouTubeEmbedPanel from "@/features/dashboard/components/youtube-embed-panel";
import { parseYouTubeInput } from "@/lib/youtube";
import { writeDashboardLecture } from "@/lib/dashboard-lecture";

export type LibraryItemView = {
  id: string;
  url: string;
  mediaKind: "VIDEO" | "PLAYLIST";
  videoId: string | null;
  playlistId: string | null;
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
    createdAt: string;
    updatedAt: string;
    embedUrl: string | null;
  };
};

function shortLabel(item: LibraryItemView) {
  if (item.mediaKind === "PLAYLIST") return `Playlist ${item.playlistId ?? ""}`.trim();
  return `Video ${item.videoId ?? ""}`.trim();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function LibraryClient({ initialItems }: { initialItems: LibraryItemView[] }) {
  const router = useRouter();
  const [items, setItems] = useState<LibraryItemView[]>(initialItems);
  const [activeId, setActiveId] = useState<string | null>(initialItems[0]?.id ?? null);
  const [urlInput, setUrlInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRawUrl, setPreviewRawUrl] = useState("");

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
      label: shortLabel(item),
    });
    router.push("/dashboard");
  }

  const previewEmbed = previewOpen ? parseYouTubeInput(previewRawUrl)?.embedUrl ?? null : null;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden px-5 pb-5 pt-8 sm:px-6 sm:pt-10">
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

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2.4fr)_minmax(20rem,1fr)]">
        <section
          className="min-h-0 rounded-2xl border border-border/50 bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] p-3
            shadow-[0_1px_2px_rgba(17,24,39,0.04),0_6px_18px_rgba(17,24,39,0.07)]"
        >
          <div className="h-full rounded-xl bg-background p-2">
            <YouTubeEmbedPanel
              embedUrl={active?.embedUrl ?? null}
              large
              placeholder="Add a YouTube URL to start watching in-app."
            />
          </div>
        </section>

        <section
          className="min-h-0 rounded-2xl border border-border/50 bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] p-3
            shadow-[0_1px_2px_rgba(17,24,39,0.04),0_6px_18px_rgba(17,24,39,0.07)]"
        >
          <div className="flex h-full min-h-0 flex-col rounded-xl bg-background p-2.5">
            <p className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Saved links
            </p>
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5">
              <AnimatePresence initial={false}>
                {items.map((item) => {
                  const activeRow = item.id === active?.id;
                  return (
                    <motion.button
                      key={item.id}
                      type="button"
                      onClick={() => void openItem(item.id)}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2, ease: [0, 0, 0.58, 1] }}
                      whileTap={{ scale: 0.985 }}
                      className={
                        "w-full rounded-lg border px-2.5 py-2 text-left transition-colors " +
                        (activeRow
                          ? "border-cta/40 bg-cta/10"
                          : "border-border/50 bg-card/65 hover:bg-accent/55")
                      }
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-foreground">
                            <Youtube size={14} className="shrink-0 text-red-500" />
                            <span className="truncate">{shortLabel(item)}</span>
                          </p>
                          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{item.url}</p>
                        </div>
                        <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                          {formatDate(item.updatedAtIso)}
                        </span>
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
                    </motion.button>
                  );
                })}
              </AnimatePresence>

              {items.length === 0 && (
                <div className="flex h-full min-h-[8rem] items-center justify-center rounded-lg border border-dashed border-border/60 text-center">
                  <p className="px-6 text-[11px] text-muted-foreground">
                    No links yet. Add a YouTube URL above and it will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

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
              <div className="h-[min(65vh,36rem)] rounded-xl bg-background p-2">
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
