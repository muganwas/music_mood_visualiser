"use client";

import { useState } from "react";
import { useCredentials } from "@/stores/CredentialsContext";
import {
  type CredentialKey,
  CREDENTIAL_LABELS,
  CREDENTIAL_HELP,
} from "@/stores/credentials";

const CREDENTIAL_KEYS = Object.keys(CREDENTIAL_LABELS) as CredentialKey[];

export default function ProfilePanel() {
  const { credentials, updateField, clearCredentials, isComplete } = useCredentials();
  const [showSecrets, setShowSecrets] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* ── Privacy notice ── */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-5">
        <p className="text-sm font-semibold text-amber-400">🔒 Your keys stay on your device</p>
        <p className="mt-2 text-xs leading-relaxed text-gray-400">
          All credentials are stored in your browser&apos;s local storage and are never sent to our
          servers. They&apos;re only transmitted directly to Spotify and DeepSeek APIs for your
          requests. No tracking, no analytics, no third parties. We recommend reviewing the{' '}
          <a
            href="https://github.com/muganwas/music_mood_visualiser"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-500 underline"
          >
            source code
          </a>{' '}
          to verify this yourself.
        </p>
      </div>

      {/* ── Credentials form ── */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">API Credentials</h2>
        <div className="space-y-4">
          {CREDENTIAL_KEYS.map((key) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-medium text-gray-400">
                {CREDENTIAL_LABELS[key]}
              </label>
              <input
                type={showSecrets ? "text" : "password"}
                value={credentials[key]}
                onChange={(e) => updateField(key, e.target.value)}
                placeholder={CREDENTIAL_HELP[key]}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={showSecrets}
              onChange={() => setShowSecrets(!showSecrets)}
              className="accent-brand-500"
            />
            Show secrets
          </label>

          <button
            onClick={handleSave}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition"
          >
            {saved ? "✓ Saved" : "Save"}
          </button>

          <button
            onClick={clearCredentials}
            className="rounded-lg bg-white/5 px-4 py-2 text-sm text-gray-400 hover:bg-white/10 hover:text-red-400 transition"
          >
            Clear all
          </button>
        </div>

        {isComplete && (
          <p className="mt-2 text-xs text-green-500">✓ All required credentials set</p>
        )}
      </div>
    </div>
  );
}
