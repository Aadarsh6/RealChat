"use client";

import { useUser } from "@clerk/nextjs";
import { createContext, ReactNode, useContext, useEffect, useState, useCallback } from "react";
import { Socket } from "socket.io-client";
import { io } from "socket.io-client";

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false  
});

export const useSocket = () => {
    return useContext(SocketContext);
}

interface SocketProviderProps {
    children: ReactNode;
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const { user, isLoaded } = useUser();

    const initializeSocket = useCallback(() => {
        if (!user) return null;

        console.log('🔧 Initializing socket connection...');
        
        const socketInstance = io(process.env.NODE_ENV === 'production' 
            ? process.env.NEXT_PUBLIC_SITE_URL || '' 
            : 'http://localhost:3000', {
            path: '/api/socket.io',
            addTrailingSlash: false,
            transports: ['websocket', 'polling'],
            timeout: 20000,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
            forceNew: true
        });

        // Connection handlers
        socketInstance.on('connect', () => {
            console.log("✅ Connected to server with socket ID:", socketInstance.id);
            setIsConnected(true);
            socketInstance.emit('user-online', user.id);
        });

        socketInstance.on('disconnect', (reason) => {
            console.log("📴 Disconnected from server, reason:", reason);
            setIsConnected(false);
        });

        socketInstance.on('reconnect', (attemptNumber) => {
            console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
            setIsConnected(true);
            socketInstance.emit('user-online', user.id);
        });

        socketInstance.on('reconnect_attempt', (attemptNumber) => {
            console.log(`🔄 Reconnection attempt ${attemptNumber}`);
        });

        socketInstance.on('reconnect_error', (error) => {
            console.error("🚫 Reconnection error:", error.message);
        });

        socketInstance.on('reconnect_failed', () => {
            console.error("❌ Failed to reconnect after maximum attempts");
        });

        socketInstance.on('connect_error', (error) => {
            console.error("❌ Socket connection error:", error.message);
            setIsConnected(false);
            
            // If websocket fails, try polling
            if (error.message.includes('websocket')) {
                console.log('🔄 Websocket failed, trying polling...');
                socketInstance.io.opts.transports = ['polling'];
            }
        });

        socketInstance.on('error', (error) => {
            console.error("💥 Socket error:", error);
        });

        return socketInstance;
    }, [user]);

    useEffect(() => {
        if (!isLoaded || !user) {
            // Clean up existing socket if user logs out
            if (socket) {
                console.log('🧹 Cleaning up socket - user logged out');
                socket.disconnect();
                setSocket(null);
                setIsConnected(false);
            }
            return;
        }

        // Initialize socket
        const socketInstance = initializeSocket();
        if (socketInstance) {
            setSocket(socketInstance);
        }

        // Cleanup function
        return () => {
            if (socketInstance) {
                console.log('🧹 Cleaning up socket connection...');
                socketInstance.disconnect();
            }
        };
    }, [user, isLoaded, initializeSocket]);

    // Handle page visibility for better connection management
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!socket) return;

            if (document.hidden) {
                console.log('📱 Page hidden - maintaining connection');
            } else {
                console.log('📱 Page visible - ensuring connection');
                if (!socket.connected) {
                    socket.connect();
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [socket]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};