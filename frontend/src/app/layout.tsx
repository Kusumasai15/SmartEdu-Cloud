import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { AcademicDataProvider } from "@/context/AcademicDataContext";
import { AppShell } from "@/components/layout/AppShell";

const appFont = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "UniFlow — University Learning Management System",
  description: "Enterprise Academic Management, Curriculum, and Examination Suite for Higher Education.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={appFont.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');document.documentElement.classList.toggle('dark',t==='dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        <AuthProvider>
          <AcademicDataProvider>
            <AppShell>{children}</AppShell>
          </AcademicDataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
