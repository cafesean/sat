import Link from "next/link";

export function WordBankLoginCTA() {
  return (
    <div className="mt-8 text-center">
      <p className="text-lg text-muted-foreground">
        Can't find your word banks?{" "}
        <Link href="/login" className="text-blue-500 hover:underline">
          Login now.
        </Link>
      </p>
    </div>
  );
}