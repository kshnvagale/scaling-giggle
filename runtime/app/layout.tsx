import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CaseForge — Training Simulation",
  description: "Desktop-OS style learning simulation for Forward Deployed Engineers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
