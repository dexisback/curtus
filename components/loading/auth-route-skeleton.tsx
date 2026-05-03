import { GlassLoadingShell } from "@/components/loading/glass-loading-shell";

/** Mirrors auth `main` shell: centered card with form-shaped blocks. */
export default function AuthRouteSkeleton() {
  return (
    <GlassLoadingShell className="min-h-[min(100dvh,40rem)]">
      <div className="flex min-h-[min(100dvh,40rem)] items-center justify-center p-6">
        <div className="app-shimmer-block w-full max-w-[22rem] space-y-5 rounded-2xl border border-border/45 bg-card/70 p-8 shadow-[0_8px_40px_rgba(17,24,39,0.08)] ring-1 ring-border/25">
          <div className="space-y-2 text-center">
            <div className="mx-auto h-4 w-32 rounded-md bg-muted/50" />
            <div className="mx-auto h-2.5 w-48 max-w-full rounded bg-muted/35" />
          </div>
          <div className="space-y-3 pt-1">
            <div className="h-10 w-full rounded-lg bg-muted/45 ring-1 ring-border/25" />
            <div className="h-10 w-full rounded-lg bg-muted/45 ring-1 ring-border/25" />
            <div className="h-10 w-full rounded-[8px] bg-muted/55 ring-1 ring-border/30" />
          </div>
          <div className="mx-auto h-2.5 w-40 rounded bg-muted/30" />
        </div>
      </div>
    </GlassLoadingShell>
  );
}
