import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Music Moodboard",
  description: "Visualise your playlist's mood with AI-powered color palettes, textures, and typography.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-radiant min-h-screen antialiased">{children}</body>
    </html>
  );
}
