"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PublicRoom = {
  code: string;
  name: string;
  memberCount: number;
  hostName: string;
};

type MyRoom = {
  code: string;
  name: string;
  role: string;
  memberCount: number;
  hostName: string;
};

type Props = {
  publicRooms: PublicRoom[];
  myRooms: MyRoom[];
};

export default function RoomsClient({ publicRooms, myRooms }: Props) {
  const router = useRouter();
  const [createName, setCreateName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createName.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName.trim(), isPublic }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create room."); return; }
      router.push(`/room/${data.code}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to join room."); return; }
      router.push(`/room/${data.code}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1>Rooms</h1>

      {error && <p role="alert">{error}</p>}

      <section>
        <h2>Create a room</h2>
        <form onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Room name"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            maxLength={80}
            required
          />
          <label>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            Public (appears in browse list)
          </label>
          <button type="submit" disabled={busy}>
            Create
          </button>
        </form>
      </section>

      <section>
        <h2>Join by code</h2>
        <form onSubmit={handleJoin}>
          <input
            type="text"
            placeholder="Room code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            maxLength={12}
            required
          />
          <button type="submit" disabled={busy}>
            Join
          </button>
        </form>
      </section>

      {myRooms.length > 0 && (
        <section>
          <h2>My rooms</h2>
          <ul>
            {myRooms.map((r) => (
              <li key={r.code}>
                <a href={`/room/${r.code}`}>
                  {r.name} — {r.memberCount} member{r.memberCount !== 1 ? "s" : ""} — {r.role}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {publicRooms.length > 0 && (
        <section>
          <h2>Public rooms</h2>
          <ul>
            {publicRooms.map((r) => (
              <li key={r.code}>
                <a href={`/room/${r.code}`}>
                  {r.name} by {r.hostName} — {r.memberCount} member{r.memberCount !== 1 ? "s" : ""}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {publicRooms.length === 0 && myRooms.length === 0 && (
        <p>No rooms yet. Create one above or join with a code.</p>
      )}
    </div>
  );
}
