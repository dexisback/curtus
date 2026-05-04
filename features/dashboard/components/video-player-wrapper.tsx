"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import YouTubeEmbedPanel from "./youtube-embed-panel";
import { clearDashboardLecture, readDashboardLecture } from "@/lib/dashboard-lecture";

export default function VideoPlayerWrapper() {
  const router = useRouter();
  const [selection, setSelection] = useState(() => readDashboardLecture());

  const embedUrl = selection?.embedUrl ?? null;

  useEffect(() => {
    setSelection(readDashboardLecture());
  }, []);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <YouTubeEmbedPanel
        embedUrl={embedUrl}
        activeLabel={selection?.label ?? null}
        onWatchLecture={() => router.push("/library")}
        onClearLecture={() => {
          clearDashboardLecture();
          setSelection(null);
        }}
        onEnterFocus={embedUrl ? () => router.push("/rooms") : undefined}
        focusMode={false}
      />
    </div>
  );
}
