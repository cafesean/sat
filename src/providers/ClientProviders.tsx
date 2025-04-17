'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { useBackgroundSync } from '@/hooks/useBackgroundSync'; // Import the new hook
import TRPCProvider from '@/providers/TRPCProvider';
import { SessionProvider, useSession } from 'next-auth/react';
import React, { useEffect } from 'react'; // Import useEffect

// Internal component to activate the background sync hook
function BackgroundSyncManager() {
  const { status } = useSession();
  const { syncStatus, isSyncing } = useBackgroundSync();

  // Optional: Log status changes or trigger sync manually based on events
  useEffect(() => {
    // Log available status info
    console.log(`Background Sync Status: SyncState=${syncStatus}, Auth=${status}, Syncing=${isSyncing}`);
  }, [syncStatus, status, isSyncing]);

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
