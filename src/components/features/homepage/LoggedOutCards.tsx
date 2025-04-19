import Link from "next/link";

export function LoggedOutCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="border rounded-lg p-6 flex flex-col items-center text-center">
        <h2 className="text-2xl font-semibold mb-4">Study Vocabulary</h2>
        <p className="text-muted-foreground mb-6">Expand your vocabulary with personalized word banks.</p>
        <Link href="/login" className="bg-blue-500 text-white px-6 py-3 rounded-md font-semibold">
          Start Now
        </Link>
      </div>
      <div className="border rounded-lg p-6 flex flex-col items-center text-center">
        <h2 className="text-2xl font-semibold mb-4">Practice Reading & Writing</h2>
        <p className="text-muted-foreground mb-6">Improve your skills with targeted exercises.</p>
        <Link href="/login" className="bg-blue-500 text-white px-6 py-3 rounded-md font-semibold">
          Start Now
        </Link>
      </div>
    </div>
  );
}