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
  title: "Myke Industrie - Excellence Industrielle",
  description:
    "Formations professionnelles, articles experts, produits chimiques certifiés et vidéos exclusives pour les industriels d'élite.",
  keywords:
    "formation industrielle, produits chimiques, articles techniques, vidéos industrie",
  openGraph: {
    title: "Myke Industrie",
    description: "Excellence Industrielle",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body
        className={`${playfair.variable} ${jakarta.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
