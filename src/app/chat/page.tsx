"use client"

import { useEffect, useState } from 'react'
import axios from 'axios'
import Link from 'next/link'

const ChatListPage = () => {
    const [users, setUsers] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(()=>{
        async function fetchUser() {
            try{
                setIsLoading(true)
            const res = await axios.get("/api/v1/users");
            setUsers(res.data)
            setError(null)
            }catch(err){
                console.error("Failed to fetch users:", err);
                setError("Failed to load users");
            }finally{
                setIsLoading(false)
            }

        }
        fetchUser()
    },[])

    if (isLoading) {
        return (
            <div className="p-4">
                <h1 className="text-xl font-bold mb-4">Chats</h1>
                <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }


    if (error) {
        return (
            <div className="p-4">
                <h1 className="text-xl font-bold mb-4">Chats</h1>
                <div className="text-red-500">{error}</div>
            </div>
        );
    }


 return (
        <div className="p-4">
            <h1 className="text-xl font-bold mb-4">Chats</h1>
            {users.length === 0 ? (
                <div className="text-gray-500">No other users found</div>
            ) : (
                <ul className="space-y-2">
                    {users.map((u) => (
                        <li key={u.id}>
                            <Link
                                href={`/chat/${u.id}`}
                                className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center space-x-3">
                                    {u.avatar && (
                                        <img 
                                            src={u.avatar} 
                                            alt={u.username || u.email}
                                            className="w-8 h-8 rounded-full"
                                        />
                                    )}
                                    <div>
                                        <div className="font-medium">
                                            {u.name || u.username || u.email}
                                        </div>
                                        {u.name && u.username && (
                                            <div className="text-sm text-gray-500">
                                                @{u.username}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default ChatListPage;