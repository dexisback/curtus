"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { connectWithAuth } from "@/lib/socket";

type UseRoomVideoOptions = {
  roomId: string;
  currentUserId: string;
  videoEnabledUserIds: string[];
};

function getIceServers(): RTCIceServer[] {
  const fallback: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
  const raw = process.env.NEXT_PUBLIC_RTC_ICE_SERVERS_JSON;
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as RTCIceServer[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function useRoomVideo({
  roomId,
  currentUserId,
  videoEnabledUserIds,
}: UseRoomVideoOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  const closePeer = useCallback((peerId: string) => {
    peersRef.current.get(peerId)?.close();
    peersRef.current.delete(peerId);
    pendingCandidatesRef.current.delete(peerId);
    setRemoteStreams((prev) => {
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  }, []);

  const createPeer = useCallback((peerId: string) => {
    const existing = peersRef.current.get(peerId);
    if (existing) return existing;

    const socket = connectWithAuth();
    const peer = new RTCPeerConnection({ iceServers: getIceServers() });
    peersRef.current.set(peerId, peer);

    localStreamRef.current?.getTracks().forEach((track) => {
      peer.addTrack(track, localStreamRef.current!);
    });

    peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      socket?.emit("media:ice-candidate", {
        roomId,
        toUserId: peerId,
        candidate: event.candidate.toJSON(),
      });
    };

    peer.ontrack = (event) => {
      setRemoteStreams((prev) => {
        const stream = prev[peerId] ?? new MediaStream();
        event.streams[0]?.getTracks().forEach((track) => {
          if (!stream.getTracks().some((existingTrack) => existingTrack.id === track.id)) {
            stream.addTrack(track);
          }
        });
        return { ...prev, [peerId]: stream };
      });
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "failed" || peer.connectionState === "closed") {
        closePeer(peerId);
      }
    };

    return peer;
  }, [closePeer, roomId]);

  const addPendingCandidates = useCallback(async (peerId: string, peer: RTCPeerConnection) => {
    if (!peer.remoteDescription) return;
    const candidates = pendingCandidatesRef.current.get(peerId) ?? [];
    pendingCandidatesRef.current.delete(peerId);
    for (const candidate of candidates) {
      await peer.addIceCandidate(candidate);
    }
  }, []);

  const stop = useCallback(() => {
    const socket = connectWithAuth();
    socket?.emit("media:leave", { roomId });
    socket?.emit("room:video-state", { roomId, enabled: false });
    peersRef.current.forEach((peer) => peer.close());
    peersRef.current.clear();
    pendingCandidatesRef.current.clear();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStreams({});
    setStarting(false);
  }, [roomId]);

  const start = useCallback(async () => {
    if (localStreamRef.current || starting) return;
    setStarting(true);
    setError(null);

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const socket = connectWithAuth();
      if (!socket) throw new Error("Socket unavailable.");

      const allowed = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
        const timeout = window.setTimeout(() => resolve({ ok: false, error: "socket_timeout" }), 8_000);
        socket.emit(
          "room:video-state",
          { roomId, enabled: true },
          (response: { ok: boolean; error?: string }) => {
            window.clearTimeout(timeout);
            resolve(response);
          },
        );
      });

      if (!allowed.ok) {
        throw new Error(allowed.error === "video_room_full" ? "Room video is full." : "Could not start video.");
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      const joined = await new Promise<{ ok: boolean; peers?: string[]; error?: string }>((resolve) => {
        const timeout = window.setTimeout(() => resolve({ ok: false, error: "socket_timeout" }), 8_000);
        socket.emit(
          "media:join",
          { roomId },
          (response: { ok: boolean; peers?: string[]; error?: string }) => {
            window.clearTimeout(timeout);
            resolve(response);
          },
        );
      });

      if (!joined.ok) throw new Error("Could not join room video.");

      for (const peerId of joined.peers ?? []) {
        const peer = createPeer(peerId);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit("media:offer", { roomId, toUserId: peerId, description: offer });
      }
    } catch (err) {
      stream?.getTracks().forEach((track) => track.stop());
      setError(err instanceof Error ? err.message : "Could not start video.");
      stop();
    } finally {
      setStarting(false);
    }
  }, [createPeer, roomId, starting, stop]);

  useEffect(() => {
    const socket = connectWithAuth();
    if (!socket) return;

    const onOffer = async (payload: {
      roomId: string;
      fromUserId: string;
      description: RTCSessionDescriptionInit;
    }) => {
      if (payload.roomId !== roomId || !localStreamRef.current) return;
      const peer = createPeer(payload.fromUserId);
      await peer.setRemoteDescription(payload.description);
      await addPendingCandidates(payload.fromUserId, peer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("media:answer", {
        roomId,
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
        const pending = pendingCandidatesRef.current.get(payload.fromUserId) ?? [];
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

    socket.on("media:offer", onOffer);
    socket.on("media:answer", onAnswer);
    socket.on("media:ice-candidate", onIce);
    socket.on("media:peer-left", onPeerLeft);

    return () => {
      socket.off("media:offer", onOffer);
      socket.off("media:answer", onAnswer);
      socket.off("media:ice-candidate", onIce);
      socket.off("media:peer-left", onPeerLeft);
    };
  }, [addPendingCandidates, closePeer, createPeer, roomId]);

  useEffect(() => {
    if (localStreamRef.current && !videoEnabledUserIds.includes(currentUserId)) {
      stop();
    }
  }, [currentUserId, stop, videoEnabledUserIds]);

  useEffect(() => stop, [stop]);

  return {
    localStream,
    remoteStreams,
    starting,
    error,
    start,
    stop,
  };
}
