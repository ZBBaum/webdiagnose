import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "SiteIQ",
  description: "See your website through your customer's eyes",
  openGraph: {
    title: "SiteIQ",
    description: "See your website through your customer's eyes",
    url: "https://siteiqai.vercel.app",
    images: [{ url: "https://siteiqai.vercel.app/texting_image2.png", width: 2856, height: 1520 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["https://siteiqai.vercel.app/texting_image2.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@700,500,400&display=swap"
        />
      </head>
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
