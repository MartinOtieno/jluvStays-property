// room-booking/app/layout.tsx

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// --------------------------------------------------
// SEO / SITE CONFIGURATION
// --------------------------------------------------

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://jluvstays.com";

export const metadata: Metadata = {
  // ------------------------------------------------
  // Base URL
  // ------------------------------------------------

  metadataBase: new URL(siteUrl),

  // ------------------------------------------------
  // Basic SEO
  // ------------------------------------------------

  title: {
    default:
      "Jluv Stays | Airbnb Rooms & Apartments for Rent in Chicago",
    template:
      "%s | Jluv Stays",
  },

  description:
    "Find comfortable rooms and apartments for rent at Jluv Stays in Chicago, Illinois. Browse long-term, mid-term and short-term accommodation options and find a place that feels like home.",

  keywords: [
    "Jluv Stays",
    "Jluv Stays Chicago",
    "rooms for rent in Chicago",
    "apartments for rent in Chicago",
    "Chicago rental rooms",
    "Chicago apartments",
    "short term rooms Chicago",
    "mid term rentals Chicago",
    "long term rentals Chicago",
    "rooms for rent",
    "apartments for rent",
    "rental property Chicago",
    "accommodation Chicago",
    "airbnb chicago",
    "housing Chicago",
  ],

  authors: [
    {
      name: "Jluv Stays",
    },
  ],

  creator: "Jluv Stays",
  publisher: "Jluv Stays",

  // ------------------------------------------------
  // Robots
  // ------------------------------------------------

  robots: {
    index: true,
    follow: true,

    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // ------------------------------------------------
  // Canonical URL
  // ------------------------------------------------

  alternates: {
    canonical: "/",
  },

  // ------------------------------------------------
  // Open Graph
  // Used when sharing on Facebook, WhatsApp,
  // LinkedIn and other platforms.
  // ------------------------------------------------

  openGraph: {
    type: "website",

    locale: "en_US",

    url: siteUrl,

    siteName: "Jluv Stays",

    title:
      "Jluv Stays | Rooms & Apartments for Rent in Chicago",

    description:
      "Discover comfortable rooms and apartments for rent at Jluv Stays in Chicago, Illinois. Explore long-term, mid-term and short-term accommodation options.",

    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt:
          "Jluv Stays - Rooms, Apartments & Airbnb for Rent in Chicago",
      },
    ],
  },

  // ------------------------------------------------
  // Twitter / X
  // ------------------------------------------------

  twitter: {
    card: "summary_large_image",

    title:
      "Jluv Stays | Rooms & Apartments for Rent in Chicago",

    description:
      "Find comfortable rooms and apartments for rent at Jluv Stays in Chicago, Illinois.",

    images: ["/og-image.jpg"],
  },

  // ------------------------------------------------
  // Icons
  // ------------------------------------------------

  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  // ------------------------------------------------
  // Additional geographic information
  // ------------------------------------------------

  other: {
    "geo.region": "US-IL",
    "geo.placename": "Chicago",
    "geo.position":
      "41.7828;-87.6196",
    ICBM:
      "41.7828, -87.6196",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
          }}
        />
      </body>
    </html>
  );
}