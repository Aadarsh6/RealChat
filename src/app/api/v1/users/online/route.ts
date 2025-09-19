import { auth } from "@clerk/nextjs/server";
import { error } from "console";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        //@ts-ignore
        const userId = await auth(req)
        if(!userId) return NextResponse.json({error:"Unauthorized"}, {status:401})

        const { searchParams } = new URL(req.url)
        const checkUserId = searchParams.get("userId");

        if(!checkUserId) return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });

    const isOnline = global.io?.userSockets?.has(checkUserId) || false;

    return NextResponse.json({
        userId: checkUserId,
        isOnline
    })

    } catch (error) {
        console.log("Error checking user status",error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
        
    }    
}