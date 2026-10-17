// import site metadata from "@/site-metadata.json";
import type {
  Metadata,
} from "next";


// Import Next.js mechanisms for font optimization. The Geist font is used for the main
import {
  Geist,
  Geist_Mono,
} from "next/font/google";


//Imports
import AuthProvider from "@/components/auth/AuthProvider";
import LegalAccessGuard from "@/components/auth/LegalAccessGuard";
import ConfigureAmplify from "@/components/ConfigureAmplify";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";

import "./globals.css";
import "katex/dist/katex.min.css";

/*
 * Nonce-based CSP requires request-time rendering.
 *
 * The proxy generates a fresh nonce for each request. Forcing the
 * root route segment to be dynamic prevents Next.js from serving a
 * statically prerendered HTML document with a stale/missing nonce.
 */
export const dynamic =
  "force-dynamic";

const geistSans =
  Geist({
    variable:
      "--font-geist-sans",
    subsets: [
      "latin",
    ],
  });

const geistMono =
  Geist_Mono({
    variable:
      "--font-geist-mono",
    subsets: [
      "latin",
    ],
  });

export const metadata:
  Metadata = {
    title: {
      default:
        "Kursy — matematyka, fizyka i informatyka",
      template:
        "%s | Kursy",
    },

    description:
      "Nowoczesna platforma edukacyjna z lekcjami wideo, notatkami, zadaniami i rozwiązaniami.",
  };

export default function RootLayout({
  children,
}: Readonly<{
  children:
    React.ReactNode;
}>) {
  return (
    <html
      lang="pl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#020617] text-zinc-100">
        <ConfigureAmplify />

        <AuthProvider>
          <LegalAccessGuard>
            <Navbar />

            <main className="flex-1">
              {children}
            </main>

            <Footer />
          </LegalAccessGuard>
        </AuthProvider>
      </body>
    </html>
  );
}