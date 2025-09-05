import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";

export default async function Home() {
  const user = await currentUser();

  return (
    <main className="flex flex-col items-center justify-center h-screen">
      {user ? (
        <>
          <h1 className="text-2xl">Welcome, {user.firstName} 👋</h1>
          <UserButton afterSignOutUrl="/" />
        </>
      ) : (
        <a
          href="/signup"
          className="px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          Sign In
        </a>
      )}
    </main>
  );
}
