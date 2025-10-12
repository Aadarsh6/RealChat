'use client';

import { useUser } from "@clerk/nextjs";
import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { ChatSkeleton, ErrorMessage, PageLoading } from "@/app/Components/Navigation/LoadingSpinner";
import { useSocket } from "@/Context/socketContext";
import { useApiSetup } from "@/hooks/userApi";
import { messagesApi, usersApi } from "@/lib/api";

interface Message {
    id: string;
    tempId?: string;
    content: string;
    createdAt: string;
    status?: 'sending' | 'sent' | 'delivered' | 'failed';
    sender: {
        id: string;
        clerkId: string;
        username: string;
        name: string;
        avatar: string;
    };
    receiver: {
        id: string;
        clerkId: string;
        username: string;
        name: string;
        avatar: string;
    };
}

interface User {
    id: string;
    clerkId: string;
    username: string;
    name: string;
    avatar: string;
}

const ChatPage = ({ params }: { params: Promise<{ userId: string }> }) => {
    useApiSetup();
    const unwrappedParams = use(params);
    const { userId: paramUserId } = unwrappedParams;
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [otherUser, setOtherUser] = useState<User | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const [otherUserTyping, setOtherUserTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout>(null);
    const { socket, isConnected } = useSocket();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const fetchMessages = async () => {
        try {
            setError(null);
            const res = await messagesApi.getConversation(paramUserId);
            setMessages(res.data);
            if (res.data.length > 0) {
                const firstMsg = res.data[0];
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
            const res = await usersApi.getAll();
            const other = res.data.find((u: any) => u.id === paramUserId);
            if (other) setOtherUser(other);
        } catch (e) {
            console.error("Failed to fetch other user:", e);
        }
    };

    useEffect(() => {
        if (!socket || !user) return;
        console.log('🔌 Setting up INSTANT message listeners');

        // INSTANT MESSAGE HANDLER - No duplicate checking needed!
        const handleNewMessage = (message: Message) => {
            console.log('📨 [INSTANT RECEIVE]:', message.tempId || message.id);
            
            // Check if this message is for this conversation
            const isForThisConversation = 
                (message.sender.clerkId === user.id && message.receiver.id === paramUserId) || 
                (message.sender.id === paramUserId && message.receiver.clerkId === user.id);
            
            if (!isForThisConversation) {
                console.log('⚠️ Message not for this conversation');
                return;
            }

            // Add message immediately - React will handle duplicates via key
            setMessages(prev => {
                // If sender is me and message has tempId, don't add (already optimistically added)
                if (message.sender.clerkId === user.id && message.tempId) {
                    console.log('⚠️ Skipping own message with tempId (already added optimistically)');
                    return prev;
                }
                
                // Add message with delivered status
                console.log('✅ Adding message to UI');
                return [...prev, { ...message, status: 'delivered' }];
            });
        };

        // MESSAGE CONFIRMED - Update tempId to real ID
        const handleMessageConfirmed = (data: { tempId: string; message: Message }) => {
            console.log('✅ [DB SAVED] Updating tempId to real ID:', data.message.id);
            
            setMessages(prev => prev.map(msg => {
                // Replace temp message with real message
                if (msg.tempId === data.tempId) {
                    return { 
                        ...data.message, 
                        status: msg.sender.clerkId === user.id ? 'sent' : 'delivered'
                    };
                }
                return msg;
            }));
        };

        // MESSAGE FAILED
        const handleMessageFailed = (data: { tempId: string; error?: string }) => {
            console.error('❌ [FAILED]:', data.tempId);
            setMessages(prev => prev.map(msg => {
                if (msg.tempId === data.tempId) {
                    return { ...msg, status: 'failed' };
                }
                return msg;
            }));
            setError(data.error || 'Message failed to send');
        };

        // TYPING INDICATORS
        const handleUserTyping = (data: { fromUserId: string; username: string }) => {
            if (data.fromUserId === paramUserId) {
                setOtherUserTyping(true);
            }
        };

        const handleUserStopTyping = (data: { fromUserId: string }) => {
            if (data.fromUserId === paramUserId) {
                setOtherUserTyping(false);
            }
        };

        // Register all listeners
        socket.on('new-message', handleNewMessage);
        socket.on('message-confirmed', handleMessageConfirmed);
        socket.on('message-failed', handleMessageFailed);
        socket.on('user-typing', handleUserTyping);
        socket.on('user-stop-typing', handleUserStopTyping);
        
        console.log('✅ INSTANT message listeners registered');

        return () => {
            socket.off('new-message', handleNewMessage);
            socket.off('message-confirmed', handleMessageConfirmed);
            socket.off('message-failed', handleMessageFailed);
            socket.off('user-typing', handleUserTyping);
            socket.off('user-stop-typing', handleUserStopTyping);
        };
    }, [socket, user, paramUserId]);

    useEffect(() => {
        if (!isLoaded || !user) return;
        setIsLoading(true);
        Promise.all([fetchMessages(), fetchOtherUser()]).finally(() => setIsLoading(false));
    }, [paramUserId, isLoaded, user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);
        if (!socket || !isConnected) return;
        
        if (!isTyping && e.target.value.trim()) {
            setIsTyping(true);
            socket.emit('typing', {
                toUserId: paramUserId,
                fromUserId: user?.id,
                username: user?.username || user?.firstName || "User"
            });
        }
        
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        
        typingTimeoutRef.current = setTimeout(() => {
            if (isTyping) {
                setIsTyping(false);
                socket?.emit('stop-typing', {
                    toUserId: paramUserId,
                    fromUserId: user?.id
                });
            }
        }, 2000);
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !user || !socket || !isConnected) return;
        
        const messageToSend = newMessage.trim();
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = new Date().toISOString();
        
        // INSTANT UI UPDATE - Add to sender's UI immediately
        const optimisticMessage: Message = {
            id: tempId,
            tempId: tempId,
            content: messageToSend,
            createdAt: timestamp,
            status: 'sending',
            sender: {
                id: user.primaryEmailAddress?.id || '',
                clerkId: user.id,
                username: user.username || user.firstName || 'You',
                name: user.fullName || user.firstName || '',
                avatar: user.imageUrl || ''
            },
            receiver: {
                id: otherUser?.id || paramUserId,
                clerkId: otherUser?.clerkId || '',
                username: otherUser?.username || '',
                name: otherUser?.name || '',
                avatar: otherUser?.avatar || ''
            }
        };
        
        console.log('📤 [INSTANT SEND] Adding to UI:', tempId);
        
        // Add to UI instantly
        setMessages(prev => [...prev, optimisticMessage]);
        setNewMessage('');
        inputRef.current?.focus();
        
        // Stop typing indicator
        if (isTyping) {
            setIsTyping(false);
            socket.emit('stop-typing', {
                toUserId: paramUserId,
                fromUserId: user.id
            });
        }
        
        // Send via socket (receiver gets it in <50ms)
        socket.emit('send-message', {
            receiverId: paramUserId,
            content: messageToSend,
            tempId: tempId,
            timestamp: timestamp
        });
        
        console.log('✅ Message sent - receiver will get it instantly!');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const retryMessage = (msg: Message) => {
        if (!socket || !isConnected) return;
        console.log('🔄 Retrying message:', msg.tempId);
        
        setMessages(prev => prev.map(m => 
            m.tempId === msg.tempId ? { ...m, status: 'sending' } : m
        ));
        
        socket.emit('send-message', {
            receiverId: paramUserId,
            content: msg.content,
            tempId: msg.tempId,
            timestamp: msg.createdAt
        });
    };

    if (!isLoaded) {
        return <PageLoading text="Loading chat..." />;
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
                    <div className="mb-6">
                        <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Please log in to chat</h2>
                    <button onClick={() => router.push("/login")} className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium">Go to Login</button>
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
                        <button onClick={() => router.push("/chat")} className="text-blue-500 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        {otherUser ? (
                            <>
                                {otherUser.avatar ? (
                                    <img src={otherUser.avatar} alt={otherUser.username || 'User'} className="w-10 h-10 rounded-full object-cover border-2 border-blue-100" />
                                ) : (
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">{(otherUser.name || otherUser.username || 'U')[0].toUpperCase()}</div>
                                )}
                                <div className="flex-1">
                                    <div className="font-semibold text-gray-900">{otherUser.name || otherUser.username}</div>
                                    {otherUser.name && otherUser.username && (<div className="text-sm text-gray-500">@{otherUser.username}</div>)}
                                    <div className="flex items-center space-x-1 text-xs">
                                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                                        <span className={isConnected ? 'text-green-600' : 'text-gray-500'}>{isConnected ? 'Connected - Instant Messaging' : 'Connecting...'}</span>
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

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                    {isLoading ? (<ChatSkeleton />) : error ? (
                        <div className="p-4">
                            <ErrorMessage message={error} onRetry={() => { setError(null); fetchMessages(); }} />
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
                                    <p className="text-gray-500 mb-4">Send the first message to {otherUser?.name || otherUser?.username || 'this user'}!</p>
                                </div>
                            ) : (
                                messages.map((msg, index) => {
                                    const isMyMessage = msg.sender.clerkId === user.id;
                                    const showTime = index === 0 || new Date(msg.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime() > 300000;
                                    
                                    // Use tempId or id as key
                                    const messageKey = msg.tempId || msg.id;
                                    
                                    return (
                                        <div key={messageKey}>
                                            {showTime && (
                                                <div className="flex justify-center my-4">
                                                    <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">{new Date(msg.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                                </div>
                                            )}
                                            <div className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                                                <div className="flex items-end space-x-2 max-w-xs lg:max-w-md">
                                                    {!isMyMessage && (
                                                        <div className="flex-shrink-0">
                                                            {msg.sender.avatar ? (
                                                                <img src={msg.sender.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                                                            ) : (
                                                                <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-medium">{(msg.sender.name || msg.sender.username || 'U')[0].toUpperCase()}</div>
                                                            )}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className={`px-4 py-3 rounded-2xl break-words shadow-sm ${isMyMessage ? `bg-blue-500 text-white rounded-br-md ${msg.status === 'sending' ? 'opacity-70' : msg.status === 'failed' ? 'opacity-50 bg-red-500' : ''}` : "bg-white text-gray-900 border border-gray-200 rounded-bl-md"}`}>
                                                            <div className="text-sm leading-relaxed">{msg.content}</div>
                                                            <div className={`text-xs mt-1 flex items-center space-x-1 ${isMyMessage ? 'text-blue-100' : 'text-gray-400'}`}>
                                                                <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                {isMyMessage && (
                                                                    <>
                                                                        {msg.status === 'sending' && (
                                                                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                                                            </svg>
                                                                        )}
                                                                        {msg.status === 'sent' && (
                                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                                                                            </svg>
                                                                        )}
                                                                        {msg.status === 'delivered' && (
                                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13l4 4L23 7"/>
                                                                            </svg>
                                                                        )}
                                                                        {msg.status === 'failed' && (
                                                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                                                            </svg>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {msg.status === 'failed' && isMyMessage && (
                                                            <button onClick={() => retryMessage(msg)} className="text-xs text-red-500 hover:text-red-600 mt-1 flex items-center space-x-1">
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                </svg>
                                                                <span>Retry</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            {otherUserTyping && (
                                <div className="flex justify-start">
                                    <div className="flex items-end space-x-2 max-w-xs lg:max-w-md">
                                        <div className="flex-shrink-0">
                                            {otherUser?.avatar ? (
                                                <img src={otherUser.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-medium">{(otherUser?.name || otherUser?.username || 'U')[0].toUpperCase()}</div>
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

            {/* Input */}
            <div className="border-t bg-white">
                <div className="max-w-4xl mx-auto p-4">
                    {!isConnected && (
                        <div className="mb-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 flex items-center space-x-2">
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                            </svg>
                            <span>Reconnecting... Messages will be sent when connected</span>
                        </div>
                    )}
                    <div className="flex items-end space-x-3">
                        <div className="flex-1">
                            <input 
                                ref={inputRef} 
                                type="text" 
                                value={newMessage} 
                                onChange={handleInputChange} 
                                onKeyDown={handleKeyDown} 
                                placeholder={`Message ${otherUser?.name || otherUser?.username || 'user'}...`} 
                                className="w-full border border-gray-300 text-black rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed" 
                                disabled={!isConnected} 
                                maxLength={1000} 
                            />
                            <div className="flex justify-between items-center mt-1 px-2">
                                <div className="text-xs text-gray-400">{newMessage.length}/1000</div>
                                <div className="flex items-center space-x-2">
                                    {isTyping && isConnected && (<div className="text-xs text-blue-500">typing...</div>)}
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={sendMessage} 
                            disabled={!newMessage.trim() || !isConnected} 
                            className="bg-blue-500 text-white p-3 rounded-full hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0 shadow-md hover:shadow-lg active:scale-95 transform transition-all" 
                            title={!isConnected ? "Connecting..." : "Send message (instant delivery!)"}
                        >
                            {isConnected ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
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