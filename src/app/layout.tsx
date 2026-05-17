import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "ODG — Ordine del Giorno",
  description: "Gestione Ordine del Giorno per Direttori di Scena",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${geist.variable} h-full antialiased`}>
      <body className="bg-gray-50 text-gray-900 min-h-full">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 ml-56 p-8 max-w-7xl">{children}</main>
        </div>
      </body>
    </html>
  );
}
