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
        },
    });

    const userSockets = new Map<string, string>();

    io.on('connection', (socket) => {
        console.log("User connected:", socket.id);

        socket.on('user-online', (userId: string) => {
            userSockets.set(userId, socket.id);
            (socket as any).userId = userId;
            console.log(`User ${userId} is online with socket ID: ${socket.id}`);
        });

        socket.on('typing', (data: { toUserId: string; fromUserId: string; username: string }) => {
            const targetSocketId = userSockets.get(data.toUserId);
            if (targetSocketId) {
                io.to(targetSocketId).emit('user-typing', {
                    fromUserId: data.fromUserId,
                    username: data.username,
                });
            }
        });

        socket.on('stop-typing', (data: { toUserId: string; fromUserId: string }) => {
            const targetSocketId = userSockets.get(data.toUserId);
            if (targetSocketId) {
                io.to(targetSocketId).emit('user-stop-typing', {
                    fromUserId: data.fromUserId,
                });
            }
        });

        socket.on('disconnect', () => {
            const userId = (socket as any).userId;
            if (userId) {
                userSockets.delete(userId);
                console.log(`User ${userId} went offline`);
            }
            console.log("User disconnected:", socket.id);
        });
    });

    // Store userSockets on global and io instance for API route access
    (global as any).io = io;
    (io as any).userSockets = userSockets;
    
    return io;
};

export default function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
    if (!res.socket.server.io) {
        console.log("Initializing Socket.io server...");
        const io = initSocket(res.socket.server);
        res.socket.server.io = io;
    }
    
    res.end();
}

export const config = {
    api: {
        bodyParser: false,
    },
};