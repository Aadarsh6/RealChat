// src/pages/api/socket.io.ts
import { NextApiRequest, NextApiResponse } from "next";
import { Server as NetServer } from "http";
import { Server as ServerIO } from "socket.io";

export type NextApiResponseServerIO = NextApiResponse & {
    socket: {
        server: NetServer & {
            io: ServerIO;
        };
    };
};

const initSocket = (server: NetServer): ServerIO => {
    const io = new ServerIO(server, {
        path: "/api/socket.io",
        addTrailingSlash: false,
        cors: {
            origin: process.env.NODE_ENV === 'production'
                ? process.env.NEXT_PUBLIC_SITE_URL 
                : "http://localhost:3000",
            methods: ['GET', 'POST'],
            credentials: true
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    const userSockets = new Map<string, string>();

    io.on('connection', (socket) => {
        console.log("✅ User connected:", socket.id);

        socket.on('user-online', (userId: string) => {
            console.log(`📱 User ${userId} going online with socket ${socket.id}`);
            userSockets.set(userId, socket.id);
            (socket as any).userId = userId;
            
            // Notify other users about online status
            socket.broadcast.emit('user-online-status', { userId });
        });

        socket.on('typing', (data: { toUserId: string; fromUserId: string; username: string }) => {
            console.log(`⌨️ ${data.username} is typing to ${data.toUserId}`);
            const targetSocketId = userSockets.get(data.toUserId);
            if (targetSocketId) {
                io.to(targetSocketId).emit('user-typing', {
                    fromUserId: data.fromUserId,
                    username: data.username,
                });
            }
        });

        socket.on('stop-typing', (data: { toUserId: string; fromUserId: string }) => {
            console.log(`⌨️ User ${data.fromUserId} stopped typing to ${data.toUserId}`);
            const targetSocketId = userSockets.get(data.toUserId);
            if (targetSocketId) {
                io.to(targetSocketId).emit('user-stop-typing', {
                    fromUserId: data.fromUserId,
                });
            }
        });

        // Handle connection errors
        socket.on('error', (error) => {
            console.error('❌ Socket error:', error);
        });

        socket.on('disconnect', (reason) => {
            const userId = (socket as any).userId;
            console.log(`📴 User disconnected: ${socket.id}, reason: ${reason}`);
            
            if (userId) {
                userSockets.delete(userId);
                // Notify other users about offline status
                socket.broadcast.emit('user-offline-status', { userId });
                console.log(`👋 User ${userId} went offline`);
            }
        });
    });

    // Store userSockets on global and io instance for API route access
    (global as any).io = io;
    (io as any).userSockets = userSockets;
    
    console.log("🚀 Socket.io server initialized");
    return io;
};

export default function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
    if (!res.socket.server.io) {
        console.log("🔧 Initializing Socket.io server...");
        const io = initSocket(res.socket.server);
        res.socket.server.io = io;
    } else {
        console.log("♻️ Socket.io server already running");
    }
    
    res.end();
}

export const config = {
    api: {
        bodyParser: false,
    },
};