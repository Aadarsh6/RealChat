'use client';

import { RedirectToUserProfile, useUser } from "@clerk/nextjs";
import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import axios from 'axios';
import { ChatSkeleton, ErrorMessage, LoadingSpinner, PageLoading } from "@/app/Components/Navigation/LoadingSpinner";
import { useSocket } from "@/Context/socketContext";
import { Rethink_Sans } from "next/font/google";
import { emit } from "process";


    interface Message{
        id: string,
        content: string,
        createdAt: string,
        sender:{
            id: string,
            clerkId: string,
            username: string,
            name: string,
            avatar: string,
        };
        receiver:{
            id: string,
            clerkId: string,
            username: string,
            name: string,
            avatar: string,
        };
    }

    interface User{
            id: string,
            clerkId: string,
            username: string,
            name: string,
            avatar: string,
    }


const ChatPage = ({ params }: { params: Promise<{ userId: string }> }) => {

    const unwrappedParams = use(params);
    const { userId: paramUserId } = unwrappedParams;

    const { user, isLoaded } = useUser();
    const router = useRouter();
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [otherUser, setOtherUser] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const [isTyping, setIsTyping] = useState(false);
    const [otherUserTyping, setOtherUserTyping] = useState(false)

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const { socket, isConnected } = useSocket()
    //@ts-ignore
    const typingTimeoutRef = useRef<NodeJS.Timeout>()


    // Auto scroll to bottom when new messages arrive
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [newMessage]);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

//get user previous messages

    const fetchMessages = async () => {
        try {
            setError(null);
            const res = await axios.get(`/api/v1/messages?with=${paramUserId}`);
            setMessages(res.data);
            
            // Get other user info from the first message if available
            //!So this is a quick way to detect who you’re chatting with, without needing a separate request.
            if (res.data.length > 0) {
                const firstMsg = res.data[0];
                //!firstMsg.sender.clerkId === user?.id Checks if you (the logged-in user) were the sender of that first message.
                const other = firstMsg.sender.clerkId === user?.id ? firstMsg.receiver : firstMsg.sender;
                setOtherUser(other);
            }
        } catch (e: any) {
            console.error("Failed to fetch messages:", e);
            setError("Failed to load messages");
        }
    };

    const fetchOtherUser = async () => {
        try {
            const res = await axios.get("/api/v1/users");
            const other = res.data.find((u: any) => u.id === paramUserId);
            if (other) setOtherUser(other);
        } catch (e) {
            console.error("Failed to fetch other user:", e);
        }
    };


    
    //Socket listeners no room logic
    useEffect(()=>{
        if(!socket || !user) return

        const handleNewMessages = (message: Message) => {
            if((message.sender.clerkId === user.id && message.receiver.clerkId === paramUserId) || (message.sender.id === paramUserId && message.receiver.clerkId === user.id)){
                setMessages(prev => {
                    if(prev.find(m=> m.id === message.id)) return prev //!checks for duplicates (important since socket + API may both push the same message).
                    return [...prev, message]
                })
            }
        }

 // Listen for your own sent messages (for multi-device sync)
        const handleMessageSent = (message: Message) => {
            if((message.receiver.id === paramUserId)) {
                setMessages(prev=> {
                    if(prev.find(m=> m.id === message.id)) return prev
                    return [...prev, message]
                })
            }
        }

        //Typing indicator

        const handleUserTyping =(data: {  formUserId: string, username: string})=>{
            if(data.formUserId === paramUserId){
                setOtherUserTyping(true)
            }
        }

        const handleUserStopTyping = (data: { fromUserId: string }) => {
            if(data.fromUserId === paramUserId){
                setOtherUserTyping(false)
            }
        };
        socket.on("new-message",handleNewMessages)
        socket.on("message-sent", handleMessageSent)
        socket.on("user-typing", handleUserTyping)
        socket.on("user-stop-typing", handleUserStopTyping)

        return ()=>{
        socket.off("new-message",handleNewMessages)
        socket.off("message-sent", handleMessageSent)
        socket.off("user-typing", handleUserTyping)
        socket.off("user-stop-typing", handleUserStopTyping)
        }
    },[user, paramUserId, socket])

//!initial data loading

//TODO: Better and fast data fetching loading(batch loading)
    useEffect(() => {
        if (!isLoaded || !user) return;

        setIsLoading(true);
        Promise.all([fetchMessages(), fetchOtherUser()])
            .finally(() => setIsLoading(false));
        
        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, [paramUserId, isLoaded, user]);


    // Simulate typing indicator
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);
        
        if(!socket) return

