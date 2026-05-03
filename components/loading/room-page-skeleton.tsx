import { GlassLoadingShell } from "@/components/loading/glass-loading-shell";
import { PANEL_TEXTURE } from "@/components/loading/panel-texture";

/** Mirrors `room-client.tsx`: top bar, video/leaderboard + chat columns. */
export default function RoomPageSkeleton() {
  return (
    <GlassLoadingShell className="min-h-[100dvh]">
      <div className="flex h-full min-h-[100dvh] w-full flex-col overflow-hidden px-4 pb-5 pt-3 sm:px-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="app-shimmer-block h-9 w-[4.5rem] rounded-[8px] bg-muted/50 ring-1 ring-border/30" />
          <div className="flex flex-col items-center gap-1">
            <div className="h-3.5 w-32 rounded-md bg-muted/45" />
            <div className="h-2 w-20 rounded bg-muted/35" />
          </div>
          <div className="app-shimmer-block h-9 w-24 rounded-[8px] bg-muted/45 ring-1 ring-border/30" />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2.3fr)_minmax(19rem,0.9fr)]">
          <div className={`app-shimmer-block min-h-0 ${PANEL_TEXTURE} p-3`}>
            <div className="flex h-full min-h-[14rem] flex-col rounded-xl bg-background p-2">
              <div className="mb-2 flex justify-between border-b border-border/40 pb-2">
                <div className="h-2.5 w-24 rounded bg-muted/40" />
                <div className="flex gap-1">
                  <div className="h-7 w-7 rounded-full bg-muted/45" />
                  <div className="h-7 w-7 rounded-full bg-muted/45" />
                </div>
              </div>
              <div className="min-h-0 flex-1 rounded-[10px] bg-muted/25 ring-1 ring-border/25" />
            </div>
          </div>
          <div className={`app-shimmer-block min-h-0 ${PANEL_TEXTURE} p-3`}>
            <div className="flex h-full min-h-[10rem] flex-col rounded-xl bg-background p-3">
              <div className="mb-2 h-2 w-20 rounded bg-muted/35" />
              <div className="flex flex-1 flex-col gap-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-2 rounded-lg bg-muted/25 px-2 py-2 ring-1 ring-border/15">
                    <div className="h-2 w-12 shrink-0 rounded bg-muted/40" />
                    <div className="h-2 flex-1 rounded bg-muted/35" />
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
