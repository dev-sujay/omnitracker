import React, { Suspense } from 'react';
import TrackerInitializer from '../components/TrackerInitializer';

export const metadata = {
  title: 'Next.js App Router Tracker Demo',
  description: 'Demonstrating modular tracker SDK integration in Next.js 14',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif' }}>
        <Suspense fallback={null}>
          <TrackerInitializer />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
