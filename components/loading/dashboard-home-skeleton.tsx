import { GlassLoadingShell } from "@/components/loading/glass-loading-shell";
import { PANEL_TEXTURE } from "@/components/loading/panel-texture";

/** Mirrors `app/(dashboard)/dashboard/page.tsx` bento + todo strip. */
export default function DashboardHomeSkeleton() {
  return (
    <GlassLoadingShell>
      <div
        id="focus"
        className="flex h-full min-h-0 w-full flex-col gap-6 overflow-hidden px-5 pb-5 pt-10 sm:gap-8 sm:px-6 sm:pb-6 sm:pt-12 md:gap-10"
      >
        <div className="grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(0,1.9fr)_minmax(0,3.1fr)] gap-6 sm:gap-7 md:gap-8">
          <div className={`app-shimmer-block min-h-0 ${PANEL_TEXTURE} p-2.5`}>
            <div className="flex h-full min-h-0 flex-col rounded-[22px] border border-border/40 bg-background/90 p-2">
              <div className="mb-2 h-7 w-28 shrink-0 rounded-md bg-muted/50" />
              <div className="min-h-0 flex-1 rounded-[18px] bg-muted/30 ring-1 ring-border/25" />
            </div>
          </div>
          <div className={`app-shimmer-block min-h-0 ${PANEL_TEXTURE} p-3`}>
            <div className="h-full min-h-[8rem] rounded-xl bg-muted/35 ring-1 ring-border/30" />
          </div>
        </div>
        <div className="h-[25%] min-h-[9.5rem] shrink-0">
          <div className={`app-shimmer-block flex h-full ${PANEL_TEXTURE} p-3`}>
            <div className="flex w-full gap-3 overflow-hidden">
              <div className="h-16 w-24 shrink-0 rounded-lg bg-muted/45 ring-1 ring-border/25" />
              <div className="min-h-0 flex-1 space-y-2">
                <div className="h-3 w-[60%] max-w-[14rem] rounded bg-muted/40" />
                <div className="h-9 w-full rounded-lg bg-muted/40 ring-1 ring-border/20" />
                <div className="h-9 w-full rounded-lg bg-muted/35 ring-1 ring-border/20" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </GlassLoadingShell>
  );
}
