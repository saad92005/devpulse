import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { SmoothScroll } from "@/components/smooth-scroll";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "DevPulse — AI code review that doesn't spam you", template: "%s · DevPulse" },
  description:
    "DevPulse is a GitHub App that reviews every pull request with a two-pass AI pipeline: a reviewer finds issues, a verifier throws out the noise.",
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  openGraph: { title: "DevPulse", description: "AI pull-request reviews with a built-in noise filter.", type: "website" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfd" },
    { media: "(prefers-color-scheme: dark)", color: "#07070b" },
  ],
};

// Runs before paint so the theme never flashes. Dark is the default.
const themeScript = `try{var t=localStorage.getItem("dp-theme");if(t!=="light")document.documentElement.classList.add("dark")}catch(e){document.documentElement.classList.add("dark")}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <SmoothScroll />
        </Suspense>
        {children}
        <Toaster position="bottom-right" theme="system" richColors closeButton />
      </body>
    </html>
  );
}
