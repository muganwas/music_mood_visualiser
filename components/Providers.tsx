"use client";

import { type ReactNode } from "react";
import { CredentialsProvider } from "@/stores/CredentialsContext";
import { PlaylistProvider } from "@/stores/PlaylistContext";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <CredentialsProvider>
      <PlaylistProvider>
        {children}
      </PlaylistProvider>
    </CredentialsProvider>
  );
}
