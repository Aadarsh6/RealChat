import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(req: Request) {
    //@ts-ignore
    const { userId } = await auth(req); // Pass req to auth()
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json();
    const { receiverId, content } = body;

    if (!receiverId || !content) {
        return NextResponse.json({ error: "Missing inputs" }, { status: 400 });
    }

    try {
        const message = await prisma.message.create({
            data: {
                content,
                sender: { connect: { clerkId: userId } },
                receiver: { connect: { id: receiverId } }
            },
            include: {
                sender: true,
                receiver: true,
            }
        });
        return NextResponse.json(message, { status: 201 });
    } catch (error) {
        console.error(error);
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

    try {
        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    // Current user sends to other user
                    {
                        sender: { clerkId: userId },
                        receiver: { id: withUserId }
                    },
                    // Other user sends to current user
                    { 
                        sender: { id: withUserId }, 
                        receiver: { clerkId: userId } 
                    },
                ],
            },
            orderBy: { createdAt: "asc" },
            include: {
                sender: true,
                receiver: true,
            },
        });
        return NextResponse.json(messages);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }
}