import { io, type Socket } from "socket.io-client";

type ServerToClientEvents = {
  presence: (payload: {
    roomId: string;
    memberIds: string[];
    studyingUserIds: string[];
    videoEnabledUserIds: string[];
    todayMinutes: Record<string, number>;
    todaySeconds: Record<string, number>;
    sessionStartedAt: Record<string, string | null>;
  }) => void;
  "chat:message": (payload: {
    id: string;
    roomId: string;
    content: string;
    clientNonce: string | null;
    userId: string;
    userName: string;
    createdAt: string;
  }) => void;
  "session:logged": (payload: {
    durationMin: number;
    lifetimeFocusMinutes: number;
    roomId: string | null;
  }) => void;
  "ping:received": (payload: {
    fromUserId: string;
    createdAt: string;
  }) => void;
  "room:error": (payload: { message: string }) => void;
  "room:kicked": (payload: { roomId: string }) => void;
  "media:offer": (payload: {
    roomId: string;
    fromUserId: string;
    description: RTCSessionDescriptionInit;
  }) => void;
  "media:answer": (payload: {
    roomId: string;
    fromUserId: string;
    description: RTCSessionDescriptionInit;
  }) => void;
  "media:ice-candidate": (payload: {
    roomId: string;
    fromUserId: string;
    candidate: RTCIceCandidateInit;
  }) => void;
  "media:peer-left": (payload: { roomId: string; userId: string }) => void;
};

type ClientToServerEvents = {
  "room:join": (payload: { roomId: string }) => void;
  "room:leave": (payload: { roomId: string }) => void;
  "chat:send": (
    payload: { roomId: string; content: string; clientNonce: string },
    ack?: (response: {
      ok: boolean;
      message?: {
        id: string;
        roomId: string;
        content: string;
        clientNonce: string | null;
        userId: string;
        userName: string;
        createdAt: string;
      };
      error?: string;
    }) => void,
  ) => void;
  "room:video-state": (
    payload: { roomId: string; enabled: boolean },
    ack?: (response: { ok: boolean; error?: string }) => void,
  ) => void;
  "media:join": (
    payload: { roomId: string },
    ack?: (response: { ok: boolean; peers?: string[]; error?: string }) => void,
  ) => void;
  "media:leave": (payload: { roomId: string }) => void;
  "media:offer": (payload: {
    roomId: string;
    toUserId: string;
    description: RTCSessionDescriptionInit;
  }) => void;
  "media:answer": (payload: {
    roomId: string;
    toUserId: string;
    description: RTCSessionDescriptionInit;
  }) => void;
  "media:ice-candidate": (payload: {
    roomId: string;
    toUserId: string;
    candidate: RTCIceCandidateInit;
  }) => void;
  "session:started": (payload: { roomId?: string | null }) => void;
  "session:stopped": () => void;
  "ping:send": (payload: { toUserId: string }) => void;
  "presence:refresh": () => void;
};

export type StudySocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socketSingleton: StudySocket | null = null;
let socketTokenCache: { token: string; expiresAtMs: number } | null = null;
let pendingPresenceRefresh = false;

function getSocketUrl() {
  return process.env.NEXT_PUBLIC_SOCKET_URL ?? null;
}

function getCookieAuth() {
  return {
    cookie: typeof document === "undefined" ? "" : document.cookie,
  };
}

async function getSocketToken() {
  const now = Date.now();
  if (socketTokenCache && socketTokenCache.expiresAtMs > now) {
    return socketTokenCache.token;
  }
  try {
    const res = await fetch("/api/socket/token", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[realtime] socket token fetch failed", { status: res.status });
      return null;
    }
    const data = (await res.json()) as { token?: string };
    if (!data.token) return null;
    socketTokenCache = {
      token: data.token,
      expiresAtMs: now + 8 * 60 * 1000,
    };
    return data.token;
  } catch {
    return null;
  }
}

export function getSocket() {
  if (typeof window === "undefined") return null;
  const socketUrl = getSocketUrl();
  if (!socketUrl) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("NEXT_PUBLIC_SOCKET_URL is not set. Realtime features are disabled.");
    }
    return null;
  }

  if (!socketSingleton) {
    socketSingleton = io(socketUrl, {
      autoConnect: false,
      withCredentials: true,
      auth: async (cb) => {
        const token = await getSocketToken();
        cb(token ? { ...getCookieAuth(), socketToken: token } : getCookieAuth());
      },
    });

    socketSingleton.on("connect", () => {
      console.info("[realtime] socket connected", {
        id: socketSingleton?.id,
        url: socketUrl,
      });
      if (pendingPresenceRefresh && socketSingleton?.connected) {
        socketSingleton.emit("presence:refresh");
        pendingPresenceRefresh = false;
      }
    });
    socketSingleton.on("disconnect", (reason) => {
      console.warn("[realtime] socket disconnected", { reason });
    });
    socketSingleton.on("connect_error", (error) => {
      console.error("[realtime] socket connect_error", {
        message: error.message,
        name: error.name,
      });
    });
  }

  return socketSingleton;
}

export function connectWithAuth() {
  const socket = getSocket();
  if (!socket) return null;
  if (!socket.connected) socket.connect();

  return socket;
}

export function requestPresenceRefresh() {
  const socket = connectWithAuth();
  if (!socket) return;
  if (socket.connected) {
    socket.emit("presence:refresh");
    pendingPresenceRefresh = false;
  } else {
    pendingPresenceRefresh = true;
  }
}

export function disconnectSocket() {
  socketSingleton?.disconnect();
}

// — socket.ts: Browser Socket.IO client singleton, token fetch/cache, cookie + signed auth for realtime.

