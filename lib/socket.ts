import { io, type Socket } from "socket.io-client";

type ServerToClientEvents = {
  presence: (payload: {
    roomId: string;
    memberIds: string[];
    studyingUserIds: string[];
    videoEnabledUserIds: string[];
    todayMinutes: Record<string, number>;
  }) => void;
  "chat:message": (payload: {
    id: string;
    roomId: string;
    content: string;
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
};

type ClientToServerEvents = {
  "room:join": (payload: { roomId: string }) => void;
  "room:leave": (payload: { roomId: string }) => void;
  "chat:send": (payload: { roomId: string; content: string }) => void;
  "room:video-state": (payload: { roomId: string; enabled: boolean }) => void;
  "session:started": (payload: { roomId?: string | null }) => void;
  "session:stopped": () => void;
  "ping:send": (payload: { toUserId: string }) => void;
};

export type StudySocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socketSingleton: StudySocket | null = null;

function getSocketUrl() {
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (!socketUrl) throw new Error("Missing NEXT_PUBLIC_SOCKET_URL for socket client.");
  return socketUrl;
}

function getCookieAuth() {
  return {
    cookie: typeof document === "undefined" ? "" : document.cookie,
  };
}

export function getSocket() {
  if (typeof window === "undefined") return null;

  if (!socketSingleton) {
    socketSingleton = io(getSocketUrl(), {
      autoConnect: false,
      withCredentials: true,
      auth: getCookieAuth(),
    });
  }

  return socketSingleton;
}

export function connectWithAuth() {
  const socket = getSocket();
  if (!socket) return null;

  socket.auth = getCookieAuth();
  if (!socket.connected) socket.connect();

  return socket;
}

export function disconnectSocket() {
  socketSingleton?.disconnect();
}
