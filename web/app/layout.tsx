import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HvA DataLab AI-Artist",
  description: "AI-fotostudio voor beeldtransformatie · DataLab Hogeschool van Amsterdam",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl">
      <body className={ibmPlexMono.className}>{children}</body>
    </html>
  );
}
