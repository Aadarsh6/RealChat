import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { syncUser } from "@/lib/syncUser";
import Navigation from "./Components/Navigation/Navigation";
import { SocketProvider } from "@/Context/socketContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chat App",
  description: "Next.js Chat App with Clerk",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  console.log('=== ROOT LAYOUT RENDERING ===');
  
  try {
    const syncResult = await syncUser();
    console.log('Sync user result:', syncResult ? 'Success' : 'No user or already synced');
  } catch (error) {
    console.error('Error in syncUser:', error);
  }
  
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <SocketProvider>
          <Navigation/>
          {children}
          </SocketProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}