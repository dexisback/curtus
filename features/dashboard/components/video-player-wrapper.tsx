"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import YouTubeEmbedPanel from "./youtube-embed-panel";
import { clearDashboardLecture, readDashboardLecture } from "@/lib/dashboard-lecture";

export default function VideoPlayerWrapper() {
  const router = useRouter();
  const [selection, setSelection] = useState(() => readDashboardLecture());

  const embedUrl = useMemo(() => selection?.embedUrl ?? null, [selection]);

  return (
    <div className="h-full min-h-0 w-full min-w-0">
      <YouTubeEmbedPanel
        embedUrl={embedUrl}
        placeholder="Pick one lecture from your library and watch it here."
        ctaLabel="Watch a lecture"
        activeLabel={selection?.label ?? null}
        onWatchLecture={() => router.push("/library")}
        onClearLecture={() => {
          clearDashboardLecture();
          setSelection(null);
        }}
      />
    </div>
  );
}

// — Wraps dashboard YouTube player panel.
