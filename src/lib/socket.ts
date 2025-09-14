import { Server as NetServer } from "http";
import { Server as ServerIO } from "socket.io";

export type NextApiResponseServerIO = {
    socket: {
        server: NetServer & {
            io: ServerIO
        }
    }
}

export const initSocket = (server: NetServer) => {
    const io = new ServerIO(server, {
        path: "/api/socket.io",
        addTrailingSlash: false,
        cors:{
            origin: process.env.NODE_ENV === 'production'
            ? process.env.NEXTAUTH_URL 
            : "http://localhost:3000",
            methods:['GET', 'POST']
        }
    })
    


const userSocket = new Map<string, string>();

io.on('connection',  (socket)=>{
    console.log("User connected", socket.id)

    socket.on('user-online', (userId: string)=>{
        userSocket.set(userId, socket.id)  //!here we are setting 2 str valve to a Map container 
        //@ts-ignore
        socket.userId = userId
        console.log(`userId ${userId} is online with socketId of ${socket.id}`)
    })

    socket.on('typing', (data: {toUserID: string, fromUserID: string, username: string})=>{
        const targetSocketId = userSocket.get(data.toUserID);
        if(targetSocketId){
            
            //! .emit(eventName, data) sends data from one side to the other: Frontend → Backend
            //! 👉 Think of .emit() like:
            //! 📢 "Hey, whoever is listening for this eventName, here’s some data."

            io.to(targetSocketId).emit('user-typing', {
                fromUserId: data.fromUserID,
                username: data.username //!getting data form props we have passed to our fn
            });
        }
    })

    socket.on('stop-typing', (data:{toUserId:string, fromUserId: string})=>{
        const targetSocketId = userSocket.get(data.toUserId)
        if(targetSocketId){
            io.to(targetSocketId).emit('user-stop-typing', {
                fromUserId: data.fromUserId
            });
        }
    });


    socket.on('disconnect', ()=>{
        //@ts-ignore
        if(socket.userId){
                    //@ts-ignore
            userSocket.delete(socket.userId);
                    //@ts-ignore
            console.log(`User ${socket.userId} went offline`)
        }
        console.log("User disconnected", socket.id)
    })
});


//! Store userSockets on io instance for access in API routes
//@ts-ignore
  io.userSocket = userSocket;
  return io
}