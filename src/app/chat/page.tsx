"use client";

import { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import axios from 'axios';
import Link from 'next/link';

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

    useEffect(() => {
        if (!authLoaded || !userLoaded) return;
        if (!userId || !user) {
            setError("Please log in to view chats");
            setIsLoading(false);
            return;
        }

        async function fetchUsers() {
            try {
                setIsLoading(true);
                console.log('Fetching users...');
                const res = await axios.get("/api/v1/users");
                console.log('Users fetched:', res.data);
                setUsers(res.data);
                setError(null);
            } catch (err: any) {
                console.error("Failed to fetch users:", err);
                setError("Failed to load users. Please try again.");
            } finally {
                setIsLoading(false);
            }
        }

        fetchUsers();
    }, [authLoaded, userLoaded, userId, user]);

    // Loading while Clerk initializes
    if (!authLoaded || !userLoaded) {
        return (
            <div className="p-4">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded mb-4 w-24"></div>
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-16 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Not authenticated
    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <div className="text-gray-600 mb-4">Please log in to access chats</div>
                <Link 
                    href="/login" 
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                    Go to Login
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-4">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Chats</h1>
                <p className="text-gray-600 mt-1">
                    Welcome back, {user.firstName || user.username || 'User'}!
                </p>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                            <div className="flex items-center space-x-3 p-4 border rounded-lg">
                                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                                <div className="flex-1">
                                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="text-red-800 mb-2">{error}</div>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Users List */}
            {!isLoading && !error && (
                <>
                    {users.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-gray-500 mb-2">No other users found</div>
                            <div className="text-sm text-gray-400">
                                Invite friends to start chatting!
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="text-sm text-gray-600 mb-3">
                                {users.length} user{users.length !== 1 ? 's' : ''} available to chat
                            </div>
                            {users.map((u) => (
                                <Link
                                    key={u.id}
                                    href={`/chat/${u.id}`}
                                    className="block p-4 border rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all group cursor-pointer"
                                >
                                    <div className="flex items-center space-x-3">
                                        {u.avatar ? (
                                            <img 
                                                src={u.avatar} 
                                                alt={u.username || u.email}
                                                className="w-10 h-10 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                                                {(u.name || u.username || u.email)[0].toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                                                {u.name || u.username || u.email}
                                            </div>
                                            {u.name && u.username && (
                                                <div className="text-sm text-gray-500">
                                                    @{u.username}
                                                </div>
                                            )}
                                            <div className="text-xs text-gray-400 mt-1">
                                                Click to start chatting
                                            </div>
                                        </div>
                                        <div className="text-gray-400 group-hover:text-gray-600">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Footer */}
            <div className="mt-8 pt-4 border-t text-center">
                <Link 
                    href="/" 
                    className="text-blue-500 hover:text-blue-600 text-sm"
                >
                    ← Back to Home
                </Link>
            </div>
        </div>
    );
};

export default ChatListPage;