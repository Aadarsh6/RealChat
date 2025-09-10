import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await currentUser();

  if(user){
    //@ts-ignore
    redirect("/chat")
  }

  return (
    <main className="flex flex-col items-center justify-center h-screen">  
        <a
          href="/signup"
          className="px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          Sign In
        </a>
    </main>
  );
}
