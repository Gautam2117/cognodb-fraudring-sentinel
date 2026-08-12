import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FraudRing Sentinel | CognoDB Financial Graph Intelligence',
  description:
    'Financial crime and synthetic identity detection using CognoDB openCypher graph database. Multi-hop ring detection, shortest-path money flow tracing, and synthetic identity clustering.',
  keywords: ['CognoDB', 'openCypher', 'graph database', 'fraud detection', 'financial intelligence', 'money laundering', 'AML'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
