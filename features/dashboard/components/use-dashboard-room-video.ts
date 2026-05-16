'use client';

type UseDashboardRoomVideoOptions = {
  roomId: string | null;
  videoEnabledUserIds: string[];
  currentUserId: string;
};

// Dashboard no longer drives WebRTC signaling.
// Video relay is room-scoped only via components/room/use-room-video.ts.
export function useDashboardRoomVideo({
  roomId,
  videoEnabledUserIds,
  currentUserId,
}: UseDashboardRoomVideoOptions) {
  return {
    remoteStreams: {},
    streamForMember: (_userId: string) => null as MediaStream | null,
    hasVideoForMember: (userId: string) =>
      Boolean(roomId) &&
      (userId === currentUserId
        ? videoEnabledUserIds.includes(currentUserId)
        : videoEnabledUserIds.includes(userId)),
  };
}

// — Dashboard hook intentionally passive after video architecture rollback.
