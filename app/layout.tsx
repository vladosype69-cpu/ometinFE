import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ometin Chat",
  description: "Random chat MVP"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sk">
      <body>{children}</body>
    </html>
  );
}
