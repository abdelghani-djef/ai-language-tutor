import type { Metadata } from "next";
import { Fraunces, Fredoka, Geist, Geist_Mono, Nunito } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-display", subsets: ["latin"] });
// Rounded fonts for the kids themes. Not preloaded: only those themes use them.
const nunito = Nunito({ variable: "--font-kids", subsets: ["latin"], preload: false });
const fredoka = Fredoka({ variable: "--font-kids-display", subsets: ["latin"], preload: false });

export const metadata: Metadata = {
  title: "LinguaCards",
  description: "Translate in your browser, save flashcards, and review them with FSRS spaced repetition.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${nunito.variable} ${fredoka.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <SiteHeader />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
