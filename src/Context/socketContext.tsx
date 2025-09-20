"use client";

import { useUser } from "@clerk/nextjs";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
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

    useEffect(() => {
        if (!isLoaded || !user) return;

        console.log('Initializing socket connection...');
        
        const socketInstance = io(process.env.NODE_ENV === 'production' 
            ? process.env.NEXT_PUBLIC_SITE_URL || '' 
            : 'http://localhost:3000', {
            path: '/api/socket.io', // Fixed path to match server
            addTrailingSlash: false,
            transports: ['websocket', 'polling'], // Add transport options
        });
    
        socketInstance.on('connect', () => {
            console.log("Connected to server with socket ID:", socketInstance.id);
            setIsConnected(true);
            socketInstance.emit('user-online', user.id);
        });

        socketInstance.on('disconnect', () => {
            console.log("Disconnected from server");
            setIsConnected(false);
        });

        socketInstance.on('connect_error', (error) => {
            console.error("Socket connection error: ", error);
            setIsConnected(false);
        });

        setSocket(socketInstance);

        return () => {
            console.log('Cleaning up socket connection...');
            socketInstance.disconnect();
        };
    }, [user, isLoaded]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};