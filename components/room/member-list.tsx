"use client";

import type { Member } from "./room-client";

type Props = {
  members: Member[];
  studyingUserIds: string[];
  todayMinutes: Record<string, number>;
  currentUserId: string;
};

export default function MemberList({ members, studyingUserIds, todayMinutes, currentUserId }: Props) {
  const studyingSet = new Set(studyingUserIds);

  return (
    <ul>
      {members.map((m) => (
        <li key={m.id}>
          {m.name ?? "Unknown"}
          {m.id === currentUserId && " (you)"}
          {m.role === "HOST" && " [host]"}
          {studyingSet.has(m.id) && " • studying"}
          {" — "}{todayMinutes[m.id] ?? 0} min today
        </li>
      ))}
    </ul>
  );
}
