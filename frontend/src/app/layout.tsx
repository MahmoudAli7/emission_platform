'use client';

import type { Metadata } from 'next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import './globals.css';

// Create a client
const queryClient = new QueryClient();

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <QueryClientProvider client={queryClient}>
          <nav className="border-b border-gray-200 bg-white px-6 py-4">
            <h1 className="text-xl font-bold text-gray-900">
              Emissions Monitor
            </h1>
          </nav>
          <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        </QueryClientProvider>
      </body>
    </html>
  );
}
