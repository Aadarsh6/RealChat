'use client';

import { useUser } from "@clerk/nextjs";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from 'axios';

const ChatPage = ({ params }: { params: { userId: string } }) => {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [otherUser, setOtherUser] = useState<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto scroll to bottom when new messages arrive
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (!isLoaded || !user) return;

        async function fetchMessages() {
            try {
                const res = await axios.get(`/api/v1/messages?with=${params.userId}`);
                setMessages(res.data);
                
                // Get other user info from the first message if available
                if (res.data.length > 0) {
                    const firstMsg = res.data[0];
                    const other = firstMsg.sender.clerkId === user?.id ? firstMsg.receiver : firstMsg.sender;
                    setOtherUser(other);
                }
            } catch (e) {
                console.error("Failed to fetch messages:", e);
            }
        }

        // Get other user info from users list if no messages exist
        async function fetchOtherUser() {
            try {
                const res = await axios.get("/api/v1/users");
                const other = res.data.find((u: any) => u.id === params.userId);
                if (other) setOtherUser(other);
            } catch (e) {
                console.error("Failed to fetch other user:", e);
            }
        }

        fetchMessages();
        if (!otherUser) fetchOtherUser();
        
        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, [params.userId, isLoaded, user, otherUser]);

    async function sendMessage() {
        if (!newMessage.trim() || isLoading || !user) return;
        
        setIsLoading(true);
        try {
            await axios.post("/api/v1/messages", {
                receiverId: params.userId,
                content: newMessage
            });
            
            setNewMessage('');
            
            // Immediately fetch messages to show the new one
            const res = await axios.get(`/api/v1/messages?with=${params.userId}`);
            setMessages(res.data);
        } catch (error) {
            console.error("Failed to send message:", error);
        } finally {
            setIsLoading(false);
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    // Loading state
    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-pulse text-gray-500">Loading chat...</div>
            </div>
        );
    }

    // Not authenticated
    if (!user) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="text-gray-600 mb-4">Please log in to chat</div>
                    <button 
                        onClick={() => router.push("/login")}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen max-w-4xl mx-auto">
            {/* Header */}
            <div className="bg-white border-b p-4 flex items-center space-x-3">
                <button 
                    onClick={() => router.push("/chat")}
                    className="text-blue-500 hover:text-blue-600 p-1 rounded-full hover:bg-blue-50"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                
                {otherUser && (
                    <>
                        {otherUser.avatar ? (
                            <img 
                                src={otherUser.avatar} 
                                alt={otherUser.username || otherUser.email}
                                className="w-8 h-8 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                {(otherUser.name || otherUser.username || otherUser.email)[0].toUpperCase()}
                            </div>
                        )}
                        <div>
                            <div className="font-medium text-gray-900">
                                {otherUser.name || otherUser.username || otherUser.email}
                            </div>
                            {otherUser.name && otherUser.username && (
                                <div className="text-sm text-gray-500">@{otherUser.username}</div>
                            )}
                        </div>
                    </>
                )}
                
                {!otherUser && (
                    <div className="animate-pulse flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </div>
                )}
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                        <div className="text-lg mb-2">👋</div>
                        <div>No messages yet.</div>
                        <div className="text-sm">Send the first message to start the conversation!</div>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isMyMessage = msg.sender.clerkId === user.id;
                        const showTime = index === 0 || 
                            new Date(msg.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime() > 300000; // 5 minutes
                        
                        return (
                            <div key={msg.id}>
                                {showTime && (
                                    <div className="text-center text-xs text-gray-400 my-4">
                                        {new Date(msg.createdAt).toLocaleDateString()} at{' '}
                                        {new Date(msg.createdAt).toLocaleTimeString([], { 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                        })}
                                    </div>
                                )}
                                <div
                                    className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg break-words ${
                                            isMyMessage
                                                ? "bg-blue-500 text-white"
                                                : "bg-white text-black border border-black/20 shadow-sm"
                                        }`}
                                    >
                                        <div className="text-sm">{msg.content}</div>
                                        <div className={`text-xs mt-1 ${isMyMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                                            {new Date(msg.createdAt).toLocaleTimeString([], { 
                                                hour: '2-digit', 
                                                minute: '2-digit' 
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t bg-white text-black p-4">
                <div className="flex gap-2 max-w-4xl mx-auto">
                    <input 
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Message ${otherUser?.name || otherUser?.username || 'user'}...`}
                        className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isLoading}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={isLoading || !newMessage.trim()}
                        className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? (
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatPage;