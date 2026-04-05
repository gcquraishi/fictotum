import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://fictotum.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Fictotum — Where History Meets Fiction",
    template: "%s — Fictotum",
  },
  description:
    "Explore 2,600+ historical figures and how they are portrayed across film, television, literature, and theatre. A knowledge graph at the intersection of history and fiction.",
  openGraph: {
    type: "website",
    siteName: "Fictotum",
    title: "Fictotum — Where History Meets Fiction",
    description:
      "Explore 2,600+ historical figures and how they are portrayed across film, television, literature, and theatre.",
    url: BASE_URL,
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "Fictotum — Where History Meets Fiction",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fictotum — Where History Meets Fiction",
    description:
      "Explore 2,600+ historical figures and how they are portrayed across film, television, literature, and theatre.",
    images: ["/og-default.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
