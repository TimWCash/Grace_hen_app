"use client";

/**
 * Best-effort attention alerts for live broadcasts (the 15-min warning,
 * GO, Mark's video). Plays a chime, vibrates (Android), and fires a
 * Notification if granted.
 *
 * Honest platform limits:
 * - iOS Safari has NO Vibration API — vibrate is a no-op on iPhone.
 * - Audio only plays if the AudioContext was unlocked by a prior tap, and
 *   only while the app is open/foreground. Hence the "Enable alerts" primer.
 * - Background alerts on iPhone need an installed PWA + web-push (not built).
 */

let audioCtx: AudioContext | null = null;
const ENABLED_KEY = "alerts-on";

export function alertsEnabled(): boolean {
  return typeof window !== "undefined" && localStorage.getItem(ENABLED_KEY) === "1";
}

/** Call from a user gesture (a button tap) to unlock audio + ask for notifications. */
export async function primeAlerts(): Promise<void> {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = audioCtx || new Ctx();
    if (audioCtx.state === "suspended") await audioCtx.resume();
    // Tiny silent blip to fully unlock on iOS.
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + 0.01);
  } catch {
    /* ignore */
  }
  try {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  } catch {
    /* ignore */
  }
  // Subscribe to web push so a closed/locked phone still gets the alerts.
  try {
    if ("serviceWorker" in navigator) {
      await navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const { ensurePushSubscription } = await import("@/lib/push");
    await ensurePushSubscription();
  } catch {
    /* ignore */
  }
  localStorage.setItem(ENABLED_KEY, "1");
}

export function notificationsGranted(): boolean {
  return typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted";
}

/** Fire a chime + vibration + notification for an incoming broadcast. */
export function fireAlert(title: string, body?: string): void {
  // Vibrate (Android; no-op on iOS).
  try {
    navigator.vibrate?.([180, 90, 180]);
  } catch {
    /* ignore */
  }

  // Two-tone chime via Web Audio (no asset needed).
  try {
    if (audioCtx && audioCtx.state === "running") {
      const t = audioCtx.currentTime;
      const g = audioCtx.createGain();
      g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      const a = audioCtx.createOscillator();
      a.type = "sine";
      a.frequency.setValueAtTime(880, t);
      a.connect(g);
      a.start(t);
      a.stop(t + 0.3);
      const b = audioCtx.createOscillator();
      b.type = "sine";
      b.frequency.setValueAtTime(1175, t + 0.18);
      b.connect(g);
      b.start(t + 0.18);
      b.stop(t + 0.6);
    }
  } catch {
    /* ignore */
  }

  // Notification (works foreground where granted; iOS needs installed PWA).
  try {
    if (notificationsGranted()) {
      new Notification(title, { body, icon: "/icon.svg", tag: "grace-hen" });
    }
  } catch {
    /* ignore */
  }
}
