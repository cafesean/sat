'use client';

import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const SessionRedirect = () => {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Redirect only if the session is unauthenticated and not already on the home or login page
    if (status === 'unauthenticated' && pathname !== '/' && pathname !== '/login' && pathname !== '/signup') {
      router.push('/');
    }
  }, [status, router, pathname]); // Depend on status, router, and pathname

  // This component doesn't render anything
  return null;
};

export default SessionRedirect;