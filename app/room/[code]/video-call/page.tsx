import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Minimize2, Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

export default async function RoomVideoCallPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const session = await requireSession();
  const { code } = await params;

  const room = await prisma.room.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      name: true,
      isPublic: true,
      members: { select: { userId: true } },
    },
  });

  if (!room) notFound();

  const isMember = room.members.some((m) => m.userId === session.user.id);
  if (!room.isPublic && !isMember) redirect("/rooms");

  return (
    <div className="flex h-screen w-full flex-col bg-background px-4 pb-5 pt-3 sm:px-6">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] text-muted-foreground">Full-screen room call</p>
          <h1 className="text-[14px] font-semibold tracking-tight text-foreground">{room.name}</h1>
        </div>
        <Link
          href={`/room/${room.code}`}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-border/60 bg-card/80 px-3 text-[11px] font-medium text-foreground/90 hover:bg-accent/60"
        >
          <Minimize2 size={12} strokeWidth={1.8} />
          Back to room
        </Link>
      </div>

      <div className="relative min-h-0 flex-1 rounded-3xl border border-border/50 p-5 bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] shadow-[0_1px_2px_rgba(17,24,39,0.05),0_12px_36px_rgba(17,24,39,0.1)]">
        <div className="flex h-full w-full items-center justify-center rounded-2xl bg-black">
          <p className="text-[12px] text-white/60">Video stream viewport (UI-first shell)</p>
        </div>

        <div className="pointer-events-none absolute bottom-5 left-0 right-0 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border/40 bg-background/85 px-3 py-2 backdrop-blur-md">
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/70 text-foreground hover:bg-muted">
              <Mic size={16} />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/70 text-foreground hover:bg-muted">
              <Video size={16} />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/70 text-foreground hover:bg-muted">
              <MicOff size={16} />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/70 text-foreground hover:bg-muted">
              <VideoOff size={16} />
            </button>
            <Link
              href={`/room/${room.code}`}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
            >
              <PhoneOff size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// — WebRTC video call view for a room.
