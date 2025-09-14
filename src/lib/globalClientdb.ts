import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined  
    //!The | character creates a Union Type. It means a variable can be one of several possible types. It's used during development and for static type checking.
}
export const db = globalForPrisma.prisma ?? new PrismaClient()
//!It works like this: "If the value on the left is null or undefined, use the value on the right. Otherwise, use the value on the left."


if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db