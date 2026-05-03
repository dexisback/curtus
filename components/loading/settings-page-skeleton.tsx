import { GlassLoadingShell } from "@/components/loading/glass-loading-shell";
import { PANEL_TEXTURE } from "@/components/loading/panel-texture";

/** Mirrors stacked settings cards + rows (`settings-client.tsx`). */
export default function SettingsPageSkeleton() {
  return (
    <GlassLoadingShell>
      <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto px-4 pb-10 pt-2 sm:px-6">
        <div className="mx-auto w-full max-w-3xl space-y-5 pt-2">
          <div className={`app-shimmer-block ${PANEL_TEXTURE} p-5`}>
            <div className="mb-4 flex items-start gap-3 border-b border-border/50 pb-4">
              <div className="h-8 w-8 shrink-0 rounded-lg bg-muted/50 ring-1 ring-border/30" />
              <div className="space-y-2 pt-0.5">
                <div className="h-3 w-28 rounded bg-muted/45" />
                <div className="h-2 w-48 max-w-full rounded bg-muted/35" />
              </div>
            </div>
            <div className="divide-y divide-border/40">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between gap-4 py-3">
                  <div className="space-y-1">
                    <div className="h-2.5 w-28 rounded bg-muted/45" />
                    <div className="h-2 w-40 max-w-[85%] rounded bg-muted/30" />
                  </div>
                  <div className="h-8 w-24 shrink-0 rounded-md bg-muted/45 ring-1 ring-border/25" />
                </div>
              ))}
            </div>
          </div>

          <div className={`app-shimmer-block ${PANEL_TEXTURE} p-5`}>
            <div className="mb-4 flex items-start gap-3 border-b border-border/50 pb-4">
              <div className="h-8 w-8 shrink-0 rounded-lg bg-muted/50 ring-1 ring-border/30" />
              <div className="space-y-2 pt-0.5">
                <div className="h-3 w-24 rounded bg-muted/45" />
                <div className="h-2 w-52 max-w-full rounded bg-muted/35" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-9 w-full max-w-xs rounded-lg bg-muted/40 ring-1 ring-border/25" />
              <div className="flex gap-3">
                <div className="h-5 w-5 rounded-full bg-muted/45" />
                <div className="h-5 flex-1 rounded bg-muted/35" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </GlassLoadingShell>
  );
}
