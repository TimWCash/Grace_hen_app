import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Read env lazily (inside the function), NOT at module load. Reading at the
// top level meant merely importing this file during Next's build/prerender
// would throw if the keys weren't present — which killed the Vercel build.
// The keys are only actually needed when supabase() is called at runtime.
function readEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Set them in Vercel → Project Settings → Environment Variables " +
        "(and in .env.local for local dev).",
    );
  }
  return { url, anonKey };
}

let _client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  const { url, anonKey } = readEnv();
  if (typeof window === "undefined") {
    return createClient(url, anonKey, { auth: { persistSession: false } });
  }
  if (!_client) {
    _client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        storageKey: "grace-hen-auth",
        autoRefreshToken: true,
      },
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return _client;
}

export type Guest = {
  id: string;
  display_name: string;
  is_admin: boolean;
  is_bride: boolean;
  joined_at: string;
};
