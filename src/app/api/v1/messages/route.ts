import { auth, clerkClient } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import { error } from "console";
import { sendError } from "next/dist/server/api-utils";
import { NextResponse } from "next/server";


const prisma = new PrismaClient()
export async function POST(res: Request) {
    const { userId } = auth()
    if(!userId) return NextResponse.json({ error: "unauthorised" },{ status: 401 })

        const body = await res.json()
        const { receiverId, content } = body;

    if(!receiverId || !content) return NextResponse.json({error: "Missing inputs"}, {status: 400});

    try {
        const message = await prisma.message.create({
            data:{
                content,
                sender: {connect: {clerkId: userId}},  

//!For the sender, Clerk forces you to start with clerkId since that’s what auth gives you.
//!For the receiver, it’s easier and more natural to pass around your own local id inside the app — because that’s how relations are wired in your DB (Message.receiverId → User.id).

                receiver: {connect: {id: receiverId}}
            }
        });
        return NextResponse.json(message, {status: 201})
        
    } catch (error) {
        console.error(error);
        return NextResponse.json({error:"failed to send message"}, {status: 500})
        
    }
}

//?GET req for message with user id

export async function GET(req: Request) {
    const { userId } = auth()
    if(!userId) return NextResponse.json({ error: "unauthorised" },{ status: 401 })


        const { searchParams } = new URL(req.url)
        const withUserId = searchParams.get("with");

        if(!withUserId) return NextResponse.json({error:"Missing query params"}, {status: 400})

            try {
                const message = await prisma.message.findMany({
                    where: {
                        OR:[
                            {sender: {clerkId: userId}, receiverId: withUserId},
                            {receiver: {clerkId: userId}, senderId: withUserId},
                        ],
                    },
                    orderBy:{ createdAt: "asc"},
                    include:{
                        sender: true,
                        receiver: true,
                    },
                });
                return NextResponse.json(message)
            } catch (error) {
                console.error(error)
                return NextResponse.json({error: "Failed to fetch message"}, {status: 500})
            }
}