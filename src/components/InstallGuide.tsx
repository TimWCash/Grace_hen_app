"use client";

import { useEffect, useState } from "react";

type BIPEvent = Event & { prompt: () => Promise<void> };

// Snooze for the current browser session only — so the nudge reappears on
// every fresh app open and STOPS only once the app is actually installed.
const SNOOZE_KEY = "install-snoozed";
// Tells MemoryPrompt the install flow is done, so the two popups never stack.
const DONE_EVENT = "install-flow-done";

type Platform =
  | "installed"
  | "ios-inapp" // opened inside WhatsApp/Insta/etc. — must open in Safari first
  | "ios-safari"
  | "android-chrome"
  | "android-other"
  | "desktop";

function detect(): { platform: Platform; inAppName: string | null } {
  if (typeof window === "undefined") return { platform: "desktop", inAppName: null };
  const ua = navigator.userAgent || "";
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  if (standalone) return { platform: "installed", inAppName: null };

  const isIOS = /iphone|ipad|ipod/i.test(ua) || (/Mac/i.test(ua) && "ontouchend" in document);
  const isAndroid = /android/i.test(ua);

  const inAppMatch = ua.match(/(FBAN|FBAV|Instagram|WhatsApp|Line|Snapchat|Messenger|Pinterest|Twitter|TikTok)/i);
  const inAppName = inAppMatch
    ? inAppMatch[1].replace(/FBAN|FBAV/i, "Facebook")
    : null;

  if (isIOS) {
    // iOS Chrome (CriOS) and in-app browsers can't "Add to Home Screen" — only Safari can.
    if (inAppName || /CriOS|FxiOS|EdgiOS/i.test(ua)) return { platform: "ios-inapp", inAppName };
    return { platform: "ios-safari", inAppName: null };
  }
  if (isAndroid) {
    if (inAppName) return { platform: "ios-inapp", inAppName }; // same "open in browser" advice
    return { platform: /Chrome/i.test(ua) ? "android-chrome" : "android-other", inAppName: null };
  }
  return { platform: "desktop", inAppName: null };
}

/** iOS Share glyph (square with up arrow). */
function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden style={{ display: "inline-block", verticalAlign: "-4px" }}>
      <path d="M12 3v12M12 3l-4 4M12 3l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden style={{ display: "inline-block", verticalAlign: "-4px" }}>
      <circle cx="5" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="19" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function InstallGuide() {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<{ platform: Platform; inAppName: string | null }>({
    platform: "desktop",
    inAppName: null,
  });
  const [bip, setBip] = useState<BIPEvent | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

    const d = detect();
    setInfo(d);

    const onBIP = (e: Event) => {
      e.preventDefault();
      setBip(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // Keep nudging until the app is genuinely installed. Show once per
    // browser session when not installed; once installed, never again.
    if (d.platform !== "installed" && !sessionStorage.getItem(SNOOZE_KEY)) {
      setOpen(true);
    } else {
      // Nothing to show → let the memory prompt take its turn.
      window.dispatchEvent(new Event(DONE_EVENT));
    }

    const onOpen = () => setOpen(true);
    window.addEventListener("open-install-guide", onOpen);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("open-install-guide", onOpen);
    };
  }, []);

  if (!open) return null;

  const close = () => {
    try {
      sessionStorage.setItem(SNOOZE_KEY, "1");
    } catch {}
    window.dispatchEvent(new Event(DONE_EVENT));
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-[90] overflow-y-auto"
      style={{ background: "rgba(0,20,40,0.96)" }}
      role="dialog"
      aria-modal="true"
    >
      <div className="min-h-full flex items-center justify-center px-5 py-12">
        <div
          className="w-full max-w-[420px] border p-7"
          style={{ background: "var(--color-paper)", borderColor: "var(--color-rule-gold)" }}
        >
          <p className="label text-[10px]" style={{ color: "var(--color-gold)" }}>
            One quick thing
          </p>
          <h2
            className="font-display mt-2"
            style={{ color: "var(--color-navy)", fontSize: "30px", letterSpacing: "-0.02em", lineHeight: 1.05 }}
          >
            Add Grace&apos;s Hen to your phone
          </h2>
          <p
            className="font-display italic mt-3"
            style={{ color: "var(--color-navy)", opacity: 0.7, fontSize: "14px", lineHeight: 1.5 }}
          >
            So it opens like a real app and you get the &ldquo;time to move&rdquo; alerts. Takes 10 seconds.
          </p>

          <div className="rule-gold w-12 my-5" />

          <Steps platform={info.platform} inAppName={info.inAppName} bip={bip} onInstalled={close} />

          <div className="mt-7 flex gap-2">
            <button
              type="button"
              onClick={close}
              className="flex-1 border py-3 label text-[9px]"
              style={{ borderColor: "var(--color-rule)", color: "var(--color-navy)", minHeight: "44px" }}
            >
              Not now
            </button>
            <button
              type="button"
              onClick={close}
              className="flex-1 py-3 label text-[9px]"
              style={{ background: "var(--color-navy)", color: "var(--color-paper)", border: "0.5px solid var(--color-navy)", minHeight: "44px" }}
            >
              Done ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 items-start">
      <span
        className="font-display italic shrink-0"
        style={{ color: "var(--color-gold)", fontSize: "15px", width: "20px" }}
      >
        {n}
      </span>
      <span
        className="font-display"
        style={{ color: "var(--color-navy)", fontSize: "16px", lineHeight: 1.45 }}
      >
        {children}
      </span>
    </li>
  );
}

