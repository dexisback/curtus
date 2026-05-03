import { GlassLoadingShell } from "@/components/loading/glass-loading-shell";
import { PANEL_TEXTURE } from "@/components/loading/panel-texture";

/** Mirrors `leaderboard-client.tsx` outer panel, header pills, me strip, rows. */
export default function LeaderboardPageSkeleton() {
  return (
    <GlassLoadingShell>
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden px-4 pb-5 pt-2 sm:px-6 sm:pb-6">
        <div className={`${PANEL_TEXTURE} flex min-h-0 flex-1 flex-col overflow-hidden p-4`}>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-background">
            <div className="flex shrink-0 flex-col gap-3 border-b border-border/50 px-4 pb-3 pt-4">
              <div className="flex items-center gap-2.5">
                <div className="app-shimmer-block h-3.5 w-3.5 rounded-sm bg-muted/50" />
                <div className="app-shimmer-block h-3.5 w-28 rounded-md bg-muted/45 ring-1 ring-border/25" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="app-shimmer-block flex h-8 w-[11.5rem] rounded-full bg-muted/40 ring-1 ring-border/30" />
                <div className="app-shimmer-block h-8 w-[7.5rem] rounded-full bg-muted/40 ring-1 ring-border/30" />
              </div>
            </div>

            <div className="shrink-0 border-b border-border/50 px-4 py-2.5">
              <div className="app-shimmer-block flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 ring-1 ring-border/25">
                <div className="h-5 w-8 rounded bg-muted/50" />
                <div className="h-6 w-6 shrink-0 rounded-full bg-muted/55" />
                <div className="h-2.5 flex-1 rounded bg-muted/40" />
                <div className="h-2.5 w-10 shrink-0 rounded bg-muted/35" />
              </div>
            </div>

            <div className="relative min-h-0 flex-1 overflow-y-auto px-2 py-2">
              <ol className="flex flex-col gap-0.5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <li key={i} className="app-shimmer-block rounded-lg px-3 py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-6 shrink-0 text-center">
                        <div className="mx-auto h-2.5 w-4 rounded bg-muted/45" />
                      </div>
                      <div className="h-7 w-7 shrink-0 rounded-full bg-muted/50 ring-1 ring-border/25" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="h-2.5 w-[38%] max-w-[10rem] rounded bg-muted/40" />
                      </div>
                      <div className="h-2.5 w-12 shrink-0 rounded bg-muted/35" />
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </GlassLoadingShell>
  );
}
