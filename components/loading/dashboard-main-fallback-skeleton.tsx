import { GlassLoadingShell } from "@/components/loading/glass-loading-shell";
import { PANEL_TEXTURE } from "@/components/loading/panel-texture";

/** Default dashboard main-area skeleton for routes without a dedicated loader. */
export default function DashboardMainFallbackSkeleton() {
  return (
    <GlassLoadingShell>
      <div className="flex h-full min-h-0 w-full flex-col gap-5 overflow-hidden px-5 pb-6 pt-8 sm:px-6 sm:pt-10">
        <div className="flex items-center gap-2">
          <div className="app-shimmer-block h-3.5 w-3.5 rounded-sm bg-muted/50" />
          <div className="app-shimmer-block h-3 w-32 rounded-md bg-muted/45 ring-1 ring-border/25" />
        </div>
        <div className={`app-shimmer-block min-h-0 flex-1 ${PANEL_TEXTURE} p-4`}>
          <div className="space-y-3">
            <div className="h-3 w-40 rounded bg-muted/40" />
            <div className="h-2.5 w-full max-w-lg rounded bg-muted/30" />
            <div className="h-2.5 w-full max-w-md rounded bg-muted/25" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="h-32 rounded-xl bg-muted/35 ring-1 ring-border/20" />
              <div className="h-32 rounded-xl bg-muted/35 ring-1 ring-border/20" />
            </div>
          </div>
        </div>
      </div>
    </GlassLoadingShell>
  );
}
