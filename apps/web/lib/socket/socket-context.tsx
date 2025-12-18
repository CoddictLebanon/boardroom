"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@clerk/nextjs";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  error: string | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  error: null,
});

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const initSocket = async () => {
      try {
        const token = await getToken();

        if (!token) {
          setError("No authentication token available");
          return;
        }

        const newSocket = io(`${SOCKET_URL}/meetings`, {
          auth: {
            token,
          },
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        newSocket.on("connect", () => {
          setIsConnected(true);
          setError(null);
          console.log("Socket connected");
        });

        newSocket.on("disconnect", (reason) => {
          setIsConnected(false);
          console.log("Socket disconnected:", reason);
        });

        newSocket.on("connect_error", (err) => {
          setError(err.message);
          console.error("Socket connection error:", err);
        });

        setSocket(newSocket);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Socket initialization failed";
        setError(errorMessage);
        console.error("Socket initialization error:", err);
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
    <SocketContext.Provider value={{ socket, isConnected, error }}>
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
