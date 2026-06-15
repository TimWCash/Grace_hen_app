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
import { HEN_DATE } from "@/lib/dates";

export type NightModeSetting = "auto" | "on" | "off";

const STORAGE_KEY = "night-mode";

type NightModeContextValue = {
  setting: NightModeSetting;
  active: boolean;
  setSetting: (s: NightModeSetting) => void;
};

const NightModeContext = createContext<NightModeContextValue | null>(null);

/** Auto window: event day 16:00 → +12h. Bars are dark; screens shouldn't blind. */
function autoActive(now: Date): boolean {
  const start = new Date(HEN_DATE);
  start.setHours(16, 0, 0, 0);
  const end = new Date(start.getTime() + 12 * 60 * 60 * 1000);
  return now >= start && now <= end;
}

export function NightModeProvider({ children }: { children: ReactNode }) {
  const [setting, setSettingState] = useState<NightModeSetting>("auto");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "on" || stored === "off" || stored === "auto") {
      setSettingState(stored);
    }
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const active = setting === "on" || (setting === "auto" && autoActive(now));

  useEffect(() => {
    const el = document.documentElement;
    if (active) el.setAttribute("data-night", "");
    else el.removeAttribute("data-night");
  }, [active]);

  const setSetting = useCallback((s: NightModeSetting) => {
    setSettingState(s);
    window.localStorage.setItem(STORAGE_KEY, s);
  }, []);

  const value = useMemo(
    () => ({ setting, active, setSetting }),
    [setting, active, setSetting],
  );

  return (
    <NightModeContext.Provider value={value}>
      {children}
    </NightModeContext.Provider>
  );
}

export function useNightMode(): NightModeContextValue {
  const ctx = useContext(NightModeContext);
  if (!ctx) throw new Error("useNightMode must be used within NightModeProvider");
  return ctx;
}
