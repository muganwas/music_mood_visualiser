"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCredentials } from "@/stores/CredentialsContext";

import { GearIcon } from "@/components/icons";

export default function NavBar() {
  const { isComplete } = useCredentials();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <nav className="fixed right-0 top-0 z-50 p-4">
      <Link
        href="/settings"
        className="relative inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-400 hover:bg-white/10 hover:text-white transition"
        title="Settings"
      >
        <GearIcon className="h-4 w-4" />
        {mounted && isComplete && (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-[#0a0a0f]" />
        )}
      </Link>
    </nav>
  );
}
