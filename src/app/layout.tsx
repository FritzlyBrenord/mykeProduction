import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mykeindustrie.com"),
  title: "Myke Industrie - Excellence Industrielle",
  description:
    "Formations professionnelles, articles experts, produits chimiques certifiés et vidéos exclusives pour les industriels.",
  keywords:
    "formation industrielle, produits chimiques, industrie, formation technique",
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/myke.ico",
  },
  openGraph: {
    title: "Myke Industrie - Excellence Industrielle",
    description:
      "Formations professionnelles et ressources pour les industriels.",
    url: "https://mykeindustrie.com",
    siteName: "Myke Industrie",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark" style={{ colorScheme: "dark" }}>
      <body
        className={`${playfair.variable} ${jakarta.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
