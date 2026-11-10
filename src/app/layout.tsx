import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Sora } from "next/font/google";
import { siteUrl } from "@/lib/env";
import { SITE } from "@/lib/site";
import "./globals.css";

const sora = Sora({ weight: ["400", "600", "700", "800"], subsets: ["latin"], variable: "--font-sora" });
const inter = Inter({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ weight: ["400", "500"], subsets: ["latin"], variable: "--font-mono" });

const description = "Paga 1 € y ponte el primero del ranking con tu foto, tu nombre y tu enlace. Hasta que otro pague.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: SITE.name,
  description,
  alternates: { canonical: "/" },
  openGraph: {
    title: "¿Quieres ser el más guay del mundo?",
    description,
    url: "/",
    siteName: SITE.name,
    locale: "es_ES",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "¿Quieres ser el más guay del mundo?", description },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${sora.variable} ${inter.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
