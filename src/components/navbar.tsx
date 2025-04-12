'use client' // Needed for useSession, useState, etc.

import { Button } from '@/components/ui/button';
import { signIn, signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
// import { Moon, Sun } from 'lucide-react' // For theme toggle later
// import { useTheme } from 'next-themes' // For theme toggle later
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu' // For theme toggle later

const Navbar = () => {
  const { data: session, status } = useSession()
  // const { setTheme } = useTheme() // For theme toggle later

  return (
    <nav className='flex items-center justify-between p-4 border-b'>
      <Link href='/' className='text-lg font-semibold'>
        SAT Study App {/* Placeholder Logo/Title */}
      </Link>
      <div className='flex items-center gap-4'>
        {/* Theme Toggle Placeholder - Implement later */}
        {/* <Button variant="outline" size="icon" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button> */}

        {/* Auth Button */}
        {status === 'loading' ? (
          <Button variant='outline' size='sm' disabled>
            Loading...
          </Button>
        ) : session ? (
          <>
            {/* Optional: Display user info */}
            {/* <span>{session.user?.name || session.user?.email}</span> */}
            <Button variant='outline' size='sm' onClick={() => signOut()}>
              Sign Out
            </Button>
          </>
        ) : (
          <Button variant='outline' size='sm' onClick={() => signIn()}>
            Sign In
          </Button>
        )}
      </div>
    </nav>
  )
}

export default Navbar
