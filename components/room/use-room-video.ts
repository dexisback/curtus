'use client';

import { useEffect } from 'react';
import { useRoomVideoContext } from '@/components/room-video-provider';

type UseRoomVideoOptions = {
  roomId: string;
};

export function useRoomVideo({ roomId }: UseRoomVideoOptions) {
  const {
    localStream,
    observeRoom,
    unobserveRoom,
    enableRoomVideo,
    disableRoomVideo,
    syncRoomVideoPeers,
    getRoomVideoState,
  } = useRoomVideoContext();
  const state = getRoomVideoState(roomId);

  useEffect(() => {
    observeRoom(roomId);
    return () => {
      unobserveRoom(roomId);
    };
  }, [observeRoom, roomId, unobserveRoom]);

  return {
    localStream,
    remoteStreams: state.remoteStreams,
    starting: state.starting,
    error: state.error,
    enabled: state.videoEnabled,
    start: () => enableRoomVideo(roomId),
    stop: () => disableRoomVideo(roomId),
    sync: () => syncRoomVideoPeers(roomId),
  };
}

// — Hook: RTCPeerConnection, socket signaling, local stream.
