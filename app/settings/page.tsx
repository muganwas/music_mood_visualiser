"use client";

import Link from "next/link";
import ProfilePanel from "@/components/profile/ProfilePanel";

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/"
          className="rounded-full border border-white/10 px-4 py-2 text-sm text-gray-400 hover:bg-white/5 hover:text-white transition"
        >
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>
      <ProfilePanel />
    </main>
  );
}
