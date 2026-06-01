import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
  );
}

let _client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (typeof window === "undefined") {
    return createClient(url!, anonKey!, {
      auth: { persistSession: false },
    });
  }
  if (!_client) {
    _client = createClient(url!, anonKey!, {
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
