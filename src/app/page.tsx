import { auth } from "@/auth";
import { UserDashboard } from "@/components/features/dashboard/UserDashboard";
import { LoggedOutCards } from "@/components/features/homepage/LoggedOutCards";
import { WordBankLoginCTA } from "@/components/features/homepage/WordBankLoginCTA";

export default async function Home() {
  const session = await auth();
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center justify-center text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          {session ? `Welcome back, ${session.user?.name}` : 'SAT Study Assistant'}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          {session ? 'Continue your SAT preparation journey' : 'Your personalized AI-powered study companion for SAT vocabulary, reading, and writing practice.'}
        </p>
      </div>

      {session ? (
        <UserDashboard />
      ) : (
        <>
          <LoggedOutCards />
          <WordBankLoginCTA />
        </>
      )}
    </main>
  )
}
