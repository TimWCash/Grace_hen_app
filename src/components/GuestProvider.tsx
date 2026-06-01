"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getCurrentGuest } from "@/lib/guest";
import type { Guest } from "@/lib/supabase";

type GuestContextValue = {
  guest: Guest | null;
  isAdmin: boolean;
  refresh: () => Promise<Guest | null>;
  setGuest: (g: Guest | null) => void;
};

const GuestContext = createContext<GuestContextValue | null>(null);

export function GuestProvider({
  initialGuest,
  children,
}: {
  initialGuest: Guest | null;
  children: ReactNode;
}) {
  const [guest, setGuest] = useState<Guest | null>(initialGuest);

  useEffect(() => {
    setGuest(initialGuest);
  }, [initialGuest]);

  const refresh = useCallback(async () => {
    const next = await getCurrentGuest();
    setGuest(next);
    return next;
  }, []);

  const value = useMemo<GuestContextValue>(
    () => ({
      guest,
      isAdmin: !!guest?.is_admin,
      refresh,
      setGuest,
    }),
    [guest, refresh],
  );

  return <GuestContext.Provider value={value}>{children}</GuestContext.Provider>;
}

export function useGuest(): GuestContextValue {
  const ctx = useContext(GuestContext);
  if (!ctx) throw new Error("useGuest must be used within GuestProvider");
  return ctx;
}
