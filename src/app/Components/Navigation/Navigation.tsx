"use client"

import { UserButton, useUser } from "@clerk/nextjs"
import Link from "next/link";
import { usePathname } from "next/navigation"



const Navigation = () => {
    const { user } = useUser()
    const pathname = usePathname()
    if(!pathname) return null
    if(pathname.includes('/login') || pathname.includes('signup')) return null

   return (
        <nav className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Left side - Logo and main nav */}
                    <div className="flex items-center space-x-8">
                        <Link href="/" className="flex items-center">
                            <div className="bg-blue-500 text-white px-3 py-2 rounded-lg font-bold text-lg">
                                ChatApp
                            </div>
                        </Link>
                        
                        {user && (
                            <div className="hidden md:flex space-x-6">
                                <Link 
                                    href="/chat" 
                                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                        pathname.startsWith('/chat') 
                                            ? 'bg-blue-100 text-blue-700' 
                                            : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                                    }`}
                                >
                                    Chats
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Right side - User actions */}
                    <div className="flex items-center space-x-4">
                        {user ? (
                            <>
                                <div className="hidden md:flex items-center space-x-3">
                                    <span className="text-sm text-gray-700">
                                        Hi, {user.firstName || user.username || 'User'}
                                    </span>
                                </div>

                                {/* //! UserButton is a component from Clerk that displays the current user's avatar/profile picture.
                                //! When clicked, it shows a dropdown menu with options like Profile, Account, and Sign Out. */}
                                
                                <UserButton   
                                //@ts-ignore
                                    signOutRedirectUrl="/"
                                    appearance={{
                                        elements: {
                                            avatarBox: "w-8 h-8"
                                        }
                                    }}
                                />
                            </>
                        ) : (
                            <div className="flex items-center space-x-3">
                                <Link 
                                    href="/login"
                                    className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium"
                                >
                                    Sign In
                                </Link>
                                <Link 
                                    href="/signup"
                                    className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
                                >
                                    Sign Up
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile menu for authenticated users */}
                {user && (
                    <div className="md:hidden pb-3 pt-2 border-t border-gray-200">
                        <Link 
                            href="/chat" 
                            className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                pathname.startsWith('/chat') 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                            }`}
                        >
                            Chats
                        </Link>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navigation;