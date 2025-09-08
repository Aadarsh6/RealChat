"use client"

import { useEffect, useState } from 'react'
import axios from 'axios'
import Link from 'next/link'

const ChatListPage = () => {
    const [users, setUser] = useState<any[]>([])

    useEffect(()=>{
        async function fetchUser() {
            const res = await axios.get("/api/v1/users");
            setUser(res.data)
        }
        fetchUser()
    },[])
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Chats</h1>
      <ul className="space-y-2">
        {users.map((u) => (
          <li key={u.id}>
            <Link
              href={`/chat/${u.id}`}
              className="block p-3 border rounded hover:bg-gray-50"
            >
              {u.username || u.email}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ChatListPage