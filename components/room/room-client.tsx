"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, LogOut, Mic, Settings, Video, VideoOff, X } from "lucide-react";
import { connectWithAuth } from "@/lib/socket";
import { useStudyTimer } from "@/components/study-timer-provider";
import { useSound } from "@/components/sound-provider";
import { mergeSelfStudyTimer } from "@/lib/timer-sync";
import AvatarWithFallback from "@/components/ui/avatar-with-fallback";
import Chat from "./chat";
import { useRoomVideo } from "./use-room-video";
import RoomSettingsModal from "./room-settings-modal";
import RoomLeaderboardCarousel, {
  type RoomTimerBoard,
  type RoomTimerMember,
} from "@/features/dashboard/components/room-leaderboard-carousel";

function VideoSurface({
  stream,
  muted = false,
}: {
  stream: MediaStream | null;
  muted?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);

  if (!stream) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[12px] text-white/70">
        Connecting video…
      </div>
    );
  }

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className="h-full w-full rounded-[8px] bg-neutral-950 object-cover"
    />
  );
}

export type Member = {
  id: string;
  name: string;
  image: string | null;
  role: string;
};

export type ChatMessage = {
  id: string;
  content: string;
  clientNonce?: string | null;
  userId: string;
  userName: string;
  createdAt: string;
};

type Props = {
  roomId: string;
  code: string;
  name: string;
  currentUserId: string;
  isHost: boolean;
  initialMembers: Member[];
  initialMessages: ChatMessage[];
};

