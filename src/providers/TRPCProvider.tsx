'use client';

import { api, getBaseUrl } from '@/utils/trpc';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpLink, loggerLink } from '@trpc/client'; // Change httpBatchLink to httpLink
import React from 'react';
import superjson from 'superjson'; // Restore superjson

const TRPCProvider = ({ children }: { children: React.ReactNode; }) => {
  const [queryClient] = React.useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 1000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error: any) => {
          // Don't retry on 404s or other client errors
          if (error?.data?.httpStatus >= 400 && error?.data?.httpStatus < 500) {
            return false;
          }
          return failureCount < 3;
        },
      },
      mutations: {
        retry: false,
      },
    },
  }));

  const [trpcClient] = React.useState(() =>
    api.createClient({
      // transformer: superjson, // Remove transformer from here
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === "development" ||
            (opts.direction === "down" && opts.result instanceof Error),
        }),
        httpLink({ // Change httpBatchLink to httpLink
          transformer: superjson, // Restore transformer here
          url: `${getBaseUrl()}/api/trpc`,
          headers() {
            return {};
          },
        }),
      ],
    })
  );
  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </api.Provider>
  );
}; 

export default TRPCProvider;
