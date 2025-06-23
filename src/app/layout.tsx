import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import { ClientLayout } from './ClientLayout';

export const metadata: Metadata = {
  title: 'LibroVision',
  description: 'Discover your next favorite book.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Font preloading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,200..900;1,7..72,200..900&display=swap" rel="stylesheet" />
        
        {/* API preconnections */}
        <link rel="preconnect" href="https://books.google.com" />
        <link rel="preconnect" href="https://www.googleapis.com" />
        <link rel="preconnect" href="https://books.googleusercontent.com" />
        
        {/* DNS prefetching for images */}
        <link rel="dns-prefetch" href="https://covers.openlibrary.org" />
        <link rel="dns-prefetch" href="https://images-na.ssl-images-amazon.com" />
        <link rel="dns-prefetch" href="https://lh3.googleusercontent.com" />
        
        {/* Performance hints */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#000000" />
        
        {/* Preload critical resources */}
        <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className={cn("min-h-screen bg-background font-body antialiased flex flex-col")}>
        <ClientLayout>
            {children}
        </ClientLayout>
      </body>
    </html>
  );
}
