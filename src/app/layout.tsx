import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BakeryOS | ERP para Panaderías y Pastelerías",
  description:
    "Sistema integral de gestión empresarial (ERP) para panaderías y pastelerías. Controla inventario, producción, clientes, pedidos y facturación desde una única plataforma en la nube.",
  keywords: [
    "ERP",
    "panadería",
    "pastelería",
    "gestión",
    "inventario",
    "producción",
    "facturación",
    "software",
  ],
  authors: [{ name: "Noah Catalán" }],
  openGraph: {
    title: "BakeryOS | ERP para Panaderías",
    description:
      "Gestión integral de panaderías y pastelerías. Inventario, producción, clientes y facturación en tiempo real.",
    type: "website",
    locale: "es_ES",
  },
  robots: "index, follow",
};

import ClientLayout from "@/components/layout/ClientLayout";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import AuthGuard from "@/components/auth/AuthGuard";
import { ThemeProvider } from "@/components/providers/theme-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-300`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <ToastProvider>
              <AuthGuard>
                <ClientLayout>
                  {children}
                </ClientLayout>
              </AuthGuard>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
