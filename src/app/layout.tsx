import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Closify CRM | by @aceone solutions",
  description: "Enterprise SaaS CRM for WhatsApp Hotline & Omnichannel Ingestion by @aceone solutions with strict multi-tenant isolation.",
  icons: {
    icon: [
      { url: "/closify-brand.png" },
      { url: "/favicon-32x32.png", sizes: "32x32" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/closify-brand.png",
    apple: "/closify-brand.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-white text-slate-900 antialiased" suppressHydrationWarning>
      <body
        className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
