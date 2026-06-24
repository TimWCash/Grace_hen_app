"use client";

import { useEffect, useState } from "react";
import { PageFrame } from "@/components/PageFrame";
import { supabase } from "@/lib/supabase";
import { celebrate } from "@/lib/celebrate";
import { useGuest } from "@/components/GuestProvider";

type Course = "starter" | "main" | "dessert";
type Item = {
  id: string;
  course: Course;
  position: number;
  label: string;
  note: string | null;
  tag: string | null;
};

const COURSES: { key: Course; title: string; numeral: string }[] = [
  { key: "starter", title: "To Start", numeral: "I" },
  { key: "main", title: "The Main", numeral: "II" },
  { key: "dessert", title: "To Finish", numeral: "III" },
];

export default function LunchPage() {
  const { guest } = useGuest();
  const [items, setItems] = useState<Item[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [picks, setPicks] = useState<Record<Course, string>>({} as Record<Course, string>);
  const [saving, setSaving] = useState<Course | null>(null);

  useEffect(() => {
    const sb = supabase();
    let cancelled = false;
    (async () => {
      const { data, error } = await sb
        .from("lunch_menu")
        .select("*")
        .order("position");
      if (cancelled) return;
      if (error) {
        setUnavailable(true);
        return;
      }
      setItems(data as Item[]);
      if (guest) {
        const { data: orders } = await sb
          .from("lunch_orders")
          .select("course, item_id")
          .eq("guest_id", guest.id);
        if (!cancelled && orders) {
          setPicks(
            Object.fromEntries(
              orders.map((o) => [o.course, o.item_id]),
            ) as Record<Course, string>,
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [guest]);

  const choose = async (course: Course, itemId: string) => {
    if (!guest) return;
    setSaving(course);
    setPicks((p) => ({ ...p, [course]: itemId }));
    const sb = supabase();
    await sb
      .from("lunch_orders")
      .upsert(
        { guest_id: guest.id, course, item_id: itemId },
        { onConflict: "guest_id,course" },
      );
    celebrate();
    setSaving(null);
  };

  if (unavailable) {
    return (
      <PageFrame
        sectionMark="Lunch"
        eyebrow="House · 2:15pm"
        title="Lunch"
        subtitle="Pre-ordering opens once the menu's loaded."
      >
        <p
          className="font-display italic text-center py-8"
          style={{ color: "var(--color-navy)", opacity: 0.55, fontSize: "16px" }}
        >
          Not set up yet — run migration 006.
        </p>
      </PageFrame>
    );
  }

  const chosenCount = COURSES.filter((c) => picks[c.key]).length;

  return (
    <PageFrame
      sectionMark="Lunch"
      eyebrow="House · 2:15pm"
      title="Lunch, Pre-Ordered"
      subtitle="Pick a course each — Claire sends the order ahead so it's ready when we sit down."
    >
      <div
        className="mb-8 px-4 py-3 border text-center"
        style={{
          borderColor: chosenCount === 3 ? "var(--color-gold)" : "var(--color-rule)",
          background: chosenCount === 3 ? "rgba(197,160,89,0.1)" : "transparent",
        }}
      >
        <span className="label text-[9px]" style={{ color: "var(--color-navy)" }}>
          {chosenCount === 3
            ? "All three chosen — you're sorted ✓"
            : `${chosenCount} of 3 courses chosen`}
        </span>
      </div>

      {!items ? (
        <Skeleton />
      ) : (
        COURSES.map((course) => {
          const courseItems = items.filter((i) => i.course === course.key);
          return (
            <section key={course.key} className="mb-10">
              <div className="flex items-baseline gap-3">
                <span
                  className="font-display italic"
                  style={{ color: "var(--color-gold)", fontSize: "13px" }}
                >
                  {course.numeral}.
                </span>
                <h2
                  className="font-display"
                  style={{
                    color: "var(--color-navy)",
                    fontSize: "26px",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {course.title}
                </h2>
              </div>
              <div className="rule mt-3 mb-4" />
              <ul className="space-y-2">
                {courseItems.map((item) => {
                  const mine = picks[course.key] === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        disabled={saving === course.key}
                        onClick={() => choose(course.key, item.id)}
                        className="w-full text-left px-4 py-3.5 border"
                        style={{
                          borderColor: mine ? "var(--color-gold)" : "var(--color-rule)",
                          background: mine ? "rgba(197,160,89,0.1)" : "transparent",
                          minHeight: "48px",
                        }}
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <span
                            className="font-display"
                            style={{ color: "var(--color-navy)", fontSize: "17px" }}
                          >
                            {item.label}
                            {item.tag && (
                              <span
                                className="label text-[8px] ml-2"
                                style={{ color: "var(--color-gold)" }}
                              >
                                {item.tag}
                              </span>
                            )}
                          </span>
                          {mine && (
                            <span
                              className="label text-[8.5px] shrink-0"
                              style={{ color: "var(--color-gold)" }}
                            >
                              Yours ✓
                            </span>
                          )}
                        </div>
                        {item.note && (
                          <p
                            className="mt-1"
                            style={{
                              color: "var(--color-navy)",
                              opacity: 0.6,
                              fontSize: "12.5px",
                              lineHeight: 1.4,
                            }}
                          >
                            {item.note}
                          </p>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}

      <p
        className="font-display italic text-center mt-6"
        style={{ color: "var(--color-navy)", opacity: 0.55, fontSize: "13px" }}
      >
        Change your mind any time before the day — Claire sees the latest.
      </p>
    </PageFrame>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="border h-14 animate-pulse"
          style={{ borderColor: "var(--color-rule)" }}
        />
      ))}
    </div>
  );
}
