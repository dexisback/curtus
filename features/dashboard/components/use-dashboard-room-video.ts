'use client';

import { useEffect } from 'react';
import { useRoomVideoContext } from '@/components/room-video-provider';

type UseDashboardRoomVideoOptions = {
  roomId: string | null;
  videoEnabledUserIds: string[];
  currentUserId: string;
};

export function useDashboardRoomVideo({
  roomId,
  videoEnabledUserIds,
  currentUserId,
}: UseDashboardRoomVideoOptions) {
  const {
    localStream,
    observeRoom,
    unobserveRoom,
    syncRoomVideoPeers,
    getRoomVideoState,
    isRoomVideoEnabled,
  } = useRoomVideoContext();
  const state = roomId ? getRoomVideoState(roomId) : null;

  useEffect(() => {
    if (!roomId) return;
    observeRoom(roomId);
    return () => {
      unobserveRoom(roomId);
    };
  }, [observeRoom, roomId, unobserveRoom]);

  useEffect(() => {
    if (!roomId) return;
    syncRoomVideoPeers(roomId);
  }, [roomId, syncRoomVideoPeers, videoEnabledUserIds]);

  return {
    remoteStreams: state?.remoteStreams ?? {},
    streamForMember: (userId: string) =>
      userId === currentUserId
        ? localStream
        : (state?.remoteStreams[userId] ?? null),
    hasVideoForMember: (userId: string) =>
      userId === currentUserId
        ? Boolean(roomId && isRoomVideoEnabled(roomId))
        : videoEnabledUserIds.includes(userId),
  };
}
