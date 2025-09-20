"use client";

import { use, useEffect, useState } from 'react';
import { useAuth, UserButton, useUser } from '@clerk/nextjs';
import axios from 'axios';
import Link from 'next/link';
import { ErrorMessage, PageLoading, UserListSkeleton } from '../Components/Navigation/LoadingSpinner';
import { useSocket } from '@/Context/socketContext';

interface User {
    id: string;
    username: string;
    name: string;
    email: string;
    avatar: string;
    isOnline?: boolean;
}

const ChatListPage = () => {
    const { isLoaded: authLoaded, userId } = useAuth();
    const { user, isLoaded: userLoaded } = useUser();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { socket, isConnected } = useSocket()

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            setError(null);
            console.log('Fetching users...');
            const res = await axios.get("/api/v1/users");
            console.log('Users fetched:', res.data);
            setUsers(res.data);


            //check online status for each user
            const userWithStatus = await Promise.all(
                res.data.map(async (user: User)=>{
                    try {
                        const statusRes =  await axios.get(`api/v1/users/online?userId=${user.id}`);
                        return {...user, isOnline: statusRes.data.isOnline}
                    } catch (error) {
                        return {...user, isOnline: false}
                    }
                })
            )

//store online user on top

            const sortedUsers = userWithStatus.sort((a, b)=>{

//*-1 → means a comes before b
//* 1 → means a comes after b
//* 0 → means leave their order unchanged

                if(a.isOnline && !b.isOnline) return -1;
                if(!a.isOnline && b.isOnline) return 1;
                return 0;
            });
            setUsers(sortedUsers)

        } catch (err: any) {
            console.error("Failed to fetch users:", err);
            const errorMessage = err.response?.data?.error || "Failed to load users. Please try again.";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

//Refresh online status periodically

    useEffect(() => {
        if (!authLoaded || !userLoaded) return;
        if (!userId || !user) {
            setError("Please log in to view chats");
            setIsLoading(false);
            return;
        }

        fetchUsers();
        
        // const interval = setInterval(() => {
        //    fetchUsers() 
        // }, 9000);

        // return ()=> clearInterval(interval)

    }, [authLoaded, userLoaded, userId, user]);


    //user status change

    useEffect(()=>{
        if(!socket || !isConnected) return
        const handleUserOnline = (data:{userId:string}) => {
            setUsers(prev => prev.map(u => 
                u.id === data.userId ? {...u, isOnline: true } : u
            ));
        };

        const handleUserOffline = (data:{userId: string}) => {
            setUsers(prev=> prev.map(u=> 
                u.id === data.userId? {...u, isOnline: false} : u
            ));
        };

        socket.on("user-online-status", handleUserOnline)
        socket.on("user-offline-status", handleUserOffline)

        return ()=>{
        socket.off("user-online-status", handleUserOnline)
        socket.off("user-offline-status", handleUserOffline)
        }
    },[socket, isConnected])


    // Loading while Clerk initializes
    if (!authLoaded || !userLoaded) {
        return <PageLoading text="Initializing..." />;
    }

    // Not authenticated
    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
                    <div className="mb-6">
                        <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
                    <p className="text-gray-600 mb-6">Please log in to access your chats</p>
                    <Link 
                        href="/login" 
                        className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                    >
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto py-8 px-4">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Your Chats</h1>
                            <p className="text-gray-600 mt-1">
                                Welcome back, {user.firstName || user.username || 'User'}! 👋
                            </p>
                            <div className="flex items-center space-x-2 mt-2">
                                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                <span className="text-sm text-gray-600">
                                    {isConnected ? 'Connected' : 'Reconnecting...'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            {user.imageUrl ? (
                                <UserButton 
                                //@ts-ignore
                                    signOutRedirectUrl="/"
                                    appearance={{
                                        elements: {
                                            avatarBox: "w-12 h-12"
                                        }
                                    }}
                                />
                            ) : (
                                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                    {(user.firstName || user.username || 'U')[0].toUpperCase()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="bg-white rounded-lg shadow-sm">
                    {/* Loading State */}
                    {isLoading && (
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
                                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                            </div>
                            <UserListSkeleton />
                        </div>
                    )}

                    {/* Error State */}
                    {error && !isLoading && (
                        <div className="p-6">
                            <ErrorMessage 
                                title="Unable to Load Chats"
                                message={error}
                                onRetry={fetchUsers}
                            />
                        </div>
                    )}

                    {/* Success State */}
                    {!isLoading && !error && (
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    Available Contacts
                                </h2>
                                <div className="text-sm text-gray-500">
                                    {users.filter(u => u.isOnline).length} online • {users.length} total
                                </div>
                            </div>

                            {users.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="mb-4">
                                        <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts yet</h3>
                                    <p className="text-gray-500 mb-4">
                                        Invite friends to join and start chatting!
                                    </p>
                                    <button 
                                        onClick={fetchUsers}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                    >
                                        Refresh
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {users.map((u) => (
                                        <Link
                                            key={u.id}
                                            href={`/chat/${u.id}`}
                                            className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 hover:shadow-md transition-all group cursor-pointer"
                                        >
                                            <div className="flex items-center space-x-4">
                                                <div className="relative">
                                                    {u.avatar ? (
                                                        <img 
                                                            src={u.avatar} 
                                                            alt={u.username || u.email}
                                                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-100 group-hover:border-blue-200"
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                                            {(u.name || u.username || u.email)[0].toUpperCase()}
                                                        </div>
                                                    )}
                                                    {/* Online indicator */}
                                                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                                                        u.isOnline ? 'bg-green-400' : 'bg-gray-400'
                                                    }`}></div>
                                                </div>
                                                
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center space-x-2">
                                                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                                                            {u.name || u.username || u.email}
                                                        </h3>
                                                        {u.isOnline && (
                                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                                                Online
                                                            </span>
                                                        )}
                                                    </div>
                                                    {u.name && u.username && (
                                                        <p className="text-sm text-gray-500 truncate">
                                                            @{u.username}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {u.isOnline ? 'Available to chat' : 'Last seen recently'}
                                                    </p>
                                                </div>
                                                <div className="text-gray-400 group-hover:text-blue-500 transition-colors">
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-black">
                        <button 
                            onClick={fetchUsers}
                            className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            disabled={isLoading}
                        >
                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span className="text-sm font-medium">Refresh Contacts</span>
                        </button>
                        
                        <Link 
                            href="/"
                            className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            <span className="text-sm font-medium">Back to Home</span>
                        </Link>
                        
                        <div className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-500">Invite Friends (Soon)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatListPage;