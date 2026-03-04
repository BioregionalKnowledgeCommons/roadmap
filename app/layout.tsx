import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "BKC Roadmap",
  description: "Bioregional Knowledge Commons — Interactive Roadmap",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-white antialiased">
        {children}
        <Script
          src="https://45.132.245.30.sslip.io/commons/widget/roadmap-chat.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
