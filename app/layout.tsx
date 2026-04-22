import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Asignador — Hub Comercial DCAC",
  description: "Plataforma unificada de gestión comercial: Asignaciones y Gestión de Sociedades.",
  keywords: ["agronegocios", "asignaciones", "CRM", "gestión de sociedades", "DCAC"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
