'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PlayCircle } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const MobileBottomNav = () => {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t py-2 px-4 flex items-center justify-around z-50">
      <Link href="/vocabulary">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'text-muted-foreground hover:text-foreground',
            pathname.startsWith('/vocabulary') && 'text-foreground font-semibold'
          )}
        >
          Vocabulary
        </Button>
      </Link>
      <Link href="/vocabulary">
        <Button
          variant="default"
          size="sm"
        >
          <PlayCircle className="mr-2 h-4 w-4" />
          Quick Practice
        </Button>
      </Link>
    </nav>
  );
};

export default MobileBottomNav;