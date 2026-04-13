import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ometin',
  description: 'Video chat + swipe dating UI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sk">
      <body>{children}</body>
    </html>
  );
}
