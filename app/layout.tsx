import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ometin",
  description: "Random video chat and swipe app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sk">
      <body>{children}</body>
    </html>
  );
}
