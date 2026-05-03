import { GlassLoadingShell } from "@/components/loading/glass-loading-shell";
import { PANEL_TEXTURE } from "@/components/loading/panel-texture";

/** Mirrors `profile/page.tsx`: header tile, stats grid, heatmap + friends columns. */
export default function ProfilePageSkeleton() {
  return (
    <GlassLoadingShell>
      <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto px-4 pb-8 pt-2 sm:px-6">
        <div className="mx-auto w-full max-w-5xl space-y-5 pt-2">
          <div className={`app-shimmer-block ${PANEL_TEXTURE} p-6`}>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="h-20 w-20 shrink-0 rounded-full bg-muted/50 ring-2 ring-border/30" />
              <div className="flex flex-1 flex-col items-center gap-2 sm:items-start">
                <div className="h-4 w-40 rounded-md bg-muted/50" />
                <div className="h-2.5 w-48 max-w-full rounded bg-muted/35" />
                <div className="mt-1 h-8 w-full max-w-[14rem] rounded-lg bg-muted/40 ring-1 ring-border/25 sm:w-48" />
              </div>
            </div>
          </div>

          <div className={`app-shimmer-block ${PANEL_TEXTURE} p-5`}>
            <div className="mb-4 h-3 w-24 rounded bg-muted/45" />
            <div className="grid grid-cols-1 divide-y divide-border/40 rounded-xl border border-border/50 bg-background/75 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2 px-4 py-3">
                  <div className="h-2 w-16 rounded bg-muted/35" />
                  <div className="h-7 w-20 rounded-md bg-muted/45" />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div className={`app-shimmer-block ${PANEL_TEXTURE} p-5`}>
              <div className="mb-3 flex items-center gap-2">
                <div className="h-3.5 w-3.5 rounded bg-muted/45" />
                <div className="h-3 w-28 rounded bg-muted/40" />
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-[4px] bg-muted/40 ring-1 ring-border/20" />
                ))}
              </div>
              <div className="mt-3 flex h-[82px] items-end gap-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex-1 rounded-t-sm bg-muted/45" style={{ height: `${20 + (i % 4) * 14}px` }} />
                ))}
              </div>
            </div>
            <div className={`app-shimmer-block min-h-[12rem] ${PANEL_TEXTURE} p-5`}>
              <div className="mb-3 h-3 w-24 rounded bg-muted/40" />
              <div className="space-y-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-border/40 bg-background/60 px-3 py-2.5">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-muted/50" />
                    <div className="h-2.5 flex-1 rounded bg-muted/40" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </GlassLoadingShell>
  );
}
