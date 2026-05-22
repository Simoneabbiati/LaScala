import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppSidebar from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppToaster from "@/components/AppToaster";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Quinta",
  description: "Gestionale ODG per Direttori di Scena",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={geist.variable}>
      <body>
        <TooltipProvider>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <main className="p-8 max-w-6xl mx-auto w-full">{children}</main>
            </SidebarInset>
          </SidebarProvider>
        </TooltipProvider>
        <AppToaster />
      </body>
    </html>
  );
}
