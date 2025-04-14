'use client' // Needed for useSession, useState, etc.

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"; // Import Avatar components
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // Import Dropdown components
import { cn } from '@/lib/utils';
import { api } from '@/utils/trpc';
import { UserRole } from '@prisma/client';
import { Moon, PlayCircle, Sun } from 'lucide-react'; // Add Moon, Sun
import { signOut, useSession } from 'next-auth/react'; // Removed signIn
import { useTheme } from 'next-themes'; // Import useTheme
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';

const Navbar = () => {
  const { data: session, status } = useSession()
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme(); // Get theme state and setter

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/vocabulary', label: 'Vocabulary' }
  ];

  return (
    <nav className='flex items-center justify-between p-4 border-b gap-4'>
      {/* Left side: Logo and Main Nav */}
      <div className="flex items-center gap-6">
        <Link href='/' className='text-lg font-semibold'>
          SAT Study App {/* Placeholder Logo/Title */}
        </Link>
        {/* Main Navigation Links - Show only when logged in */}
        {session && (
          <div className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'text-muted-foreground hover:text-foreground',
                    pathname.startsWith(link.href) && 'text-foreground font-semibold' // Highlight active link
                  )}
                >
                  {link.label}
                </Button>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Right side: Theme Toggle and Auth */}
      <div className='flex items-center gap-2'> {/* Reduced gap */}
        {/* Theme Toggle Button */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8" // Match avatar button size
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Auth Buttons */}
        {status === 'loading' ? (
          <Button variant='outline' size='sm' disabled className="w-[90px]"> {/* Fixed width for loading */}
            Loading...
          </Button>
        ) : session ? (
          <>
            {/* Quick Practice Button */}
            <QuickPracticeButton />
            {/* User Dropdown Menu */}
            <UserNav session={session} />
          </>
        ) : (
          // Link to the login page instead of triggering signIn directly
          <Link href="/login" passHref>
             <Button variant='outline' size='sm'>
               Sign In
             </Button>
           </Link>
        )}
      </div>
    </nav>
  )
}

// Separate component for the Quick Practice button logic
function QuickPracticeButton() {
  const router = useRouter();
  const quickStartMutation = api.vocab.startQuickVocabSession.useMutation({
    onSuccess: (data) => {
      toast.success('Quick practice session started!');
      router.push(`/vocabulary/practice/${data.practiceSessionId}`);
    },
    onError: (error) => {
      toast.error(`Failed to start quick session: ${error.message}`);
    }
  });

  return (
    <Button
      variant='secondary' // Or another appropriate variant
      size='sm'
      onClick={() => quickStartMutation.mutate()}
      disabled={quickStartMutation.isPending}
    >
      {quickStartMutation.isPending
        ? 'Starting...'
        : <><PlayCircle className="mr-2 h-4 w-4" /> Quick Practice</>
      }
    </Button>
  );
}

// Helper function to get initials
const getInitials = (name?: string | null, email?: string | null): string => {
  if (name) {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  if (email) {
    return email.substring(0, 2).toUpperCase();
  }
  return '??';
};

// User Navigation Dropdown Component
function UserNav({ session }: { session: any }) { // Use 'any' for now, refine later if needed
  const user = session.user;
  const initials = getInitials(user?.name, user?.email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? user?.email ?? 'User'} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.name ?? 'User'}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email ?? ''}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* Add other items like Profile, Settings later if needed */}
        {/* <DropdownMenuItem>Profile</DropdownMenuItem> */}
        {user?.role === UserRole.ADMIN && (
           <Link href='/admin/users' passHref>
             <DropdownMenuItem>Admin Panel</DropdownMenuItem>
           </Link>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default Navbar
