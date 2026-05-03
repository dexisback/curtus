import { GlassLoadingShell } from "@/components/loading/glass-loading-shell";
import { PANEL_TEXTURE } from "@/components/loading/panel-texture";

/** Mirrors `rooms-client.tsx`: header, xl two-column (list + board). */
export default function RoomsPageSkeleton() {
  return (
    <GlassLoadingShell>
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden px-4 pb-6 pt-2 sm:px-6">
        <div className="mb-4 flex shrink-0 items-center gap-2 pt-2">
          <div className="app-shimmer-block h-3.5 w-3.5 rounded-sm bg-muted/50 ring-1 ring-border/30" />
          <div className="app-shimmer-block h-3.5 w-16 rounded-md bg-muted/45 ring-1 ring-border/25" />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(24rem,1.28fr)_minmax(22rem,1.12fr)]">
          <section className={`order-2 min-h-0 overflow-hidden xl:order-1 ${PANEL_TEXTURE} p-3`}>
            <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
              <div className="app-shimmer-block rounded-lg border border-border/50 bg-background/90 p-4 shadow-[0_1px_2px_rgba(17,24,39,0.03)]">
                <div className="mb-3 h-2.5 w-24 rounded bg-muted/45" />
                <div className="flex gap-2">
                  <div className="h-9 min-w-0 flex-1 rounded-md bg-muted/50 ring-1 ring-border/30" />
                  <div className="h-9 w-16 shrink-0 rounded-[6px] bg-muted/55 ring-1 ring-border/30" />
                </div>
              </div>
              <div className="app-shimmer-block min-h-0 overflow-hidden rounded-lg border border-border/50 bg-background p-3">
                <div className="mb-3 flex justify-between gap-2">
                  <div className="h-2.5 w-20 rounded bg-muted/40" />
                  <div className="h-7 w-[7.5rem] rounded-[6px] bg-muted/45 ring-1 ring-border/25" />
                </div>
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="app-shimmer-block flex flex-col gap-2 rounded-lg border border-border/50 bg-card/80 p-4"
                    >
                      <div className="h-3 w-[66%] max-w-[12rem] rounded bg-muted/45" />
                      <div className="h-2.5 w-24 rounded bg-muted/35" />
                      <div className="mt-2 flex justify-between">
                        <div className="h-2.5 w-16 rounded bg-muted/30" />
                        <div className="h-7 w-16 rounded-[6px] bg-muted/50" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section
            className={`order-1 min-h-0 xl:order-2 xl:h-[88%] xl:self-center ${PANEL_TEXTURE} p-3`}
          >
            <div className="app-shimmer-block flex h-full min-h-[12rem] flex-col rounded-xl bg-background p-3">
              <div className="mb-2 flex justify-between border-b border-border/40 pb-2">
                <div className="h-3 w-28 rounded bg-muted/40" />
                <div className="flex gap-1">
                  <div className="h-7 w-7 rounded-full bg-muted/45 ring-1 ring-border/25" />
                  <div className="h-7 w-7 rounded-full bg-muted/45 ring-1 ring-border/25" />
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2 pt-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-2">
                    <div className="app-shimmer-block h-8 w-8 shrink-0 rounded-full bg-muted/50 ring-1 ring-border/25" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="h-2.5 w-[40%] rounded bg-muted/40" />
                      <div className="h-2 w-20 rounded bg-muted/30" />
                    </div>
                    <div className="h-2 w-10 shrink-0 rounded bg-muted/35" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </GlassLoadingShell>
  );
}
