import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import VideoPlayer from "@/features/dashboard/components/video-player";
import Timer from "@/components/timer";
import Link from "next/link";

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