//send typing to specific user
        if (!isTyping && e.target.value.trim()) {
            setIsTyping(true);
        socket.emit('typing',{
            toUserId: paramUserId,
            fromUserId: user?.id,
            username: user?.username || user?.firstName || "User"
        })
        }
    };

    if(typingTimeoutRef.current){
        clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
        if(isTyping){
            socket?.emit('stop-typing', {
                toUserId: paramUserId,
                fromUserId: user?.id
            });
        }
    }, 2000);



    const sendMessage = async () => {
        if (!newMessage.trim() || isSending || !user) return;
        
        setIsSending(true);
        const messageToSend = newMessage.trim();
        setNewMessage(''); //claer the input feild
        
        if(isTyping && socket){
            setIsTyping(false)
            socket.emit('stop-typing', {
                toUserId: paramUserId,
                fromUserId: user.id
            })
        }

        try {
            await axios.post("/api/v1/messages", {
                receiverId: paramUserId,
                content: messageToSend
            });
            
            // message will come back through socket
            // await fetchMessages();
        } catch (error: any) {
            console.error("Failed to send message:", error);
            setError("Failed to send message. Please try again.");
            setNewMessage(messageToSend); // Restore message if failed
        } finally {
            setIsSending(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Loading state
    if (!isLoaded) {
        return <PageLoading text="Loading chat..." />;
    }

    // Not authenticated
    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen overflow-auto">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
                    <div className="mb-6">
                        <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Please log in to chat</h2>
                    <button 
                        onClick={() => router.push("/login")}
                        className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center space-x-3">
                        <button 
                            onClick={() => router.push("/chat")}
                            className="text-blue-500 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        
                        {otherUser ? (
                            <>
                                {otherUser.avatar ? (
                                    <img 
                                        src={otherUser.avatar} 
                                        alt={otherUser.username || 'User'}
                                        className="w-10 h-10 rounded-full object-cover border-2 border-blue-100"
                                    />
                                ) : (
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                        {(otherUser.name || otherUser.username || 'U')[0].toUpperCase()}
                                    </div>
                                )}
                                <div className="flex-1">
                                    <div className="font-semibold text-gray-900">
                                        {otherUser.name || otherUser.username}
                                    </div>
                                    {otherUser.name && otherUser.username && (
                                        <div className="text-sm text-gray-500">@{otherUser.username}</div>
                                    )}
                                    <div className="flex items-center space-x-1 text-xs">
                                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                                        <span className={isConnected ? 'text-green-600' : 'text-gray-500'}>
                                            {isConnected ? 'Online' : 'Offline'}
                                        </span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="animate-pulse flex items-center space-x-3 flex-1">
                                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                                <div className="space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <div className="max-w-4xl mx-auto">
                    {isLoading ? (
                        <ChatSkeleton />
                    ) : error ? (
                        <div className="p-4">
                            <ErrorMessage 
                                message={error} 
                                onRetry={() => {
                                    setError(null);
                                    fetchMessages();
                                }} 
                            />
                        </div>
                    ) : (
                        <div className="p-4 space-y-4">
                            {messages.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="mb-4">
                                        <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">Start the conversation</h3>
                                    <p className="text-gray-500 mb-4">
                                        Send the first message to {otherUser?.name || otherUser?.username || 'this user'}!
                                    </p>
                                </div>
                            ) : (
                                messages.map((msg, index) => {
                                    const isMyMessage = msg.sender.clerkId === user.id;
                                    const showTime = index === 0 || 
                                        new Date(msg.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime() > 300000;
                                    
                                    return (
                                        <div key={msg.id}>
                                            {showTime && (
                                                <div className="text-center text-xs text-gray-400 my-6">
                                                    <div className="bg-gray-100 rounded-full px-3 py-1 inline-block">
                                                        {new Date(msg.createdAt).toLocaleDateString()} at{' '}
                                                        {new Date(msg.createdAt).toLocaleTimeString([], { 
                                                            hour: '2-digit', 
                                                            minute: '2-digit' 
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                            <div className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                                                <div className="flex items-end space-x-2 max-w-xs lg:max-w-md">
                                                    {!isMyMessage && (
                                                        <div className="flex-shrink-0">
                                                            {otherUser?.avatar ? (
                                                                <img 
                                                                    src={otherUser.avatar} 
                                                                    alt=""
                                                                    className="w-6 h-6 rounded-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                                                    {(otherUser?.name || otherUser?.username || 'U')[0].toUpperCase()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    <div
                                                        className={`px-4 py-3 rounded-2xl break-words shadow-sm ${
                                                            isMyMessage
                                                                ? "bg-blue-500 text-white rounded-br-md"
                                                                : "bg-white text-gray-900 border border-gray-200 rounded-bl-md"
                                                        }`}
                                                    >
                                                        <div className="text-sm leading-relaxed">{msg.content}</div>
                                                        <div className={`text-xs mt-1 ${
                                                            isMyMessage ? 'text-blue-100' : 'text-gray-400'
                                                        }`}>
                                                            {new Date(msg.createdAt).toLocaleTimeString([], { 
                                                                hour: '2-digit', 
                                                                minute: '2-digit' 
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            
                            {/* Typing indicator */}
                            {otherUserTyping && (
                                <div className="flex justify-start">
                                    <div className="flex items-end space-x-2 max-w-xs lg:max-w-md">
                                        <div className="flex-shrink-0">
                                            {otherUser?.avatar ? (
                                                <img 
                                                    src={otherUser.avatar} 
                                                    alt=""
                                                    className="w-6 h-6 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                                    {(otherUser?.name || otherUser?.username || 'U')[0].toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-md">
                                            <div className="flex space-x-1">
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>
            </div>

            {/* Input area */}
            <div className="border-t bg-white">
                <div className="max-w-4xl mx-auto p-4">
                    <div className="flex items-end space-x-3">
                        <div className="flex-1">
                            <input 
                                ref={inputRef}
                                type="text"
                                value={newMessage}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder={`Message ${otherUser?.name || otherUser?.username || 'user'}...`}
                                className="w-full border border-gray-300 text-black rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                disabled={isSending || !isConnected}
                                maxLength={1000}
                            />
                            <div className="flex justify-between items-center mt-1 px-2">
                                <div className="text-xs text-gray-400">
                                    {newMessage.length}/1000
                                </div>
                                <div className="flex items-center space-x-2">
                                    {!isConnected && (
                                        <span className="text-xs text-red-500">Disconnected</span>
                                    )}
                                    {isTyping && (
                                        <div className="text-xs text-blue-500">typing...</div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={sendMessage}
                            disabled={isSending || !newMessage.trim() || !isConnected}
                            className="bg-blue-500 text-white p-3 rounded-full hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                        >
                            {isSending ? (
                                <LoadingSpinner size="sm" />
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatPage;
