"use client";

import type { Member } from "./room-client";

type Props = {
  members: Member[];
  studyingUserIds: string[];
  todayMinutes: Record<string, number>;
  currentUserId: string;
  onSelectMember?: (member: Member) => void;
};

export default function MemberList({
  members,
  studyingUserIds,
  todayMinutes,
  currentUserId,
  onSelectMember,
}: Props) {
  const studyingSet = new Set(studyingUserIds);

  return (
    <ul className="space-y-1.5">
      {members.map((m) => (
        <li key={m.id}>
          <button
            type="button"
            onClick={() => onSelectMember?.(m)}
            className="flex w-full items-center justify-between gap-2 rounded-[8px] border border-border/50 bg-background/70 px-2.5 py-2 text-left transition-colors hover:bg-accent/40"
          >
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium text-foreground">
                {m.name ?? "Unknown"}
                {m.id === currentUserId ? " (you)" : ""}
                {m.role === "HOST" ? " [host]" : ""}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {studyingSet.has(m.id) ? "studying now" : "idle"}
              </p>
            </div>
            <span className="shrink-0 tabular-nums text-[11px] text-foreground/85">
              {todayMinutes[m.id] ?? 0}m
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// — Room roster with roles and kick where allowed.
