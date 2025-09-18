import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import { error } from "console";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(req: Request) {
    //@ts-ignore
    const { userId } = await auth(req); // Pass req to auth()
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json();
    const { receiverId, content } = body;

    if (!receiverId || !content || typeof content !== 'string') {
        return NextResponse.json({ error: "Missing inputs" }, { status: 400 });
    }
    if (content.trim().length === 0 || content.length > 1000) {
        return NextResponse.json({ error: "Message must be 1-1000 characters" }, { status: 400 });
    }
    //verify sender exists
    const sender = await prisma.user.findUnique({
        where: {clerkId: userId}
    });
    if(!sender) return NextResponse.json({error: "Unauthorised sender"}, {status:404})

     //verify receiver exists
     const receiver = await prisma.user.findUnique({
        where:{id: receiverId}
     })
         if(!receiver) return NextResponse.json({error: "Receiver not found"}, {status:404})


    try {
        const message = await prisma.message.create({
            data: {
                content: content.trim(),
                senderId: sender.id,
                receiverId: receiver.id
            },
        include: {
                sender: {
                    select: {
                        id: true,
                        clerkId: true,
                        username: true,
                        name: true,
                        avatar: true
                    }
                },
                receiver: {
                    select: {
                        id: true,
                        clerkId: true,
                        username: true,
                        name: true,
                        avatar: true
                    }
                }
            }
        });
        
    // Emit to Socket.io if available
        const res = NextResponse.json(message, { status: 201 });
        
        // Get Socket.io instance and emit new message
        //@ts-ignore
        if (global.io) {
            // Create conversation ID (consistent ordering)  
            //? This line is like senderId + '-' + receiverId like '123-456'
            const conversationId = [sender.id, receiverId].sort().join('-');  //!You fetch the sender from your own database
            
            // Emit to conversation participants
                    //@ts-ignore
            global.io.to(`conversation:${conversationId}`).emit('new-message', message);
            
            // Also emit to individual user rooms for notifications
                    //@ts-ignore
            global.io.to(`user:${receiverId}`).emit('message-notification', {
                message,
                from: sender
            });
        }
        return res;
    } catch (error) {
        console.error("Error creating message:", error);
        return NextResponse.json({ error: "failed to send message" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    //@ts-ignore
    const { userId } = await auth(req); // Pass req to auth()
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const withUserId = searchParams.get("with");

    if (!withUserId) {
        return NextResponse.json({ error: "Missing query params" }, { status: 400 });
    }

    const currentUser = await prisma.user.findUnique({
        where: {clerkId: userId}
    });

    if(!currentUser) return NextResponse.json({error: "Can't find current user"}, {status:404})

    try {
        const messages = await prisma.message.findMany({
            where: {
                OR: [ 
//! This "OR" If condition1 is true → messages where the logged-in user sent a message.
//! If condition2 is true → messages where the other user sent a message.
//! If both are true (which can happen if there are multiple rows in the DB) → both sets are returned.
//! Together, it ensures you get all messages in either direction.
                    // Current user sends to other user
                    {
                        senderId: currentUser.id,
                        receiverId: withUserId
                    },
                    // Other user sends to current user
                    { 
                        senderId: withUserId,
                        receiverId: currentUser.id
                    },
                ],
            },
            orderBy: { createdAt: "asc" },
            include: {
                sender: {
                    select: {
                        id: true,
                        clerkId: true,
                        username: true,
                        name: true,
                        avatar: true
                    }
                },
                receiver: {
                    //! BEST PRACTICE TO USE SELECT  You explicitly choose which fields you want from related models.
                    //! More secure → avoids leaking sensitive fields (like email, passwordHash, etc.).
                    //! More efficient → less data transferred from DB → API is faster.
                    //! Slightly more code to write.
                    select:{
                        id: true,
                        clerkId: true,
                        username: true,
                        name: true,
                        avatar: true
                    }
                },
            },
        });
        return NextResponse.json(messages);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }
}