import { initSocket, NextApiResponseServerIO } from "@/lib/socket";
import { NextApiRequest } from "next";

export default function handler(req:NextApiRequest, res:NextApiResponseServerIO){
    //! 1. Access Next.js's built-in server
    if(!res.socket.server.io){
        console.log("Initializing socket io server...")
        //! // 2. Attach Socket.IO to it

        //?res.socket.server → this is the underlying Node.js HTTP server that Next.js is already running.

        const io = initSocket(res.socket.server) //! Create a new io (Socket.IO server) and attach it to Next.js’s HTTP server."  
        
        //!Normal API requests → handled by Next.js.
        //!WebSocket upgrade requests (for real-time stuff) → handled by Socket.IO.
        res.socket.server.io = io
    }
    //It tells Node.js: “I’m done sending data for this request. Close the response stream.”
    //@ts-ignore
    res.end()
}

export const config = {
    api: {
        bodyParser: false,
    },
}