"use client";

import dynamic from "next/dynamic";

const VideoPlayer = dynamic(() => import("./video-player"), {
  ssr: false,
  loading: () => <div style={{ minHeight: 240 }} />,
});

export default function VideoPlayerWrapper() {
  return <VideoPlayer />;
}
