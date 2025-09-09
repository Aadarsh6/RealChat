import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";


const prisma = new PrismaClient()
export async function GET(){
    const { userId } = auth()
    if(!userId) return NextResponse.json({error:'No available'}, {status: 401})

        try {

            const user = await prisma.user.findMany({
                where: {
                    NOT:{clerkId: userId},
                },
                select:{
                    id: true,
                    username: true,
                    name: true,
                    email: true,
                    avatar: true
                },
            });
            return NextResponse.json(user)
        } catch (error) {
            console.error("Error fetching users")
            return NextResponse.json({error:"Server error"},{status: 500})
            
        }
}