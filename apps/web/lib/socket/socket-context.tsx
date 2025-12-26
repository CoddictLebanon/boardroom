"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@clerk/nextjs";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  isAuthenticated: false,
  error: null,
});

// Extract base URL without /api/v1 path for socket connection
const getSocketUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  try {
    const url = new URL(apiUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "http://localhost:3001";
  }
};
const SOCKET_URL = getSocketUrl();

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
        setIsAuthenticated(false);
      }
      return;
    }

    const initSocket = async () => {
      try {
        const token = await getToken();
        console.log("[Socket] Initializing socket connection to:", `${SOCKET_URL}/meetings`);
        console.log("[Socket] Token available:", !!token);

        if (!token) {
          setError("No authentication token available");
          console.error("[Socket] No token available");
          return;
        }

        const newSocket = io(`${SOCKET_URL}/meetings`, {
          auth: async (cb) => {
            // Get fresh token on each connection/reconnection
            const freshToken = await getToken();
            cb({ token: freshToken });
          },
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        newSocket.on("connect", () => {
          console.log("[Socket] Connected successfully! Socket ID:", newSocket.id);
          setIsConnected(true);
          setError(null);
        });

        newSocket.on("authenticated", (data) => {
          console.log("[Socket] Authenticated! User:", data?.userId);
          setIsAuthenticated(true);
        });

        newSocket.on("disconnect", (reason) => {
          console.log("[Socket] Disconnected. Reason:", reason);
          setIsConnected(false);
          setIsAuthenticated(false);
        });

        newSocket.on("connect_error", (err) => {
          console.error("[Socket] Connection error:", err.message);
          setError(err.message);
        });

        // Debug: log all incoming events
        newSocket.onAny((eventName, ...args) => {
          console.log("[Socket] Received event:", eventName, args);
        });

        setSocket(newSocket);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Socket initialization failed";
        setError(errorMessage);
        console.error("[Socket] Initialization error:", err);
      }
    };

    initSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [isSignedIn, getToken]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, isAuthenticated, error }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
