"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getWebSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")
  ) {
    return "http://localhost:4000";
  }
  return "https://coopgig.onrender.com";
}

export function getSocket(): Socket {
  if (socket) return socket;

  const url = getWebSocketUrl();
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("coopgig_token")
      : null;

  socket = io(url, {
    path: "/ws",
    auth: { token },
    autoConnect: false,
    transports: ["websocket", "polling"],
  });

  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
