import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";

const headingFont = Bricolage_Grotesque({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const monoFont = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EliteBuilders",
  description: "Compete. Build. Get Evaluated.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${headingFont.variable} ${monoFont.variable}`}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
