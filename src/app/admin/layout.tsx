import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({
  variable: "--font-sans-latin",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Administration — Africa Football Hub",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" dir="ltr" className={`${inter.variable} h-full antialiased`}>
      <body className="font-sans min-h-full flex flex-col">{children}</body>
    </html>
  );
}
