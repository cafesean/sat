import { cn } from '@/lib/utils'; // Assuming Shadcn setup created this
import Link from 'next/link';

// Placeholder icons (replace with actual icons later, e.g., from lucide-react)
const HomeIcon = () => <span>🏠</span>
const BookOpenIcon = () => <span>📖</span>
const PencilIcon = () => <span>✏️</span>
const LayoutDashboardIcon = () => <span>📊</span>

const Sidebar = ({ className }: { className?: string }) => {
  // TODO: Add logic to highlight active link based on current route (usePathname)
  // This would require making it a 'use client' component.

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
    { href: '/vocabulary', label: 'Vocabulary', icon: BookOpenIcon },
    { href: '/reading-writing', label: 'Reading & Writing', icon: PencilIcon },
  ]

  return (
    <aside className={cn('w-64 border-r p-4 hidden md:block', className)}> {/* Hidden on mobile by default */}
      <div className='flex flex-col space-y-2'>
        <Link href='/' className='text-lg font-semibold mb-4'>
          SAT Study App {/* Consistent with Navbar */}
        </Link>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className='flex items-center space-x-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent hover:text-accent-foreground'
            // Add active class logic here later
          >
            <item.icon />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </aside>
    // TODO: Add mobile sidebar using Shadcn Sheet component triggered from Navbar
  )
}

export default Sidebar
