"use client";

import { supabase, type Guest } from "./supabase";

const NAME_KEY = "grace-hen-display-name";

export async function getCurrentGuest(): Promise<Guest | null> {
  const sb = supabase();
  const { data: session } = await sb.auth.getSession();
  if (!session.session) return null;
  const { data, error } = await sb
    .from("guests")
    .select("*")
    .eq("id", session.session.user.id)
    .maybeSingle();
  if (error) {
    console.error("getCurrentGuest", error);
    return null;
  }
  return data;
}

export async function enterEvent(
  passcode: string,
  displayName: string,
): Promise<{ ok: true; guest: Guest } | { ok: false; reason: string }> {
  const sb = supabase();
  const code = passcode.trim().toLowerCase();
  const name = displayName.trim();

  if (!code) return { ok: false, reason: "Passcode required" };
  if (name.length < 1 || name.length > 40)
    return { ok: false, reason: "Name must be 1–40 characters" };

  const { data: ok, error: vErr } = await sb.rpc("verify_passcode", { p: code });
  if (vErr || !ok) return { ok: false, reason: "Wrong passcode" };

  let { data: session } = await sb.auth.getSession();
  if (!session.session) {
    const { error } = await sb.auth.signInAnonymously();
    if (error) return { ok: false, reason: error.message };
    session = (await sb.auth.getSession()).data;
  }
  const uid = session.session?.user.id;
  if (!uid) return { ok: false, reason: "Could not start session" };

  const { data: guest, error: gErr } = await sb
    .from("guests")
    .upsert({ id: uid, display_name: name }, { onConflict: "id" })
    .select()
    .single();
  if (gErr) return { ok: false, reason: gErr.message };

  if (typeof window !== "undefined")
    window.localStorage.setItem(NAME_KEY, name);

  return { ok: true, guest };
}

export async function signOutGuest() {
  const sb = supabase();
  await sb.auth.signOut();
  if (typeof window !== "undefined")
    window.localStorage.removeItem(NAME_KEY);
}

export function rememberedName(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(NAME_KEY) ?? "";
}

export async function tryUnlockAdmin(pin: string): Promise<boolean> {
  const sb = supabase();
  const { data, error } = await sb.rpc("set_admin", { pin: pin.trim() });
  if (error) {
    console.error("set_admin", error);
    return false;
  }
  return !!data;
}
