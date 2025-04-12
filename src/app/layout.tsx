import Navbar from '@/components/navbar';
import ClientProviders from '@/providers/ClientProviders'; // Import the new component
import '@/styles/globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type React from 'react';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: "SAT Study Assistant",
  description: "AI-powered SAT vocabulary, reading, and writing practice",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body className={inter.className}>
        {/* Wrap with ClientProviders */}
        <ClientProviders>
          <Navbar />
          {children}
        </ClientProviders>
      </body>
    </html>
  )
}
