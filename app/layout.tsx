import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "AI Music Moodboard",
  description: "Visualise your playlist's mood with AI-powered color palettes, textures, and typography.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-radiant min-h-screen antialiased">
        <Providers>
          <NavBar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
