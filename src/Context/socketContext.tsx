"use client";

import { useUser } from "@clerk/nextjs";
import { Children, createContext, ReactNode, useContext, useEffect, useState } from "react";
import { Socket } from "socket.io";


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

        const SocketIns
    })
}