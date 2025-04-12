'use client';

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
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </TRPCProvider>
    </SessionProvider>
  );
};

export default ClientProviders;
