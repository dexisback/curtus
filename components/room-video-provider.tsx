'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { connectWithAuth } from '@/lib/socket';

type RoomVideoView = {
  videoEnabled: boolean;
  starting: boolean;
  error: string | null;
  remoteStreams: Record<string, MediaStream>;
};

type RoomVideoRuntime = {
  view: RoomVideoView;
  observerCount: number;
  joined: boolean;
  syncInFlight: boolean;
  syncQueued: boolean;
  peers: Map<string, RTCPeerConnection>;
  pendingCandidates: Map<string, RTCIceCandidateInit[]>;
};

type RoomVideoContextValue = {
  localStream: MediaStream | null;
  roomViews: Record<string, RoomVideoView>;
  observeRoom: (roomId: string) => void;
  unobserveRoom: (roomId: string) => void;
  enableRoomVideo: (roomId: string) => Promise<void>;
  disableRoomVideo: (roomId: string) => Promise<void>;
  forceRoomVideoOff: (roomId: string) => void;
  syncRoomVideoPeers: (roomId: string) => void;
  isRoomVideoEnabled: (roomId: string) => boolean;
  getRoomVideoState: (roomId: string) => RoomVideoView;
};

const DEFAULT_ROOM_VIDEO_VIEW: RoomVideoView = {
  videoEnabled: false,
  starting: false,
  error: null,
  remoteStreams: {},
};

const RoomVideoContext = createContext<RoomVideoContextValue | null>(null);

function describeMediaError(error: unknown): string {
  if (error && typeof error === 'object' && 'name' in error) {
    const name = String((error as { name?: unknown }).name ?? '');
    switch (name) {
      case 'NotAllowedError':
      case 'SecurityError':
        return 'Camera permission denied.';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'No camera found.';
      case 'NotReadableError':
      case 'TrackStartError':
        return 'Camera is already in use.';
      case 'OverconstrainedError':
      case 'ConstraintNotSatisfiedError':
        return 'Camera does not meet the required constraints.';
      case 'NotSupportedError':
        return 'Camera is not supported in this browser.';
      default:
        break;
    }
  }
  return error instanceof Error && error.message
    ? error.message
    : 'Could not start camera.';
}

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

