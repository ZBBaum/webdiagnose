import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Navbar from "@/components/Navbar";
import ThemeScript from "@/components/ThemeScript";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SiteIQ",
  description: "See your website through your customer's eyes",
  openGraph: {
    title: "SiteIQ",
    description: "See your website through your customer's eyes",
    url: "https://siteiqai.vercel.app",
    images: [{ url: "https://siteiqai.vercel.app/og-image.png" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["https://siteiqai.vercel.app/og-image.png"],
  },
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body>
        <ThemeScript />
        <Navbar />
        {children}
      </body>
    </html>
  );
}
