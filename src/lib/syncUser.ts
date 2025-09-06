import { currentUser } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
export const syncUser = async() => {
    const clerkUser = await currentUser()

    if(!clerkUser) return null
    console.log(`clerkuse: `, clerkUser);

    //@ts-ignore
    let user = await prisma.user.findUnique({
        where: {
            clerkId: clerkUser.id
        },
    })

    if(!user){
        //@ts-ignore
        user = await prisma.user.create({
            data:{ 
                clerkId: clerkUser.id,
                email: clerkUser.emailAddresses[0].emailAddress,
                username: clerkUser.username || clerkUser.id,
                name: clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ``}`:null,
                avatar: clerkUser.imageUrl,
            },
        });
    }else{
                //@ts-ignore
        user = await prisma.user.update({
            where: {clerkId: clerkUser.id},
            data:{ 
                clerkId: clerkUser.id,
                email: clerkUser.emailAddresses[0].emailAddress,
                username: clerkUser.username || clerkUser.id,
                name: clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ``}`:null,
                avatar: clerkUser.imageUrl,
            },
        });
    }

  return user
}
