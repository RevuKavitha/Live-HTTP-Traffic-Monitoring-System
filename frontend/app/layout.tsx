import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HTTP Server + Real-Time Traffic Dashboard",
  description: "Monitor HTTP request traffic with live metrics and charts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
