import { GlassLoadingShell } from "@/components/loading/glass-loading-shell";

export default function MarketingRouteSkeleton() {
  return (
    <GlassLoadingShell className="min-h-[100dvh]">
      <div className="flex min-h-[100dvh] items-center justify-center p-8">
        <div className="app-shimmer-block w-full max-w-sm space-y-4 rounded-2xl border border-border/40 bg-card/60 p-8 shadow-lg ring-1 ring-border/20 backdrop-blur-md">
          <div className="mx-auto h-10 w-10 rounded-xl bg-muted/50 ring-1 ring-border/30" />
          <div className="mx-auto h-3 w-[75%] rounded bg-muted/45" />
          <div className="mx-auto h-2.5 w-[50%] rounded bg-muted/35" />
        </div>
      </div>
    </GlassLoadingShell>
  );
}
