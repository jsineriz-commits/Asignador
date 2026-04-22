import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { FilterProvider } from "@/contexts/FilterContext";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Monitor de Asignaciones Comerciales",
  description:
    "Plataforma interna de gestión y monitoreo de asignaciones comerciales en el sector agronegocios.",
  keywords: ["agronegocios", "asignaciones comerciales", "CRM", "monitor"],
};

export default function AsignacionesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FilterProvider>
      <div className={`${inter.variable} font-sans flex h-screen overflow-hidden`}>
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </FilterProvider>
  );
}