export function RoomVideoProvider({ children }: { children: React.ReactNode }) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [roomViews, setRoomViews] = useState<Record<string, RoomVideoView>>({});
  const roomRefs = useRef<Map<string, RoomVideoRuntime>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const localStreamPromiseRef = useRef<Promise<MediaStream> | null>(null);
  const roomViewsRef = useRef(roomViews);

  useEffect(() => {
    roomViewsRef.current = roomViews;
  }, [roomViews]);

  const getOrCreateRoom = useCallback((roomId: string) => {
    let runtime = roomRefs.current.get(roomId);
    if (runtime) return runtime;
    runtime = {
      view: { ...DEFAULT_ROOM_VIDEO_VIEW },
      observerCount: 0,
      joined: false,
      syncInFlight: false,
      syncQueued: false,
      peers: new Map(),
      pendingCandidates: new Map(),
    };
    roomRefs.current.set(roomId, runtime);
    return runtime;
  }, []);

  const patchRoomView = useCallback(
    (
      roomId: string,
      updater:
        | Partial<RoomVideoView>
        | ((prev: RoomVideoView) => RoomVideoView),
    ) => {
      const runtime = getOrCreateRoom(roomId);
      const nextView =
        typeof updater === 'function'
          ? updater(runtime.view)
          : { ...runtime.view, ...updater };
      runtime.view = nextView;
      setRoomViews((prev) => ({ ...prev, [roomId]: nextView }));
      return runtime;
    },
    [getOrCreateRoom],
  );

  const removeRoomView = useCallback((roomId: string) => {
    setRoomViews((prev) => {
      if (!(roomId in prev)) return prev;
      const next = { ...prev };
      delete next[roomId];
      return next;
    });
  }, []);

  const shouldRemainJoined = useCallback((runtime: RoomVideoRuntime) => {
    return runtime.observerCount > 0 || runtime.view.videoEnabled;
  }, []);

  const closePeer = useCallback(
    (roomId: string, peerId: string) => {
      const runtime = roomRefs.current.get(roomId);
      if (!runtime) return;
      runtime.peers.get(peerId)?.close();
      runtime.peers.delete(peerId);
      runtime.pendingCandidates.delete(peerId);
      if (!(peerId in runtime.view.remoteStreams)) return;
      patchRoomView(roomId, (prev) => {
        const nextStreams = { ...prev.remoteStreams };
        delete nextStreams[peerId];
        return { ...prev, remoteStreams: nextStreams };
      });
    },
    [patchRoomView],
  );

  const closeAllPeers = useCallback(
    (roomId: string) => {
      const runtime = roomRefs.current.get(roomId);
      if (!runtime) return;
      runtime.peers.forEach((peer) => peer.close());
      runtime.peers.clear();
      runtime.pendingCandidates.clear();
      if (Object.keys(runtime.view.remoteStreams).length === 0) return;
      patchRoomView(roomId, (prev) => ({ ...prev, remoteStreams: {} }));
    },
    [patchRoomView],
  );

  const stopLocalStreamIfUnused = useCallback(() => {
    const anyEnabled = [...roomRefs.current.values()].some(
      (runtime) => runtime.view.videoEnabled,
    );
    if (anyEnabled) return;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    localStreamPromiseRef.current = null;
    setLocalStream(null);
  }, []);

  const leaveRoomIfIdle = useCallback(
    (roomId: string) => {
      const runtime = roomRefs.current.get(roomId);
      if (!runtime || shouldRemainJoined(runtime)) return;
      const socket = connectWithAuth();
      if (runtime.joined) {
        socket?.emit('room:leave', { roomId });
      }
      runtime.joined = false;
      closeAllPeers(roomId);
      roomRefs.current.delete(roomId);
      removeRoomView(roomId);
    },
    [closeAllPeers, removeRoomView, shouldRemainJoined],
  );

  const ensureLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    if (localStreamPromiseRef.current) return localStreamPromiseRef.current;
    localStreamPromiseRef.current = navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        localStreamRef.current = stream;
        setLocalStream(stream);
        localStreamPromiseRef.current = null;
        return stream;
      })
      .catch((error) => {
        localStreamPromiseRef.current = null;
        throw error;
      });
    return localStreamPromiseRef.current;
  }, []);

  const ensureRoomJoined = useCallback(
    (roomId: string) => {
      const runtime = getOrCreateRoom(roomId);
      if (runtime.joined) return runtime;
      const socket = connectWithAuth();
      socket?.emit('room:join', { roomId });
      runtime.joined = true;
      return runtime;
    },
    [getOrCreateRoom],
  );

  const addPendingCandidates = useCallback(
    async (roomId: string, peerId: string, peer: RTCPeerConnection) => {
      const runtime = roomRefs.current.get(roomId);
      if (!runtime || !peer.remoteDescription) return;
      const candidates = runtime.pendingCandidates.get(peerId) ?? [];
      runtime.pendingCandidates.delete(peerId);
      for (const candidate of candidates) {
        await peer.addIceCandidate(candidate);
      }
    },
    [],
  );

  const createPeer = useCallback(
    (roomId: string, peerId: string) => {
      const runtime = getOrCreateRoom(roomId);
      const existing = runtime.peers.get(peerId);
      if (existing) return existing;

      const socket = connectWithAuth();
      const peer = new RTCPeerConnection({ iceServers: getIceServers() });
      runtime.peers.set(peerId, peer);

      if (runtime.view.videoEnabled && localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          peer.addTrack(track, localStreamRef.current!);
        });
      } else {
        peer.addTransceiver('video', { direction: 'recvonly' });
      }

      peer.onicecandidate = (event) => {
        if (!event.candidate) return;
        socket?.emit('media:ice-candidate', {
          roomId,
          toUserId: peerId,
          candidate: event.candidate.toJSON(),
        });
      };

      peer.ontrack = (event) => {
        patchRoomView(roomId, (prev) => {
          const stream = prev.remoteStreams[peerId] ?? new MediaStream();
          event.streams[0]?.getTracks().forEach((track) => {
            if (
              !stream
                .getTracks()
                .some((existingTrack) => existingTrack.id === track.id)
            ) {
              stream.addTrack(track);
            }
          });
          return {
            ...prev,
            remoteStreams: { ...prev.remoteStreams, [peerId]: stream },
          };
        });
      };

      peer.onconnectionstatechange = () => {
        if (
          peer.connectionState === 'failed' ||
          peer.connectionState === 'closed' ||
          peer.connectionState === 'disconnected'
        ) {
          closePeer(roomId, peerId);
        }
      };

      return peer;
    },
    [closePeer, getOrCreateRoom, patchRoomView],
  );

  const syncRoomVideoPeers = useCallback(
    (roomId: string) => {
      const runtime = roomRefs.current.get(roomId);
      if (!runtime || !shouldRemainJoined(runtime)) return;
      if (runtime.syncInFlight) {
        runtime.syncQueued = true;
        return;
      }

      runtime.syncInFlight = true;
      const run = async () => {
        try {
          do {
            runtime.syncQueued = false;
            const socket = connectWithAuth();
            if (!socket) return;

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
                (response: {
                  ok: boolean;
                  peers?: string[];
                  error?: string;
                }) => {
                  window.clearTimeout(timeout);
                  resolve(response);
                },
              );
            });

            if (!joined.ok) return;

            const peerIds = new Set(joined.peers ?? []);
            for (const peerId of [...runtime.peers.keys()]) {
              if (!peerIds.has(peerId)) closePeer(roomId, peerId);
            }

            for (const peerId of joined.peers ?? []) {
              if (runtime.peers.has(peerId)) continue;
              const peer = createPeer(roomId, peerId);
              const offer = await peer.createOffer();
              await peer.setLocalDescription(offer);
              socket.emit('media:offer', {
                roomId,
                toUserId: peerId,
                description: offer,
              });
            }
          } while (runtime.syncQueued);
        } finally {
          runtime.syncInFlight = false;
        }
      };

      void run();
    },
    [closePeer, createPeer, shouldRemainJoined],
  );

  const observeRoom = useCallback(
    (roomId: string) => {
      const runtime = ensureRoomJoined(roomId);
      runtime.observerCount += 1;
      syncRoomVideoPeers(roomId);
    },
    [ensureRoomJoined, syncRoomVideoPeers],
  );

  const unobserveRoom = useCallback(
    (roomId: string) => {
      const runtime = roomRefs.current.get(roomId);
      if (!runtime) return;
      runtime.observerCount = Math.max(0, runtime.observerCount - 1);
      if (!runtime.view.videoEnabled) {
        leaveRoomIfIdle(roomId);
      }
    },
    [leaveRoomIfIdle],
  );

  const disableRoomVideo = useCallback(
    async (roomId: string) => {
      const runtime = roomRefs.current.get(roomId);
      if (!runtime) return;
      patchRoomView(roomId, (prev) => ({
        ...prev,
        videoEnabled: false,
        starting: false,
        error: null,
      }));
      closeAllPeers(roomId);

      const socket = connectWithAuth();
      await new Promise<void>((resolve) => {
        if (!socket) {
          resolve();
          return;
        }
        socket.emit('room:video-state', { roomId, enabled: false }, () =>
          resolve(),
        );
      });

      if (runtime.observerCount > 0) {
        syncRoomVideoPeers(roomId);
      } else {
        leaveRoomIfIdle(roomId);
      }
      stopLocalStreamIfUnused();
    },
    [
      closeAllPeers,
      leaveRoomIfIdle,
      patchRoomView,
      stopLocalStreamIfUnused,
      syncRoomVideoPeers,
    ],
  );

  const forceRoomVideoOff = useCallback(
    (roomId: string) => {
      const runtime = roomRefs.current.get(roomId);
      if (!runtime) return;
      patchRoomView(roomId, (prev) => ({
        ...prev,
        videoEnabled: false,
        starting: false,
      }));
      closeAllPeers(roomId);
      leaveRoomIfIdle(roomId);
      stopLocalStreamIfUnused();
    },
    [closeAllPeers, leaveRoomIfIdle, patchRoomView, stopLocalStreamIfUnused],
  );

  const enableRoomVideo = useCallback(
    async (roomId: string) => {
      const runtime = ensureRoomJoined(roomId);
      patchRoomView(roomId, (prev) => ({
        ...prev,
        starting: true,
        error: null,
      }));

      try {
        await ensureLocalStream();
        const socket = connectWithAuth();
        if (!socket) throw new Error('Socket unavailable.');

        const allowed = await new Promise<{ ok: boolean; error?: string }>(
          (resolve) => {
            const timeout = window.setTimeout(
              () => resolve({ ok: false, error: 'socket_timeout' }),
              8_000,
            );
            socket.emit(
              'room:video-state',
              { roomId, enabled: true },
              (response: { ok: boolean; error?: string }) => {
                window.clearTimeout(timeout);
                resolve(response);
              },
            );
          },
        );

        if (!allowed.ok) {
          throw new Error(
            allowed.error === 'video_room_full'
              ? 'Room video is full.'
              : allowed.error === 'not_in_room'
                ? 'Join the room first.'
                : allowed.error === 'socket_timeout'
                  ? 'Socket timeout. Refresh and try again.'
                  : 'Could not start video.',
          );
        }

        patchRoomView(roomId, (prev) => ({
          ...prev,
          videoEnabled: true,
          starting: false,
          error: null,
        }));
        closeAllPeers(roomId);
        syncRoomVideoPeers(roomId);
      } catch (error) {
        patchRoomView(roomId, (prev) => ({
          ...prev,
          starting: false,
          error: describeMediaError(error),
        }));
        if (runtime.observerCount === 0) {
          leaveRoomIfIdle(roomId);
        }
        stopLocalStreamIfUnused();
      }
    },
    [
      closeAllPeers,
      ensureLocalStream,
      ensureRoomJoined,
      leaveRoomIfIdle,
      patchRoomView,
      stopLocalStreamIfUnused,
      syncRoomVideoPeers,
    ],
  );

  useEffect(() => {
    const socket = connectWithAuth();
    if (!socket) return;

    const onPresence = (payload: {
      roomId: string;
      memberIds: string[];
      studyingUserIds: string[];
      videoEnabledUserIds: string[];
      todayMinutes: Record<string, number>;
      todaySeconds: Record<string, number>;
      sessionStartedAt: Record<string, string | null>;
    }) => {
      const runtime = roomRefs.current.get(payload.roomId);
      if (!runtime) return;
      if (shouldRemainJoined(runtime)) {
        syncRoomVideoPeers(payload.roomId);
      }
    };

    const onOffer = async (payload: {
      roomId: string;
      fromUserId: string;
      description: RTCSessionDescriptionInit;
    }) => {
      const runtime = roomRefs.current.get(payload.roomId);
      if (!runtime || !shouldRemainJoined(runtime)) return;
      const peer = createPeer(payload.roomId, payload.fromUserId);
      await peer.setRemoteDescription(payload.description);
      await addPendingCandidates(payload.roomId, payload.fromUserId, peer);
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
      const runtime = roomRefs.current.get(payload.roomId);
      const peer = runtime?.peers.get(payload.fromUserId);
      if (!runtime || !peer) return;
      await peer.setRemoteDescription(payload.description);
      await addPendingCandidates(payload.roomId, payload.fromUserId, peer);
    };

    const onIce = async (payload: {
      roomId: string;
      fromUserId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      const runtime = roomRefs.current.get(payload.roomId);
      if (!runtime) return;
      const peer = runtime.peers.get(payload.fromUserId);
      if (!peer || !peer.remoteDescription) {
        const pending = runtime.pendingCandidates.get(payload.fromUserId) ?? [];
        pending.push(payload.candidate);
        runtime.pendingCandidates.set(payload.fromUserId, pending);
        return;
      }
      await peer.addIceCandidate(payload.candidate);
    };

    const onPeerLeft = (payload: { roomId: string; userId: string }) => {
      closePeer(payload.roomId, payload.userId);
    };

    const onRoomKicked = (payload: { roomId: string }) => {
      forceRoomVideoOff(payload.roomId);
    };

    const onConnect = () => {
      for (const [roomId, runtime] of roomRefs.current.entries()) {
        runtime.joined = false;
        closeAllPeers(roomId);
        if (!shouldRemainJoined(runtime)) continue;
        ensureRoomJoined(roomId);
        if (runtime.view.videoEnabled) {
          void (async () => {
            const reconnectSocket = connectWithAuth();
            await new Promise<void>((resolve) => {
              reconnectSocket?.emit(
                'room:video-state',
                { roomId, enabled: true },
                () => resolve(),
              );
            });
            syncRoomVideoPeers(roomId);
          })();
        } else {
          syncRoomVideoPeers(roomId);
        }
      }
      socket.emit('presence:refresh');
    };

    socket.on('presence', onPresence);
    socket.on('media:offer', onOffer);
    socket.on('media:answer', onAnswer);
    socket.on('media:ice-candidate', onIce);
    socket.on('media:peer-left', onPeerLeft);
    socket.on('room:kicked', onRoomKicked);
    socket.on('connect', onConnect);

    return () => {
      socket.off('presence', onPresence);
      socket.off('media:offer', onOffer);
      socket.off('media:answer', onAnswer);
      socket.off('media:ice-candidate', onIce);
      socket.off('media:peer-left', onPeerLeft);
      socket.off('room:kicked', onRoomKicked);
      socket.off('connect', onConnect);
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [
    addPendingCandidates,
    closeAllPeers,
    closePeer,
    createPeer,
    ensureRoomJoined,
    forceRoomVideoOff,
    shouldRemainJoined,
    syncRoomVideoPeers,
  ]);

  const value = useMemo<RoomVideoContextValue>(
    () => ({
      localStream,
      roomViews,
      observeRoom,
      unobserveRoom,
      enableRoomVideo,
      disableRoomVideo,
      forceRoomVideoOff,
      syncRoomVideoPeers,
      isRoomVideoEnabled: (roomId: string) =>
        roomViewsRef.current[roomId]?.videoEnabled ?? false,
      getRoomVideoState: (roomId: string) =>
        roomViewsRef.current[roomId] ?? DEFAULT_ROOM_VIDEO_VIEW,
    }),
    [
      disableRoomVideo,
      enableRoomVideo,
      forceRoomVideoOff,
      localStream,
      observeRoom,
      roomViews,
      syncRoomVideoPeers,
      unobserveRoom,
    ],
  );

  return (
    <RoomVideoContext.Provider value={value}>
      {children}
    </RoomVideoContext.Provider>
  );
}

export function useRoomVideoContext() {
  const value = useContext(RoomVideoContext);
  if (!value) {
    throw new Error(
      'useRoomVideoContext must be used within RoomVideoProvider.',
    );
  }
  return value;
}
