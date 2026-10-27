import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "Squadron 7-Zulu | Naval Sea Cadet Corps",
    template: "%s | SQ7Z",
  },
  description: "Naval Sea Cadet Corps Squadron 7-Zulu, Quincy MA. Military training, real leadership, and national adventures for youth ages 10–18. No commitment to serve required.",
  metadataBase: new URL("https://sq7-portal.vercel.app"),
  openGraph: {
    type: "website",
    siteName: "Squadron 7-Zulu",
    title: "Squadron 7-Zulu | Naval Sea Cadet Corps",
    description: "Military training, real leadership, and national adventures for youth ages 10–18. No commitment to serve required. Based in Quincy, MA.",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "Squadron 7-Zulu Naval Sea Cadet Corps",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Squadron 7-Zulu | Naval Sea Cadet Corps",
    description: "Military training, real leadership, and national adventures for youth ages 10–18. Quincy, MA.",
    images: ["/og.jpg"],
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body className="antialiased">
        <TooltipProvider>
          {children}
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </body>
    </html>
  );
}
