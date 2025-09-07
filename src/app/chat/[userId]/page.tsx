'use client';

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import axios from 'axios';
import { sendError } from "next/dist/server/api-utils";

//!Since this file is located at app/chat/[userId]/page.tsx, the [userId] part is a dynamic placeholder. Next.js automatically takes the value from the URL that corresponds to this placeholder and passes it into your page component inside the params object.
const ChatPage = ({params}:{params:{userId: string}}) => {
    const {user } = useUser()
    const [message, setMessage] = useState<any[]>([])
    const [newMessage, setNewMessage] = useState("")

    useEffect(()=>{
        async function fetchMessages() {
            const res = await axios.get(`/api/v1/messages?receiverId=${params.userId}`)
            setMessage(res.data)
        }
        fetchMessages()
        const interval = setInterval(fetchMessages, 3000)
        return ()=> clearInterval(interval)
    },[params.userId])

    async function sendMessage() {

        try {
            await axios.post("/api/v1/messages",{
                receiverId: params.userId,
                Content: newMessage
            });
            setNewMessage('')
        } catch (error) {
            console.error("Failed to send message:", error);
        }    
    }
    
//* This is what a message looks like
//?   {
//?     "id": "msg_abc1",
//?     "content": "Hey, how are you?",
//?     "senderId": "user_789", // The logged-in user
//?     "receiverId": "user_456"
//?   },

  return (
    <div className="flex flex-col h-screen">
    <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-100" >
    {message.map((msg)=>(
        <div
        key={msg.id}
        className={`p-2 rounded-xl max-w-xs ${msg.senderId === user?.id 
            ? "bg-blue-500 text-white ml-auto" 
            : "bg-white border"}`}
        >
            {msg.content}
        </div>
    ))}

        <div>
            <input 
            type="text"
            value={newMessage}
            onChange={(e)=>setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 border rounded px-3 py-2"
            />

            <button
            onClick={sendMessage}
            className="ml-2 px-4 py-2 bg-blue-500 text-white rounded"
            >Sent</button>
        </div>
    </div>
    </div>
  )
}

export default ChatPage