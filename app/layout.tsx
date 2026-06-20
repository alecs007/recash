import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { auth } from "@/auth";
import { SessionProvider } from "./components/Providers/SessionProvider";
import { LoadingProvider } from "@/context/LoadingContext";
import { AuthModalProvider } from "@/context/AuthModalContext";
import { AuthModal } from "./components/Auth/AuthModal";
import { GoogleOneTap } from "./components/Auth/GoogleOneTap";
import { Suspense } from "react";
import SmoothScroll from "./components/UX/SmoothScroll";
import { NavigationProgress } from "./components/UX/NavigationProgress";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Recash",
  description: "Recash - Reciclează. Încasează. Repetă.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="ro" className={`${geistSans.variable} h-full antialiased`}>
      <head>
        <link
          rel="icon"
          type="image/png"
          href="/icon/favicon-96x96.png"
          sizes="96x96"
        />
        <link rel="icon" type="image/svg+xml" href="/icon/favicon.svg" />
        <link rel="shortcut icon" href="/icon/favicon.ico" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/icon/apple-touch-icon.png"
        />
        <meta name="apple-mobile-web-app-title" content="Recash" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className="min-h-full flex flex-col">
        <SessionProvider session={session}>
          <Suspense>
            <AuthModalProvider>
              <LoadingProvider>
                <NavigationProgress />
                <SmoothScroll>{children}</SmoothScroll>
                <AuthModal />
                <GoogleOneTap />
              </LoadingProvider>
            </AuthModalProvider>
          </Suspense>
        </SessionProvider>

        <Toaster
          position="top-center"
          richColors
          closeButton
          duration={4500}
          toastOptions={{
            style: {
              fontFamily: "var(--font-geist-sans)",
              borderRadius: "1rem",
              fontSize: "0.875rem",
            },
          }}
        />
      </body>
    </html>
  );
}
