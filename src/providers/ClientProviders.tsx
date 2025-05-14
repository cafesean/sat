'use client';

import SessionRedirect from '@/components/SessionRedirect'; // Import SessionRedirect
import { ThemeProvider } from '@/components/theme-provider';
import TRPCProvider from '@/providers/TRPCProvider';
import { SessionProvider } from 'next-auth/react';
import React from 'react';

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
          <SessionRedirect /> {/* Add SessionRedirect component */}
        </ThemeProvider>
      </TRPCProvider>
    </SessionProvider>
  );
};

export default ClientProviders;
