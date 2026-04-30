"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Users, UserPlus } from "lucide-react";

export type FriendItem = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  connectedAt: string;
};

export default function FriendsPanel({
  initialFriends,
  fallbackNames,
}: {
  initialFriends: FriendItem[];
  fallbackNames: string[];
}) {
  const [friends, setFriends] = useState(initialFriends);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addFriend(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json()) as { friend?: FriendItem; error?: string };
      if (!res.ok || !data.friend) {
        setError(data.error ?? "Unable to add friend.");
        return;
      }
      setFriends((prev) => {
        if (prev.some((f) => f.id === data.friend!.id)) return prev;
        return [data.friend!, ...prev];
      });
      setEmail("");
    } catch {
      setError("Something went wrong while adding friend.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] rounded-2xl border border-border/50 p-4">
      <p className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-foreground">
        <Users size={13} />
        Friends
      </p>

      <form onSubmit={addFriend} className="mb-3 flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Add friend by email"
          className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-[11.5px] text-foreground"
        />
        <motion.button
          type="submit"
          whileTap={{ scale: 0.96 }}
          disabled={busy || !email.trim()}
          className="flex shrink-0 items-center gap-1 rounded-[6px] bg-cta px-2.5 py-2 text-[10.5px] font-medium text-cta-foreground disabled:opacity-60"
        >
          <UserPlus size={12} />
          Add
        </motion.button>
      </form>

      {error && <p className="mb-2 text-[10.5px] text-destructive">{error}</p>}

      <div className="space-y-2">
        {friends.length > 0 ? (
          friends.map((friend) => (
            <div key={friend.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-background/80 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-[11.5px] text-foreground">{friend.name}</p>
                <p className="truncate text-[10px] text-muted-foreground">{friend.email}</p>
              </div>
              <span className="text-[10px] text-muted-foreground">friend</span>
            </div>
          ))
        ) : fallbackNames.length > 0 ? (
          fallbackNames.slice(0, 4).map((name) => (
            <div key={name} className="flex items-center justify-between rounded-lg border border-border/50 bg-background/80 px-3 py-2">
              <span className="text-[11.5px] text-foreground">{name}</span>
              <span className="text-[10px] text-muted-foreground">recent</span>
            </div>
          ))
        ) : (
          <p className="text-[11px] text-muted-foreground">No friends yet. Add by email.</p>
        )}
      </div>
    </div>
  );
}

