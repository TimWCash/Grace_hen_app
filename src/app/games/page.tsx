"use client";

import { useEffect, useState } from "react";
import { PageFrame } from "@/components/PageFrame";
import { supabase } from "@/lib/supabase";
import { getCurrentGuest } from "@/lib/guest";

type QuizQ = {
  id: string;
  position: number;
  question: string;
  options: string[];
  category?: string; // 'mr_mrs' | 'guess_who' (absent until migration 008)
};
type QuizAnswer = {
  question_id: string;
  guest_id: string;
  chosen_index: number;
  is_correct: boolean | null; // null = checking
};
export default function GamesPage() {
  const [guestId, setGuestId] = useState<string | null>(null);

  const [questions, setQuestions] = useState<QuizQ[] | null>(null);
  const [myAnswers, setMyAnswers] = useState<Record<string, QuizAnswer>>({});

  useEffect(() => {
    const sb = supabase();
    let cancelled = false;

    const load = async () => {
      const guest = await getCurrentGuest();
      if (cancelled) return;
      setGuestId(guest?.id ?? null);
      if (!guest) return;

      const [qRes, aRes] = await Promise.all([
        sb.from("quiz_public").select("*").order("position", { ascending: true }),
        sb.from("quiz_answers").select("*").eq("guest_id", guest.id),
      ]);
      if (cancelled) return;
      if (qRes.data) setQuestions(qRes.data as QuizQ[]);
      if (aRes.data)
        setMyAnswers(
          Object.fromEntries((aRes.data as QuizAnswer[]).map((a) => [a.question_id, a])),
        );
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const answer = async (qId: string, idx: number) => {
    if (!guestId) return;
    const sb = supabase();
    // Pending: show the pick but no verdict yet (avoids a false "not quite" flash).
    setMyAnswers((prev) => ({
      ...prev,
      [qId]: { question_id: qId, guest_id: guestId, chosen_index: idx, is_correct: null },
    }));
    const { data, error } = await sb.rpc("check_quiz_answer", { q: qId, chosen: idx });
    if (error) {
      console.error(error);
      return;
    }
    setMyAnswers((prev) => ({
      ...prev,
      [qId]: { question_id: qId, guest_id: guestId, chosen_index: idx, is_correct: !!data },
    }));
  };

  const score = questions
    ? questions.filter((q) => myAnswers[q.id]?.is_correct === true).length
    : 0;

  return (
    <PageFrame
      sectionMark="V"
      eyebrow="The Parlour Games"
      title="The Salon"
      subtitle="How well do you really know her?"
    >
      <QuizTab questions={questions} myAnswers={myAnswers} score={score} total={questions?.length ?? 0} onAnswer={answer} />
    </PageFrame>
  );
}

function QuizTab({
  questions,
  myAnswers,
  score,
  total,
  onAnswer,
}: {
  questions: QuizQ[] | null;
  myAnswers: Record<string, QuizAnswer>;
  score: number;
  total: number;
  onAnswer: (qId: string, idx: number) => void;
}) {
  if (!questions) return <SkeletonList n={3} h="h-36" />;

  const rounds = [
    {
      key: "mr_mrs",
      label: "Mr & Mrs",
      caption: "Mark's answers · pre-filled",
      correctLabel: "Mark agrees",
      items: questions.filter((q) => (q.category ?? "mr_mrs") === "mr_mrs"),
    },
    {
      key: "guess_who",
      label: "Guess Who · Bride or Groom",
      caption: "Grace or Mark?",
      correctLabel: "Correct",
      items: questions.filter((q) => q.category === "guess_who"),
    },
  ].filter((r) => r.items.length > 0);

  return (
    <>
      <div
        className="border p-4 mb-8 flex items-baseline justify-between"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <span className="label text-[9px]" style={{ color: "var(--color-gold)" }}>
          Your score
        </span>
        <span className="font-display" style={{ color: "var(--color-navy)", fontSize: "20px" }}>
          {score} / {total}
        </span>
      </div>

      {rounds.map((round) => (
        <section key={round.key} className="mb-12">
          <p className="label text-[10px]" style={{ color: "var(--color-gold)" }}>
            {round.label}
          </p>
          <p
            className="font-display italic mt-1"
            style={{ color: "var(--color-navy)", opacity: 0.6, fontSize: "13px" }}
          >
            {round.caption}
          </p>
          <div className="rule-gold w-12 mt-3" />

          <ol className="space-y-8 mt-6">
            {round.items.map((q, i) => {
              const mine = myAnswers[q.id];
              const binary = q.options.length === 2;
              return (
                <li key={q.id}>
                  <div className="flex items-baseline gap-2.5">
                    <span
                      className="font-display italic tabular-nums shrink-0"
                      style={{ color: "var(--color-gold)", fontSize: "13px" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className="font-display"
                      style={{ color: "var(--color-navy)", fontSize: "19px", lineHeight: 1.15 }}
                    >
                      {q.question}
                    </span>
                  </div>
                  <div className="rule mt-3 mb-3" />
                  <div className={binary ? "grid grid-cols-2 gap-2" : "space-y-2"}>
                    {q.options.map((opt, oi) => {
                      const picked = mine?.chosen_index === oi;
                      const verdict = picked ? mine?.is_correct : undefined;
                      const settled = picked && (verdict === true || verdict === false);
                      return (
                        <button
                          key={oi}
                          type="button"
                          onClick={() => onAnswer(q.id, oi)}
                          className="border px-4 py-3 flex items-center justify-between gap-2 text-left"
                          style={{
                            background:
                              picked && !settled
                                ? "var(--color-navy)"
                                : picked && verdict === true
                                ? "rgba(197,160,89,0.14)"
                                : picked && verdict === false
                                ? "rgba(107,31,46,0.08)"
                                : "transparent",
                            color: picked && !settled ? "var(--color-paper)" : "var(--color-navy)",
                            borderColor: picked
                              ? verdict === false
                                ? "var(--color-destructive)"
                                : "var(--color-gold)"
                              : "var(--color-rule)",
                            minHeight: "52px",
                          }}
                        >
                          <span style={{ fontSize: binary ? "17px" : "15px" }}>{opt}</span>
                          {picked && verdict === null && (
                            <span className="label text-[8px]" style={{ color: "var(--color-paper)" }}>
                              Checking
                            </span>
                          )}
                          {picked && verdict === true && (
                            <span
                              className="font-display italic shrink-0"
                              style={{ color: "var(--color-gold)", fontSize: "12px" }}
                            >
                              {round.correctLabel}
                            </span>
                          )}
                          {picked && verdict === false && (
                            <span
                              className="font-display italic shrink-0"
                              style={{ color: "var(--color-destructive)", fontSize: "12px" }}
                            >
                              Not quite
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </>
  );
}

function SkeletonList({ n, h }: { n: number; h: string }) {
  return (
    <ul className="space-y-2">
      {Array.from({ length: n }).map((_, i) => (
        <li
          key={i}
          className={`border ${h} animate-pulse`}
          style={{ borderColor: "var(--color-rule)" }}
        />
      ))}
    </ul>
  );
}
