"use client";

import { useEffect, useState } from "react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> };

const DISMISS_KEY = "install-dismissed";

/**
 * "Add to Home Screen" nudge. On Android/Chrome it uses the native
 * beforeinstallprompt. On iOS Safari (no programmatic install) it shows the
 * manual Share → Add to Home Screen instruction. Hidden once installed or
 * dismissed. Also registers the service worker.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    // Register the SW (installability + future push).
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return; // already installed
    if (localStorage.getItem(DISMISS_KEY)) return;

    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua);
    const isSafari = isIos && /safari/i.test(ua) && !/crios|fxios/i.test(ua);
    setIos(isIos);

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // iOS gives no event — show the manual instruction (Safari only).
    if (isIos && isSafari) setShow(true);

    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    dismiss();
  };

  return (
    <div
      className="fixed left-0 right-0 z-[60] px-4"
      style={{ bottom: "64px" }} // sits above the nav
    >
      <div
        className="mx-auto max-w-[640px] border px-4 py-3 flex items-center gap-3"
        style={{ background: "var(--color-navy)", borderColor: "var(--color-rule-gold)" }}
      >
        <div className="flex-1 min-w-0">
          <p className="label text-[9px]" style={{ color: "var(--color-gold-soft)" }}>
            Add to Home Screen
          </p>
          <p
            className="font-display italic mt-0.5"
            style={{ color: "var(--color-paper)", fontSize: "13px", lineHeight: 1.3 }}
          >
            {ios
              ? "Tap Share, then “Add to Home Screen” — it runs like a real app."
              : "Install it so it opens like an app, full-screen."}
          </p>
        </div>
        {!ios && deferred && (
          <button
            type="button"
            onClick={install}
            className="label text-[9px] px-3 py-2 shrink-0"
            style={{
              background: "var(--color-gold)",
              color: "var(--color-navy)",
              minHeight: "40px",
            }}
          >
            Install
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="label text-[9px] px-2 py-2 shrink-0"
          style={{ color: "var(--color-gold-soft)" }}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
