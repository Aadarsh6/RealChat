import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(req: Request) {
    console.log('=== USERS API CALLED ===');
    
    // For Next.js 15, pass the request object to auth()
    //@ts-ignore
    const { userId } = await auth();
    console.log('userId from auth():', userId);
    
    if (!userId) {
        console.log('❌ No userId found - returning 401');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ User authenticated:', userId);

    try {
        const users = await prisma.user.findMany({
            where: {
                NOT: { clerkId: userId },
            },
            select: {
                id: true,
                clerkId:true,
                username: true,
                name: true,
                email: true,
                avatar: true
            },
        });
        
        console.log('✅ Users found:', users.length);
        console.log('Users data:', users);
        
        return NextResponse.json(users);
    } catch (error) {
        console.error("❌ Error fetching users:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}