"use client";

import { useEffect } from "react";

export default function SocketPrewarm() {
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;

    if (!socketUrl) {
      return;
    }
    if (
      typeof window !== "undefined" &&
      window.location.hostname !== "localhost" &&
      socketUrl.includes("localhost")
    ) {
      return;
    }

    void fetch(`${socketUrl}/health`, {
      mode: "cors",
      cache: "no-store",
    }).catch(() => {
      // Cold-start prewarm is best-effort only.
    });
  }, []);

  return null;
}

// — Eager socket connect on dashboard mount (optional UX).
