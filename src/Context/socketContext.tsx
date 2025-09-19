"use client";

import { useUser } from "@clerk/nextjs";
import { error } from "console";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { Socket } from "socket.io";
import { io } from "socket.io-client";


interface socketContextType{
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<socketContextType>({
    socket: null,
    isConnected: false  
});

export const useSocket = ()=>{
    return useContext(SocketContext)
}

interface SocketProviderProps{
    children: ReactNode;
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
    const [socket, setSocket] = useState()
    const [isConnected, setIsConnected] = useState(false)
    const { user, isLoaded } = useUser()

    useEffect(()=>{
        if(!isLoaded || !user) return

        const SocketInstance = io(process.env.NODE_ENV === 'production' 
            ? process.env.NEXT_PUBLIC_SITE_URL || '' 
            : 'http://localhost:3000', {
            path: '/api/v1/socketIo/socket.io',
            addTrailingSlash: false
    }) ;
    
    SocketInstance.on('connect', ()=>{
        console.log("Connected to server");
        setIsConnected(true)

        SocketInstance.emit('user-online', user.id)
    });

    SocketInstance.on('disconnect', ()=>{
        console.log("Disconnected from server");
        setIsConnected(false)
    });

    SocketInstance.on('connect-error', (error)=>{
        console.error("Socket connection error: ", error);
        setIsConnected(false)
    });
    //@ts-ignore
    setSocket(SocketInstance)
    return ()=> {
        SocketInstance.disconnect()
    };
    }, [user, isLoaded])

    return (
        //@ts-ignore
        <SocketContext.Provider value={{socket, isConnected}}>
            {children}
        </SocketContext.Provider>
    )
}