function Steps({
  platform,
  inAppName,
  bip,
  onInstalled,
}: {
  platform: Platform;
  inAppName: string | null;
  bip: BIPEvent | null;
  onInstalled: () => void;
}) {
  if (platform === "installed") {
    return (
      <p className="font-display" style={{ color: "var(--color-navy)", fontSize: "16px" }}>
        You&apos;re all set — it&apos;s already on your home screen. ✓
      </p>
    );
  }

  if (platform === "ios-inapp") {
    return (
      <>
        <div
          className="border p-3 mb-4"
          style={{ borderColor: "var(--color-destructive)", background: "rgba(122,31,35,0.06)" }}
        >
          <p className="font-display" style={{ color: "var(--color-navy)", fontSize: "15px", lineHeight: 1.45 }}>
            You&apos;ve opened this inside{" "}
            <strong>{inAppName ?? "another app"}</strong>. It won&apos;t let you install
            here — you need to open it in your normal browser first.
          </p>
        </div>
        <ol className="space-y-3">
          <Step n={1}>
            Tap the <DotsIcon /> menu (top or bottom corner of this screen).
          </Step>
          <Step n={2}>
            Choose <strong>&ldquo;Open in Safari&rdquo;</strong> (or Chrome).
          </Step>
          <Step n={3}>Then follow the Add-to-Home-Screen steps there.</Step>
        </ol>
      </>
    );
  }

  if (platform === "ios-safari") {
    return (
      <ol className="space-y-3">
        <Step n={1}>
          Tap the <ShareIcon /> <strong>Share</strong> button at the bottom of Safari.
        </Step>
        <Step n={2}>
          Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
        </Step>
        <Step n={3}>
          Tap <strong>&ldquo;Add&rdquo;</strong> (top-right). Done — find the gold G&amp;M icon on your home screen.
        </Step>
      </ol>
    );
  }

  if (platform === "android-chrome") {
    return (
      <>
        {bip && (
          <button
            type="button"
            onClick={async () => {
              await bip.prompt();
              onInstalled();
            }}
            className="w-full py-4 label text-[10px] mb-4"
            style={{ background: "var(--color-gold)", color: "var(--color-navy)", minHeight: "48px" }}
          >
            Tap to install
          </button>
        )}
        <ol className="space-y-3">
          <Step n={1}>
            Tap the <DotsIcon /> menu (top-right of Chrome).
          </Step>
          <Step n={2}>
            Tap <strong>&ldquo;Add to Home screen&rdquo;</strong> (or &ldquo;Install app&rdquo;).
          </Step>
          <Step n={3}>
            Tap <strong>&ldquo;Add&rdquo;</strong>. Done — look for the gold G&amp;M icon.
          </Step>
        </ol>
      </>
    );
  }

  if (platform === "android-other") {
    return (
      <ol className="space-y-3">
        <Step n={1}>
          Open the browser <DotsIcon /> menu.
        </Step>
        <Step n={2}>
          Tap <strong>&ldquo;Add to Home screen&rdquo;</strong>.
        </Step>
        <Step n={3}>Confirm — and it&apos;s on your home screen.</Step>
      </ol>
    );
  }

  // desktop
  return (
    <p className="font-display" style={{ color: "var(--color-navy)", fontSize: "16px", lineHeight: 1.5 }}>
      Open this link on your <strong>phone</strong> to add it to your home screen — that&apos;s
      where you&apos;ll want it for the night.
    </p>
  );
}
