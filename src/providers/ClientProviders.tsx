'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { useBackgroundSync } from '@/hooks/useBackgroundSync'; // Import the new hook
import TRPCProvider from '@/providers/TRPCProvider';
import { SessionProvider, useSession } from 'next-auth/react';
import React, { useEffect } from 'react'; // Import useEffect

// Internal component to activate the background sync hook
function BackgroundSyncManager() {
  const { status } = useSession();
  const { isOnline, syncStatus, triggerSync } = useBackgroundSync();

  // Optional: Log status changes or trigger sync manually based on events
  useEffect(() => {
    console.log(`Background Sync Status: Online=${isOnline}, SyncState=${syncStatus}, Auth=${status}`);
    // Example: You could potentially trigger sync more aggressively here if needed,
    // but the hook already handles online/auth changes.
  }, [isOnline, syncStatus, status]);

  // This component doesn't render anything visual
  return null;
}


interface ClientProvidersProps {
  children: React.ReactNode;
}

const ClientProviders = ({ children }: ClientProvidersProps) => {
  return (
    <SessionProvider>
      <TRPCProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="light" // Change default theme to light
          enableSystem={false} // Disable system theme preference
          disableTransitionOnChange
        >
          {children}
          {/* Render the BackgroundSyncManager to activate the hook */}
          <BackgroundSyncManager />
        </ThemeProvider>
      </TRPCProvider>
    </SessionProvider>
  );
};

export default ClientProviders;
