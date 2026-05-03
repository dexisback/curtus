import type { ReactNode } from "react";

type GlassLoadingShellProps = {
  children: ReactNode;
  className?: string;
};

export function GlassLoadingShell({ children, className = "" }: GlassLoadingShellProps) {
  return (
    <div className={`relative h-full min-h-0 w-full overflow-hidden ${className}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-background/50 backdrop-blur-2xl backdrop-saturate-150
          dark:bg-background/60
          [box-shadow:inset_0_1px_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(0,0,0,0.04)]"
      />
      <div className="relative z-10 h-full min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
