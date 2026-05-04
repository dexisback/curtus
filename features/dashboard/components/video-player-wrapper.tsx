"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import YouTubeEmbedPanel from "./youtube-embed-panel";
import { clearDashboardLecture, readDashboardLecture } from "@/lib/dashboard-lecture";

function stripFocusHashFromUrl() {
  if (typeof window === "undefined" || window.location.hash !== "#focus") return;
  history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
}

export default function VideoPlayerWrapper() {
  const router = useRouter();
  const pathname = usePathname();
  const [selection, setSelection] = useState(() => readDashboardLecture());
  const [focus, setFocus] = useState(false);

  const embedUrl = selection?.embedUrl ?? null;

  const exitFocus = useCallback(() => {
    setFocus(false);
    stripFocusHashFromUrl();
  }, []);

  useEffect(() => {
    const next = readDashboardLecture();
    setSelection(next);
    if (pathname === "/dashboard" && window.location.hash === "#focus" && next?.embedUrl) {
      setFocus(true);
    }

    const onHashChange = () => {
      if (window.location.hash !== "#focus") return;
      const lec = readDashboardLecture();
      if (lec?.embedUrl) setFocus(true);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [pathname]);

  useEffect(() => {
    if (!focus) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exitFocus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus, exitFocus]);

  useEffect(() => {
    if (!embedUrl && focus) exitFocus();
  }, [embedUrl, focus, exitFocus]);

  useEffect(() => {
    if (!focus) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [focus]);

  return (
    <>
      {focus ? <div className="min-h-[14rem] w-full shrink-0" aria-hidden /> : null}
      <div
        className={
          focus
            ? "fixed inset-0 z-[140] flex flex-col bg-background/97 backdrop-blur-[2px]"
            : "flex h-full min-h-0 w-full min-w-0 flex-col"
        }
      >
        {focus ? (
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/40 px-4 py-3 sm:px-5">
            <button
              type="button"
              onClick={exitFocus}
              className="rounded-lg border border-border/60 bg-background px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-accent/50"
            >
              Exit focus
            </button>
            {selection?.label ? (
              <p className="min-w-0 flex-1 truncate text-center text-[11px] text-muted-foreground">{selection.label}</p>
            ) : (
              <span className="flex-1" />
            )}
            <button
              type="button"
              onClick={() => {
                clearDashboardLecture();
                setSelection(null);
                exitFocus();
              }}
              className="rounded-lg border border-border/60 bg-background px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-accent/50"
            >
              Clear
            </button>
          </header>
        ) : null}
        <div className="min-h-0 flex-1">
          <YouTubeEmbedPanel
            embedUrl={embedUrl}
            activeLabel={selection?.label ?? null}
            onWatchLecture={() => router.push("/library")}
            onClearLecture={() => {
              clearDashboardLecture();
              setSelection(null);
            }}
            onEnterFocus={embedUrl ? () => setFocus(true) : undefined}
            focusMode={focus}
          />
        </div>
      </div>
    </>
  );
}
