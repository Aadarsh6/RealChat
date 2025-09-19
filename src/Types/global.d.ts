import { Server as ServerIO } from "socket.io";

declare global {
    var io: ServerIo & { userSocket? : Map<string, string> } | undefined      
    //!The | character creates a Union Type. It means a variable can be one of several possible types. It's used during development and for static type checking.
}

declare module 'socket.io'{
    interface Socket{
        userId?: string;
    }
}

export{}