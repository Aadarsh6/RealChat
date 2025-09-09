'use client';

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import axios from 'axios';

//!Since this file is located at app/chat/[userId]/page.tsx, the [userId] part is a dynamic placeholder. Next.js automatically takes the value from the URL that corresponds to this placeholder and passes it into your page component inside the params object.
const ChatPage = ({params}:{params:{userId: string}}) => {
    const { user } = useUser()
    const [message, setMessage] = useState<any[]>([])
    const [newMessage, setNewMessage] = useState("")
    const [isLoading, setIsLoading] = useState(false);


    useEffect(()=>{
        async function fetchMessages() {
            try{
                const res = await axios.get(`/api/v1/messages?with=${params.userId}`)
                setMessage(res.data)
            }catch(e){
                console.error("Failed to fetch messages:", e);            }
        }
        fetchMessages()
        const interval = setInterval(fetchMessages, 3000)
        return ()=> clearInterval(interval)
    },[params.userId])

    async function sendMessage() {
        if(!newMessage.trim() || isLoading) return;
        try {
            await axios.post("/api/v1/messages",{
                receiverId: params.userId,
                content: newMessage
            });
            setNewMessage('')
             // Immediately fetch messages to show the new one

            const res = await axios.get(`/api/v1/messages?with=${params.userId}`)
            setMessage(res.data)
        } catch (error) {
            console.error("Failed to send message:", error);
        }finally{
            setIsLoading(false)
        }
    }


    const handleKeyDown = (e:React.KeyboardEvent) => {
        if(e.key === "Enter" && !e.shiftKey){
            e.preventDefault();
            sendMessage()
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
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-100">
                {message.map((msg) => (
                    <div
                        key={msg.id}
                        className={`p-3 rounded-lg max-w-xs break-words ${
                            msg.sender.clerkId === user?.id
                                ? "bg-blue-500 text-white ml-auto"
                                : "bg-white border shadow-sm"
                        }`}
                    >
                        <div className="text-sm">{msg.content}</div>
                        <div className="text-xs mt-1 opacity-70">
                            {new Date(msg.createdAt).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Input area - Fixed positioning */}
            <div className="border-t bg-white p-4 flex gap-2">
                <input 
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyDown}
                    placeholder="Type your message..."
                    className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                />
                <button
                    onClick={sendMessage}
                    disabled={isLoading || !newMessage.trim()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Sending...' : 'Send'}
                </button>
            </div>
        </div>
    );
};

export default ChatPage;