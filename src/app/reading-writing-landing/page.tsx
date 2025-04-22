import Link from "next/link";

import { useSession } from "next-auth/react";

export default function ReadingWritingLandingPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <p>Loading...</p>;
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-4xl font-bold mb-4">Reading & Writing Module</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Improve your reading comprehension and writing skills with practice passages and prompts.
        </p>
        <p className="text-muted-foreground mb-8">
          Please login or sign up to access the reading and writing practice features.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/login">
            <button className="px-6 py-3 bg-primary text-primary-foreground rounded-md text-lg font-semibold">
              Login
            </button>
          </Link>
          <Link href="/signup">
            <button className="px-6 py-3 border border-primary text-primary rounded-md text-lg font-semibold">
              Sign Up
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Render the reading and writing practice interface here */}
      <p>Welcome, {session.user?.name}! Start your Reading & Writing practice.</p>
    </div>
  );
}