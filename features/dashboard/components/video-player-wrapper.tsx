"use client";

import dynamic from "next/dynamic";

const VideoPlayer = dynamic(() => import("./video-player"), {
  ssr: false,
  loading: () => <div className="h-full min-h-[12rem] w-full" />,
});

export default function VideoPlayerWrapper() {
  return (
    <div className="h-full min-h-0 w-full min-w-0">
      <VideoPlayer />
    </div>
  );
}
