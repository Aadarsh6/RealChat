import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import { error } from "console";
import { NextResponse } from "next/server";


const prisma = new PrismaClient()
export async function(){
    const { userId } = auth()
    if(!userId) return NextResponse.json({error:'No available'}, {status: 401})

        try {
            const me = await prisma.user.findUnique({
                where:{
                    clerkId: userId
                }
            })

        if(!me) return NextResponse.json({error:"user not found in DB"}, {status:404})

            const user = await prisma.user.findMany({
                where: {
                    NOT:{id: me.id},
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