export default function RoomClient({
  roomId,
  code,
  name,
  currentUserId,
  isHost,
  initialMembers,
  initialMessages,
}: Props) {
  const router = useRouter();
  const { play } = useSound();
  const {
    active: selfTimerActive,
    startedAtMs: selfStartedAtMs,
    todaySeconds: selfTodaySeconds,
  } = useStudyTimer();
  const [members] = useState<Member[]>(initialMembers);
  const [studyingUserIds, setStudyingUserIds] = useState<string[]>([]);
  const [videoEnabledUserIds, setVideoEnabledUserIds] = useState<string[]>([]);
  const [todayMinutes, setTodayMinutes] = useState<Record<string, number>>({});
  const [todaySeconds, setTodaySeconds] = useState<Record<string, number>>({});
  const [sessionStartedAt, setSessionStartedAt] = useState<Record<string, string | null>>({});
  const [leaving, setLeaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusedMember, setFocusedMember] = useState<RoomTimerMember | null>(null);
  const {
    localStream,
    remoteStreams,
    starting: videoStarting,
    error: videoError,
    start: startVideo,
    stop: stopVideo,
  } = useRoomVideo({ roomId, currentUserId, videoEnabledUserIds });

  const selfCamOn = videoEnabledUserIds.includes(currentUserId);

  const streamForMember = useCallback(
    (userId: string) => (userId === currentUserId ? localStream : remoteStreams[userId] ?? null),
    [currentUserId, localStream, remoteStreams],
  );

  const hasVideoForMember = useCallback((userId: string) => videoEnabledUserIds.includes(userId), [videoEnabledUserIds]);

  const toggleSelfCamera = useCallback(() => {
    play("tap");
    if (selfCamOn) stopVideo();
    else void startVideo();
  }, [play, selfCamOn, startVideo, stopVideo]);

  useEffect(() => {
    const socket = connectWithAuth();
    if (!socket) return;

    socket.emit("room:join", { roomId });

    const onPresence = (payload: {
      roomId: string;
      memberIds: string[];
      studyingUserIds: string[];
      videoEnabledUserIds: string[];
      todayMinutes: Record<string, number>;
      todaySeconds: Record<string, number>;
      sessionStartedAt: Record<string, string | null>;
    }) => {
      if (payload.roomId !== roomId) return;
      setStudyingUserIds(payload.studyingUserIds);
      setVideoEnabledUserIds(payload.videoEnabledUserIds);
      setTodayMinutes(payload.todayMinutes);
      setTodaySeconds(payload.todaySeconds);
      setSessionStartedAt(payload.sessionStartedAt);
    };

    const onKicked = (payload: { roomId: string }) => {
      if (payload.roomId !== roomId) return;
      stopVideo();
      router.push("/rooms");
    };

    socket.on("presence", onPresence);
    socket.on("room:kicked", onKicked);

    return () => {
      socket.emit("room:leave", { roomId });
      stopVideo();
      socket.off("presence", onPresence);
      socket.off("room:kicked", onKicked);
    };
  }, [roomId, router, stopVideo]);

  async function leaveMembership() {
    setLeaving(true);
    stopVideo();
    try {
      await fetch(`/api/rooms/${code}`, { method: "DELETE" });
      router.push("/rooms");
    } finally {
      setLeaving(false);
    }
  }

  async function deleteRoomFromSettings() {
    setLeaving(true);
    stopVideo();
    try {
      await fetch(`/api/rooms/${code}`, { method: "DELETE" });
      setSettingsOpen(false);
      router.push("/rooms");
    } finally {
      setLeaving(false);
    }
  }

  const board = useMemo<RoomTimerBoard>(
    () => ({
      id: roomId,
      roomName: name,
      roomCode: code,
      members: members.map((m) => ({
        id: m.id,
        name: m.name,
        image: m.image,
        initials: m.name
          .split(/\s+/)
          .map((p) => p[0])
          .slice(0, 2)
          .join("")
          .toUpperCase(),
        active: studyingUserIds.includes(m.id),
        startedAtIso:
          studyingUserIds.includes(m.id) && sessionStartedAt[m.id]
            ? sessionStartedAt[m.id]!
            : new Date(0).toISOString(),
        todayMinutes: todayMinutes[m.id] ?? 0,
        todaySeconds: todaySeconds[m.id] ?? 0,
      })),
    }),
    [roomId, name, code, members, studyingUserIds, sessionStartedAt, todayMinutes, todaySeconds],
  );

  const displayBoard = useMemo(
    () =>
      mergeSelfStudyTimer([board], currentUserId, {
        active: selfTimerActive,
        startedAtMs: selfStartedAtMs,
        todaySeconds: selfTodaySeconds,
      })[0]!,
    [board, currentUserId, selfTimerActive, selfStartedAtMs, selfTodaySeconds],
  );

  const focusHasVideo = focusedMember ? videoEnabledUserIds.includes(focusedMember.id) : false;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden px-4 pb-5 pt-3 sm:px-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link
          href="/rooms"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border/60 bg-card/80 px-3 text-[11.5px] font-medium text-foreground/90 transition-colors hover:bg-accent/60"
        >
          <ArrowLeft size={13} strokeWidth={1.8} />
          Back
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <h1 className="truncate text-[14px] font-semibold tracking-tight text-foreground">{name}</h1>
          <p className="text-[10.5px] text-muted-foreground">Code: {code}</p>
        </div>
        <div className="flex shrink-0 justify-end">
          {isHost ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                play("tap");
                setSettingsOpen(true);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-card/80 text-foreground/90 shadow-[0_1px_2px_rgba(17,24,39,0.04)] transition-colors hover:bg-accent/60"
              aria-label="Room settings"
            >
              <Settings size={16} strokeWidth={1.65} />
            </motion.button>
          ) : (
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => void leaveMembership()}
              disabled={leaving}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border/60 bg-card/80 px-3 text-[11.5px] font-medium text-foreground/90 transition-colors hover:bg-accent/60 disabled:opacity-50"
            >
              <LogOut size={14} strokeWidth={1.75} />
              Leave
            </motion.button>
          )}
        </div>
      </div>

      {isHost && (
        <RoomSettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          roomName={name}
          roomCode={code}
          onDeleteRoom={deleteRoomFromSettings}
          deleteBusy={leaving}
        />
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2.3fr)_minmax(19rem,0.9fr)]">
        <div className="min-h-0 rounded-2xl border border-border/50 bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] p-3 shadow-[0_1px_2px_rgba(17,24,39,0.04),0_6px_18px_rgba(17,24,39,0.07)]">
          <div className="flex h-full min-h-0 flex-col rounded-xl bg-background p-2">
            <AnimatePresence mode="wait" initial={false}>
              {focusedMember ? (
                <motion.div
                  key="focused-video"
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 6 }}
                  transition={{ duration: 0.22, ease: [0, 0, 0.58, 1] }}
                  className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[10px] border border-border/50 bg-black"
                >
                  <button
                    type="button"
                    onClick={() => setFocusedMember(null)}
                    className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur-sm transition-colors hover:bg-background"
                    aria-label="Close focused preview"
                  >
                    <X size={14} />
                  </button>
                  <div className="flex min-h-0 flex-1 items-center justify-center">
                    {focusHasVideo ? (
                      <div className="h-full w-full bg-neutral-950 p-2">
                        {focusedMember.id === currentUserId ? (
                          <VideoSurface stream={localStream} muted />
                        ) : (
                          <VideoSurface stream={remoteStreams[focusedMember.id] ?? null} />
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-center">
                        <AvatarWithFallback
                          name={focusedMember.name}
                          src={focusedMember.image}
                          initials={focusedMember.initials}
                          className="h-20 w-20 rounded-full [outline:1px_solid_rgba(255,255,255,0.16)]"
                          fallbackClassName="rounded-full bg-white/10 text-[22px] font-semibold text-white"
                        />
                        <p className="text-[12px] text-white/80">
                          {videoError && focusedMember.id === currentUserId
                            ? videoError
                            : `${focusedMember.name} has video off.`}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center">
                    <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/15 bg-black/55 px-2 py-1.5 text-white/90 backdrop-blur-md">
                      <button
                        type="button"
                        disabled
                        title="Room sessions are video-only; microphone is not used."
                        className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-full bg-white/10 text-white/50"
                        aria-label="Microphone unavailable"
                      >
                        <Mic size={16} strokeWidth={1.75} />
                      </button>
                      {focusedMember.id === currentUserId && (
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.94 }}
                          disabled={videoStarting}
                          onClick={() => {
                            play("tap");
                            toggleSelfCamera();
                          }}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 disabled:opacity-50"
                          aria-label={selfCamOn ? "Turn camera off" : "Turn camera on"}
                        >
                          {videoStarting ? (
                            <span className="h-3.5 w-3.5 animate-pulse rounded-full bg-white/70" />
                          ) : selfCamOn ? (
                            <Video size={16} strokeWidth={1.85} />
                          ) : (
                            <VideoOff size={16} strokeWidth={1.85} />
                          )}
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="leaderboard-grid"
                  initial={{ opacity: 0, scale: 0.98, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 6 }}
                  transition={{ duration: 0.2, ease: [0, 0, 0.58, 1] }}
                  className="min-h-0 flex-1"
                >
                  <RoomLeaderboardCarousel
                    boards={[displayBoard]}
                    onMemberClick={(member) => setFocusedMember(member)}
                    streamForMember={streamForMember}
                    hasVideoForMember={hasVideoForMember}
                    currentUserId={currentUserId}
                    selfCameraOn={selfCamOn}
                    selfCameraStarting={videoStarting}
                    onToggleSelfCamera={toggleSelfCamera}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="min-h-0 rounded-2xl border border-border/50 bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] p-3 shadow-[0_1px_2px_rgba(17,24,39,0.04),0_6px_18px_rgba(17,24,39,0.07)]">
          <div className="flex h-full min-h-0 flex-col rounded-xl bg-background p-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Chat panel
            </p>
            <Chat
              roomCode={code}
              roomId={roomId}
              messages={initialMessages}
              currentUserId={currentUserId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
