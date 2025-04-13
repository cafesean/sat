'use client'

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react'; // Import Suspense
import { toast } from 'sonner';

// Renamed the original component
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isCredentialsLoading, setIsCredentialsLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'; // Default redirect

  const handleCredentialsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCredentialsLoading(true);
    try {
      const result = await signIn('credentials', {
        redirect: false, // Handle redirect manually
        email,
        password,
        callbackUrl,
      });

      if (result?.error) {
        console.error("Login failed:", result.error);
        toast.error('Invalid email or password. Please try again.');
        setIsCredentialsLoading(false);
      } else if (result?.ok) {
        toast.success('Login successful!');
        router.push(callbackUrl);
      } else {
        // Handle unexpected scenarios
        toast.error('An unexpected error occurred during login.');
        setIsCredentialsLoading(false);
      }
    } catch (error) {
      console.error("Login exception:", error);
      toast.error('An error occurred. Please try again later.');
      setIsCredentialsLoading(false);
    }
  };

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsEmailLoading(true);
    try {
      const result = await signIn('email', {
        redirect: false, // Magic link handled via email
        email,
        callbackUrl,
      });

      if (result?.error) {
        console.error("Email login failed:", result.error);
        toast.error('Failed to send login link. Please check the email and try again.');
        setIsEmailLoading(false);
      } else if (result?.ok) {
        toast.success('Check your email for the login link!');
        // Optionally redirect to a confirmation page
        // router.push('/auth/check-email');
        setEmail(''); // Clear email field
        setIsEmailLoading(false);
      } else {
        toast.error('An unexpected error occurred.');
        setIsEmailLoading(false);
      }
    } catch (error) {
      console.error("Email login exception:", error);
      toast.error('An error occurred sending the email link.');
      setIsEmailLoading(false);
    }
  };


  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-100px)] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Login</CardTitle>
          <CardDescription>Access your SAT Study App account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Credentials Form */}
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email-credentials">Email</Label>
              <Input
                id="email-credentials"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isCredentialsLoading || isEmailLoading}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isCredentialsLoading || isEmailLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isCredentialsLoading || !email || !password}>
              {isCredentialsLoading ? 'Logging in...' : 'Login with Password'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          {/* Email Magic Link Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
             <div>
               <Label htmlFor="email-magiclink">Email for Magic Link</Label>
               <Input
                 id="email-magiclink"
                 type="email"
                 placeholder="you@example.com"
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 required
                 disabled={isCredentialsLoading || isEmailLoading}
               />
             </div>
            <Button type="submit" variant="outline" className="w-full" disabled={isEmailLoading || !email}>
              {isEmailLoading ? 'Sending Link...' : 'Send Login Link'}
            </Button>
          </form>

           {/* Add Google/Other Providers Later */}
           {/* <Button variant="outline" className="w-full" onClick={() => signIn('google', { callbackUrl })}>Login with Google</Button> */}

        </CardContent>
        <CardFooter className="flex flex-col space-y-2 text-sm">
           <p className="text-muted-foreground">
             Don't have an account?
             <Link href="/signup" className="font-semibold text-primary ml-1 hover:underline">
               Sign up
             </Link>
           </p>
           {/* Add Forgot Password Link Later */}
           {/* <Link href="/forgot-password" className="text-muted-foreground hover:text-primary hover:underline">
             Forgot password?
           </Link> */}
        </CardFooter>
      </Card>
    </div>
  );
}

// New default export component wrapping LoginForm with Suspense
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><p>Loading...</p></div>}>
      <LoginForm />
    </Suspense>
  );
}
