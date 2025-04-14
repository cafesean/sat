import { auth } from '@/auth';
import { cn } from '@/lib/utils';
import { BookOpenIcon, HomeIcon } from 'lucide-react';
import Link from 'next/link';

const Sidebar = async ({ className }: { className?: string }) => {
  const session = await auth();

  return (
    <aside className={cn('w-64 border-r p-4 hidden md:block', className)}>
      <div className='flex flex-col space-y-2'>
        <Link href='/' className='text-lg font-semibold mb-4'>
          SAT Study App
        </Link>
        <Link
          href='/'
          className='flex items-center space-x-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent hover:text-accent-foreground'
        >
          <HomeIcon className="h-4 w-4" />
          <span>Home</span>
        </Link>
        {session && (
          <>
            <Link
              href='/vocabulary'
              className='flex items-center space-x-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent hover:text-accent-foreground'
            >
              <BookOpenIcon className="h-4 w-4" />
              <span>Vocabulary</span>
            </Link>
          </>
        )}
        {!session && (
          <>
            <Link
              href='/login'
              className='flex items-center space-x-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent hover:text-accent-foreground'
            >
              <span>Login</span>
            </Link>
            <Link
              href='/signup'
              className='flex items-center space-x-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent hover:text-accent-foreground'
            >
              <span>Sign Up</span>
            </Link>
          </>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
