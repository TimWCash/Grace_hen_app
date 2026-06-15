"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PageFrame } from "@/components/PageFrame";
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerLabel,
  MarkerPopup,
  MapControls,
  MapRoute,
} from "@/components/ui/map";
import { supabase } from "@/lib/supabase";
import { getCurrentGuest } from "@/lib/guest";
import { STOP_COORDS } from "@/lib/geo";

type Stop = {
  id: string;
  position: number;
  time_label: string;
  title: string;
  venue: string | null;
  drink: string | null;
  status: "planned" | "here" | "done" | "skipped";
};

type Guest = {
  id: string;
  display_name: string;
  is_bride: boolean;
  is_admin: boolean;
};

type Location = {
  guest_id: string;
  lat: number;
  lng: number;
  updated_at: string;
};

const DUBLIN_CENTER: [number, number] = [-6.2625, 53.3435];

export default function MapPage() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [locations, setLocations] = useState<Record<string, Location>>({});
  const [me, setMe] = useState<Guest | null>(null);
  const [sharing, setSharing] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  // Initial load + realtime
  useEffect(() => {
    const sb = supabase();
    let cancelled = false;

    const load = async () => {
      const guest = await getCurrentGuest();
      if (cancelled) return;
      setMe(guest);

      const [stopsRes, guestsRes, locsRes] = await Promise.all([
        sb.from("stops").select("*").order("position", { ascending: true }),
        sb.from("guests").select("id, display_name, is_bride, is_admin"),
        sb
          .from("locations")
          .select("*")
          .gt("expires_at", new Date().toISOString()),
      ]);
      if (cancelled) return;
      if (stopsRes.data) setStops(stopsRes.data as Stop[]);
      if (guestsRes.data) setGuests(guestsRes.data as Guest[]);
      if (locsRes.data) {
        setLocations(
          Object.fromEntries(
            (locsRes.data as Location[]).map((l) => [l.guest_id, l]),
          ),
        );
      }
    };
    load();

    const channel = sb
      .channel("map-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "locations" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const old = payload.old as { guest_id: string };
            setLocations((prev) => {
              const next = { ...prev };
              delete next[old.guest_id];
              return next;
            });
          } else {
            const row = payload.new as Location;
            setLocations((prev) => ({ ...prev, [row.guest_id]: row }));
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guests" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stops" },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, []);

  // Location sharing
  useEffect(() => {
    if (!sharing || !me) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!("geolocation" in navigator)) {
      setSharing(false);
      return;
    }

    const sb = supabase();
    let lastWrite = 0;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        // Throttle writes to once every 20s
        if (now - lastWrite < 20_000) return;
        lastWrite = now;
        sb.from("locations")
          .upsert({
            guest_id: me.id,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy_m: pos.coords.accuracy ?? null,
            updated_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 8 * 3600_000).toISOString(),
          })
          .then(({ error }) => {
            if (error) console.error("location upsert", error);
          });
      },
      (err) => {
        console.error("watch position", err);
        setSharing(false);
      },
      { enableHighAccuracy: true, maximumAge: 10_000 },
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [sharing, me]);

  const stopCoords = useMemo(
    () =>
      stops
        .map((s) => {
          const key = s.venue ?? "";
          const c = STOP_COORDS[key];
          return c ? { stop: s, lng: c.lng, lat: c.lat } : null;
        })
        .filter(
          (
            x,
          ): x is { stop: Stop; lng: number; lat: number } => x !== null,
        ),
    [stops],
  );

  const routeCoords = useMemo<[number, number][]>(
    () => stopCoords.map((s) => [s.lng, s.lat]),
    [stopCoords],
  );

  const guestById = useMemo(
    () => Object.fromEntries(guests.map((g) => [g.id, g])),
    [guests],
  );

  const liveLocations = Object.values(locations).filter(
    (l) => guestById[l.guest_id],
  );

  const sharingCount = liveLocations.length;

  return (
    <PageFrame
      sectionMark="II"
      eyebrow="Live · Opt-in"
      title="The Map"
      subtitle="Who's here, who's en route, where we're going next."
    >
      <div
        className="relative parchment-map border"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <div className="h-[440px] w-full">
          <Map
            center={DUBLIN_CENTER}
            zoom={14.2}
            maxZoom={18}
            minZoom={11}
            interactive
          >
            <MapControls position="bottom-right" showZoom showLocate />

            <MapRoute
              coordinates={routeCoords}
              color="#b89b5e"
              width={3}
              opacity={0.85}
              dashArray={[1.5, 1.5]}
            />

            {stopCoords.map(({ stop, lng, lat }, i) => (
              <MapMarker
                key={stop.id}
                longitude={lng}
                latitude={lat}
                anchor="bottom"
              >
                <MarkerContent>
                  <StopPin
                    index={i + 1}
                    active={stop.status === "here"}
                    done={stop.status === "done"}
                  />
                  <MarkerLabel position="top" className="text-[10px]">
                    <span
                      className="font-display italic px-1.5 py-0.5 rounded-full"
                      style={{
                        background: "rgba(251, 248, 239, 0.92)",
                        color: "var(--color-navy)",
                        border: "1px solid var(--color-rule)",
                      }}
                    >
                      {stop.venue?.split(" · ")[0]}
                    </span>
                  </MarkerLabel>
                </MarkerContent>
                <MarkerPopup>
                  <div className="min-w-44">
                    <div
                      className="text-[10px] uppercase tracking-[0.3em]"
                      style={{ color: "var(--color-gold)" }}
                    >
                      {stop.time_label}
                    </div>
                    <div
                      className="font-display text-lg leading-tight"
                      style={{ color: "var(--color-navy)" }}
                    >
                      {stop.title}
                    </div>
                    {stop.venue && (
                      <div
                        className="font-display italic text-sm mt-0.5"
                        style={{ color: "var(--color-navy)", opacity: 0.85 }}
                      >
                        {stop.venue}
                      </div>
                    )}
                    {stop.drink && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span style={{ color: "var(--color-oxblood)" }}>●</span>
                        <span
                          className="text-xs"
                          style={{ color: "var(--color-navy)" }}
                        >
                          {stop.drink}
                        </span>
                      </div>
                    )}
                  </div>
                </MarkerPopup>
              </MapMarker>
            ))}

            {liveLocations.map((loc) => {
              const g = guestById[loc.guest_id];
              if (!g) return null;
              const initial = g.display_name.charAt(0).toUpperCase() || "?";
              const isMe = me?.id === g.id;
              return (
                <MapMarker
                  key={`g-${g.id}`}
                  longitude={loc.lng}
                  latitude={loc.lat}
                  anchor="center"
                >
                  <MarkerContent>
                    <HenPin
                      initial={initial}
                      bride={g.is_bride}
                      me={isMe}
                    />
                  </MarkerContent>
                  <MarkerPopup>
                    <div>
                      <div
                        className="font-display"
                        style={{ color: "var(--color-navy)" }}
                      >
                        {g.display_name}
                        {g.is_bride && (
                          <span
                            className="ml-1 text-[10px] uppercase tracking-[0.2em]"
                            style={{ color: "var(--color-gold)" }}
                          >
                            · Bride
                          </span>
                        )}
                      </div>
                      <div
                        className="text-[10px] font-display italic mt-1"
                        style={{ color: "var(--color-navy)", opacity: 0.6 }}
                      >
                        seen {timeAgo(loc.updated_at)}
                      </div>
                    </div>
                  </MarkerPopup>
                </MapMarker>
              );
            })}
          </Map>
        </div>

        <div
          className="px-4 py-3 border-t flex items-center justify-between"
          style={{
            borderColor: "var(--color-rule)",
            background: "var(--color-paper)",
          }}
        >
          <div>
            <div
              className="text-[9px] uppercase tracking-eyebrow font-medium"
              style={{ color: "var(--color-gold)" }}
            >
              On the crawl
            </div>
            <div
              className="font-display italic mt-0.5"
              style={{ color: "var(--color-ink)", fontSize: "15px" }}
            >
              {sharingCount} {sharingCount === 1 ? "hen" : "hens"} on the map
            </div>
          </div>
          <div
            className="text-[9px] uppercase tracking-eyebrow font-medium"
            style={{ color: "var(--color-ink)", opacity: 0.55 }}
          >
            {stopCoords.length} stops · {routeKm(routeCoords).toFixed(1)} km
          </div>
        </div>
      </div>

      <div
        className="mt-5 border px-5 py-4 flex items-center justify-between"
        style={{
          background: "var(--color-paper)",
          borderColor: "var(--color-rule)",
        }}
      >
        <div>
          <div
            className="text-[9px] uppercase tracking-eyebrow font-medium"
            style={{ color: "var(--color-ink)", opacity: 0.55 }}
          >
            Location · Opt-in
          </div>
          <div
            className="font-display mt-0.5"
            style={{ color: "var(--color-ink)", fontSize: "18px" }}
          >
            Share where you are
          </div>
          <div
            className="text-[10px] mt-1"
            style={{ color: "var(--color-ink)", opacity: 0.55 }}
          >
            Only the hens · expires after 8 hrs
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSharing((v) => !v)}
          className="relative w-12 h-7 transition-colors border"
          style={{
            background: sharing ? "var(--color-ink)" : "transparent",
            borderColor: "var(--color-rule)",
          }}
          aria-pressed={sharing}
          aria-label="Toggle location sharing"
        >
          <span
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 transition-all"
            style={{
              left: sharing ? "calc(100% - 16px)" : "4px",
              background: sharing ? "var(--color-gold)" : "var(--color-ink)",
              opacity: sharing ? 1 : 0.4,
            }}
          />
        </button>
      </div>

      <div className="mt-10">
        <p
          className="text-[9px] uppercase tracking-eyebrow font-medium text-center"
          style={{ color: "var(--color-ink)", opacity: 0.55 }}
        >
          The Hens
        </p>
        <div className="rule mt-3 mb-6" />
        {guests.length === 0 ? (
          <p
            className="text-center font-display italic"
            style={{ color: "var(--color-ink)", opacity: 0.55, fontSize: "15px" }}
          >
            No one's in yet — share the passcode.
          </p>
        ) : (
          <ul className="space-y-0">
            {guests.map((g, i) => {
              const here = !!locations[g.id];
              return (
                <li
                  key={g.id}
                  className={`py-3 flex items-baseline justify-between ${i === 0 ? "" : "border-t"}`}
                  style={{ borderColor: "var(--color-rule)" }}
                >
                  <div className="flex items-baseline gap-3">
                    <span
                      className="font-display italic tabular-nums"
                      style={{
                        color: "var(--color-gold)",
                        fontSize: "12px",
                        width: "24px",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className="font-display"
                      style={{
                        color: "var(--color-ink)",
                        fontSize: "20px",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {g.display_name}
                    </span>
                    {g.is_bride && (
                      <span
                        className="text-[9px] uppercase tracking-eyebrow font-medium"
                        style={{ color: "var(--color-gold)" }}
                      >
                        Bride
                      </span>
                    )}
                  </div>
                  <span
                    className="text-[9px] uppercase tracking-eyebrow font-medium"
                    style={{
                      color: here ? "var(--color-ink)" : "var(--color-ink)",
                      opacity: here ? 0.85 : 0.4,
                    }}
                  >
                    {here ? "On map" : "Offline"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

    </PageFrame>
  );
}

function StopPin({
  index,
  active,
  done,
}: {
  index: number;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="relative" style={{ transform: "translateY(-4px)" }}>
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center font-display text-base border-2 shadow-lg"
        style={{
          background: active
            ? "var(--color-gold)"
            : done
            ? "rgba(245, 239, 224, 0.95)"
            : "var(--color-navy)",
          color: active || done ? "var(--color-navy)" : "var(--color-cream)",
          borderColor: active ? "var(--color-navy)" : "var(--color-gold)",
          opacity: done ? 0.7 : 1,
        }}
      >
        {index}
      </div>
      <div
        className="w-2 h-2 rotate-45 mx-auto -mt-1"
        style={{
          background: active ? "var(--color-gold)" : "var(--color-navy)",
          opacity: done ? 0.5 : 1,
        }}
      />
    </div>
  );
}

function HenPin({
  initial,
  bride,
  me,
}: {
  initial: string;
  bride: boolean;
  me: boolean;
}) {
  return (
    <div className="relative">
      {(me || bride) && (
        <div
          className="absolute inset-0 rounded-full shimmer"
          style={{
            background: "rgba(184, 155, 94, 0.5)",
            transform: "scale(1.6)",
          }}
        />
      )}
      <div
        className="relative w-8 h-8 rounded-full flex items-center justify-center font-display text-sm border-2 shadow-md"
        style={{
          background: bride ? "var(--color-oxblood)" : "var(--color-navy)",
          color: "var(--color-cream)",
          borderColor: bride ? "var(--color-gold)" : "var(--color-cream)",
        }}
      >
        {initial}
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function routeKm(coords: [number, number][]): number {
  if (coords.length < 2) return 0;
  let km = 0;
  for (let i = 1; i < coords.length; i++) {
    km += haversineKm(coords[i - 1], coords[i]);
  }
  return km;
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
