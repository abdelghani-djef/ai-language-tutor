import type { Metadata } from "next";
import { Fraunces, Fredoka, Geist, Geist_Mono, Noto_Sans_Arabic, Nunito } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-display", subsets: ["latin"] });
// Rounded fonts for the kids themes. Not preloaded: only those themes use them.
const nunito = Nunito({ variable: "--font-kids", subsets: ["latin"], preload: false });
const fredoka = Fredoka({ variable: "--font-kids-display", subsets: ["latin"], preload: false });
// Fallback for Arabic text (interface and cards); the Latin fonts have no Arabic letters.
const arabic = Noto_Sans_Arabic({ variable: "--font-arabic", subsets: ["arabic"], preload: false });

// Sets the saved interface language's direction before the first paint, so an
// Arabic page doesn't flip from left-to-right after loading.
const localeScript = `try{var l=localStorage.getItem("linguacards:locale");if(l==="fr"||l==="ar"){var h=document.documentElement;h.lang=l;h.dir=l==="ar"?"rtl":"ltr"}}catch(e){}`;

export const metadata: Metadata = {
  title: "LinguaCards",
  description: "Translate in your browser, save flashcards, and review them with FSRS spaced repetition.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${nunito.variable} ${fredoka.variable} ${arabic.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: localeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>
          <SiteHeader />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
