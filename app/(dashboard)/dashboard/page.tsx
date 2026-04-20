import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import dynamic from "next/dynamic";
import Timer from "@/components/timer";
import Link from "next/link";

const VideoPlayer = dynamic(
  () => import("@/features/dashboard/components/video-player"),
  { ssr: false, loading: () => <div style={{ minHeight: 240 }} /> },
);

export default async function DashboardPage() {
  const session = await requireSession();

  const memberships = await prisma.roomMember.findMany({
    where: { userId: session.user.id },
    orderBy: { joinedAt: "desc" },
    take: 5,
    select: {
      role: true,
      room: { select: { code: true, name: true } },
    },
  });

  return (
    <div className="h-full w-full pb-24">
      <VideoPlayer />

      <div>
        <h2>Solo Timer</h2>
        <Timer />
      </div>

      {memberships.length > 0 && (
        <div>
          <h2>My Rooms</h2>
          <ul>
            {memberships.map((m) => (
              <li key={m.room.code}>
                <Link href={`/room/${m.room.code}`}>
                  {m.room.name}
                </Link>
                {m.role === "HOST" && " (host)"}
              </li>
            ))}
          </ul>
          <Link href="/rooms">Browse all rooms →</Link>
        </div>
      )}

      {memberships.length === 0 && (
        <div>
          <Link href="/rooms">Find or create a study room →</Link>
        </div>
      )}
    </div>
  );
}
