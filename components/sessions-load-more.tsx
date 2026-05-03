"use client";

import { useState } from "react";
import Link from "next/link";

type Session = {
  id: string;
  durationMin: number;
  completedAt: string;
  roomCode: string | null;
  roomName: string | null;
};

function formatMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  initialItems: Session[];
  initialNextCursor: string | null;
};

export default function SessionsLoadMore({ initialItems, initialNextCursor }: Props) {
  const [items, setItems] = useState<Session[]>(initialItems);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (!nextCursor || loading) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/sessions?cursor=${nextCursor}&limit=20`);
      if (!res.ok) return;
      const data = await res.json() as { items: Session[]; nextCursor: string | null };
      setItems((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No sessions logged yet.</p>;
  }

  return (
    <div>
      <ul className="space-y-1">
        {items.map((s) => (
          <li key={s.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
            <div className="flex items-center gap-2">
              <span className="font-medium tabular-nums">{formatMin(s.durationMin)}</span>
              {s.roomCode ? (
                <Link
                  href={`/room/${s.roomCode}`}
                  className="text-muted-foreground hover:underline text-xs"
                >
                  in {s.roomName}
                </Link>
              ) : (
                <span className="text-muted-foreground text-xs">solo</span>
              )}
            </div>
            <span className="text-muted-foreground text-xs">{formatDate(s.completedAt)}</span>
          </li>
        ))}
      </ul>

      {nextCursor && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}

// — Infinite scroll / button to page /api/sessions.
