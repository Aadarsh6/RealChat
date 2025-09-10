"use client";
import { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import axios from 'axios';
import Link from 'next/link';
import { ErrorMessage, PageLoading, UserListSkeleton } from '../Components/Navigation/LoadingSpinner';


interface User {
    id: string;
    username: string;
    name: string;
    email: string;
    avatar: string;
}

const ChatListPage = () => {
    const { isLoaded: authLoaded, userId } = useAuth();
    const { user, isLoaded: userLoaded } = useUser();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            setError(null);
            console.log('Fetching users...');
            const res = await axios.get("/api/v1/users");
            console.log('Users fetched:', res.data);
            setUsers(res.data);
        } catch (err: any) {
            console.error("Failed to fetch users:", err);
            const errorMessage = err.response?.data?.error || "Failed to load users. Please try again.";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoaded || !userLoaded) return;
        if (!userId || !user) {
            setError("Please log in to view chats");
            setIsLoading(false);
            return;
        }
        fetchUsers();
    }, [authLoaded, userLoaded, userId, user]);

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
                        </div>
                        <div className="flex items-center space-x-3">
                            {user.imageUrl ? (
                                <img 
                                    src={user.imageUrl} 
                                    alt="Your avatar"
                                    className="w-12 h-12 rounded-full object-cover border-2 border-blue-100"
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
                                    {users.length} user{users.length !== 1 ? 's' : ''} online
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
                                    {users
                                        .filter(u => u.id !== userId) // Don't show current user in the list
                                        .map((u) => (
                                        <Link
                                            key={u.id}
                                            href={`/chat/${u.id}`}
                                            className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all duration-200 group"
                                        >
                                            <div className="flex items-center space-x-4">
                                                {/* User Avatar */}
                                                <div className="flex-shrink-0">
                                                    {u.avatar ? (
                                                        <img 
                                                            src={u.avatar} 
                                                            alt={`${u.name || u.username}'s avatar`}
                                                            className="w-12 h-12 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                                            {(u.name || u.username || 'U')[0].toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* User Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                                            {u.name || u.username}
                                                        </h3>
                                                        <div className="flex items-center space-x-2 ml-2">
                                                            {/* Online status indicator */}
                                                            <div className="w-3 h-3 bg-green-400 rounded-full border-2 border-white shadow-sm"></div>
                                                            <span className="text-xs text-gray-500">Online</span>
                                                        </div>
                                                    </div>
                                                    {u.username && u.name && u.username !== u.name && (
                                                        <p className="text-sm text-gray-500 truncate">@{u.username}</p>
                                                    )}
                                                    <p className="text-sm text-gray-400 mt-1">
                                                        Click to start a conversation
                                                    </p>
                                                </div>

                                                {/* Arrow Icon */}
                                                <div className="flex-shrink-0">
                                                    <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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

                {/* Footer Actions */}
                {!isLoading && !error && users.length > 0 && (
                    <div className="mt-6 flex justify-center">
                        <button 
                            onClick={fetchUsers}
                            className="px-6 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex items-center space-x-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>Refresh contacts</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatListPage;
