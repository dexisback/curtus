'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { connectWithAuth } from '@/lib/socket';

type UseDashboardRoomVideoOptions = {
  roomId: string | null;
  videoEnabledUserIds: string[];
};

function getIceServers(): RTCIceServer[] {
  const fallback: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
  const raw = process.env.NEXT_PUBLIC_RTC_ICE_SERVERS_JSON;
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as RTCIceServer[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function useDashboardRoomVideo({
  roomId,
  videoEnabledUserIds,
}: UseDashboardRoomVideoOptions) {
  const [remoteStreams, setRemoteStreams] = useState<
    Record<string, MediaStream>
  >({});
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(
    new Map(),
  );
  const joinedRoomRef = useRef<string | null>(null);

  const closePeer = useCallback((peerId: string) => {
    peersRef.current.get(peerId)?.close();
    peersRef.current.delete(peerId);
    pendingCandidatesRef.current.delete(peerId);
    setRemoteStreams((prev) => {
      if (!(peerId in prev)) return prev;
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  }, []);

  const resetPeers = useCallback(() => {
    peersRef.current.forEach((peer) => peer.close());
    peersRef.current.clear();
    pendingCandidatesRef.current.clear();
    setRemoteStreams({});
  }, []);

  const addPendingCandidates = useCallback(
    async (peerId: string, peer: RTCPeerConnection) => {
      if (!peer.remoteDescription) return;
      const candidates = pendingCandidatesRef.current.get(peerId) ?? [];
      pendingCandidatesRef.current.delete(peerId);
      for (const candidate of candidates) {
        await peer.addIceCandidate(candidate);
      }
    },
    [],
  );

  const createPeer = useCallback(
    (peerId: string) => {
      const existing = peersRef.current.get(peerId);
      if (existing) return existing;

      const socket = connectWithAuth();
      const peer = new RTCPeerConnection({ iceServers: getIceServers() });
      peersRef.current.set(peerId, peer);
      peer.addTransceiver('video', { direction: 'recvonly' });

      peer.onicecandidate = (event) => {
        if (!event.candidate || !roomId) return;
        socket?.emit('media:ice-candidate', {
          roomId,
          toUserId: peerId,
          candidate: event.candidate.toJSON(),
        });
      };

      peer.ontrack = (event) => {
        setRemoteStreams((prev) => {
          const stream = prev[peerId] ?? new MediaStream();
          event.streams[0]?.getTracks().forEach((track) => {
            if (
              !stream
                .getTracks()
                .some((existingTrack) => existingTrack.id === track.id)
            ) {
              stream.addTrack(track);
            }
          });
          return { ...prev, [peerId]: stream };
        });
      };

      peer.onconnectionstatechange = () => {
        if (
          peer.connectionState === 'failed' ||
          peer.connectionState === 'closed' ||
          peer.connectionState === 'disconnected'
        ) {
          closePeer(peerId);
        }
      };

      return peer;
    },
    [closePeer, roomId],
  );

  useEffect(() => {
    const socket = connectWithAuth();
    if (!socket || !roomId) {
      if (joinedRoomRef.current) {
        socket?.emit('media:leave', { roomId: joinedRoomRef.current });
        socket?.emit('room:leave', { roomId: joinedRoomRef.current });
        joinedRoomRef.current = null;
      }
      return;
    }

    const joinRoom = () => {
      if (joinedRoomRef.current && joinedRoomRef.current !== roomId) {
        socket.emit('media:leave', { roomId: joinedRoomRef.current });
        socket.emit('room:leave', { roomId: joinedRoomRef.current });
        resetPeers();
      }
      joinedRoomRef.current = roomId;
      socket.emit('room:join', { roomId });
      socket.emit('presence:refresh');
    };

    joinRoom();
    const onConnect = () => joinRoom();
    socket.on('connect', onConnect);

    return () => {
      socket.off('connect', onConnect);
    };
  }, [resetPeers, roomId]);

  useEffect(() => {
    const socket = connectWithAuth();
    if (!socket || !roomId) return;

    let cancelled = false;

    const syncPeers = async () => {
      const enabledPeers = videoEnabledUserIds.filter(Boolean).sort();
      const activePeers = new Set(enabledPeers);

      for (const peerId of [...peersRef.current.keys()]) {
        if (!activePeers.has(peerId)) {
          closePeer(peerId);
        }
      }

      if (enabledPeers.length === 0) return;

      const joined = await new Promise<{
        ok: boolean;
        peers?: string[];
        error?: string;
      }>((resolve) => {
        const timeout = window.setTimeout(
          () => resolve({ ok: false, error: 'socket_timeout' }),
          8_000,
        );
        socket.emit(
          'media:join',
          { roomId },
          (response: { ok: boolean; peers?: string[]; error?: string }) => {
            window.clearTimeout(timeout);
            resolve(response);
          },
        );
      });

      if (!joined.ok || cancelled) return;

      for (const peerId of joined.peers ?? []) {
        if (!activePeers.has(peerId) || peersRef.current.has(peerId)) continue;
        const peer = createPeer(peerId);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit('media:offer', {
          roomId,
          toUserId: peerId,
          description: offer,
        });
      }
    };

    void syncPeers();

    return () => {
      cancelled = true;
    };
  }, [closePeer, createPeer, resetPeers, roomId, videoEnabledUserIds]);

  useEffect(() => {
    const socket = connectWithAuth();
    if (!socket) return;

    const onOffer = async (payload: {
      roomId: string;
      fromUserId: string;
      description: RTCSessionDescriptionInit;
    }) => {
      if (payload.roomId !== roomId) return;
      const peer = createPeer(payload.fromUserId);
      await peer.setRemoteDescription(payload.description);
      await addPendingCandidates(payload.fromUserId, peer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit('media:answer', {
        roomId: payload.roomId,
        toUserId: payload.fromUserId,
        description: answer,
      });
    };

    const onAnswer = async (payload: {
      roomId: string;
      fromUserId: string;
      description: RTCSessionDescriptionInit;
    }) => {
      if (payload.roomId !== roomId) return;
      const peer = peersRef.current.get(payload.fromUserId);
      if (!peer) return;
      await peer.setRemoteDescription(payload.description);
      await addPendingCandidates(payload.fromUserId, peer);
    };

    const onIce = async (payload: {
      roomId: string;
      fromUserId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      if (payload.roomId !== roomId) return;
      const peer = peersRef.current.get(payload.fromUserId);
      if (!peer || !peer.remoteDescription) {
        const pending =
          pendingCandidatesRef.current.get(payload.fromUserId) ?? [];
        pending.push(payload.candidate);
        pendingCandidatesRef.current.set(payload.fromUserId, pending);
        return;
      }
      await peer.addIceCandidate(payload.candidate);
    };

    const onPeerLeft = (payload: { roomId: string; userId: string }) => {
      if (payload.roomId !== roomId) return;
      closePeer(payload.userId);
    };

    socket.on('media:offer', onOffer);
    socket.on('media:answer', onAnswer);
    socket.on('media:ice-candidate', onIce);
    socket.on('media:peer-left', onPeerLeft);

    return () => {
      socket.off('media:offer', onOffer);
      socket.off('media:answer', onAnswer);
      socket.off('media:ice-candidate', onIce);
      socket.off('media:peer-left', onPeerLeft);
    };
  }, [addPendingCandidates, closePeer, createPeer, roomId]);

  useEffect(
    () => () => {
      const socket = connectWithAuth();
      if (joinedRoomRef.current) {
        socket?.emit('media:leave', { roomId: joinedRoomRef.current });
        socket?.emit('room:leave', { roomId: joinedRoomRef.current });
      }
      joinedRoomRef.current = null;
      resetPeers();
    },
    [resetPeers],
  );

  return {
    remoteStreams,
    streamForMember: (userId: string) => remoteStreams[userId] ?? null,
    hasVideoForMember: (userId: string) => videoEnabledUserIds.includes(userId),
  };
}
