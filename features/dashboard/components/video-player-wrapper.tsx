"use client";

import YouTubeEmbedPanel from "./youtube-embed-panel";

export default function VideoPlayerWrapper({ embedUrl }: { embedUrl: string | null }) {
  return (
    <div className="h-full min-h-0 w-full min-w-0">
      <YouTubeEmbedPanel embedUrl={embedUrl} />
    </div>
  );
}

// — Wraps dashboard YouTube player panel.
