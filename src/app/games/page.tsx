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
type Task = { id: string; position: number; task: string };
type Completion = { task_id: string; guest_id: string };

type Tab = "quiz" | "hunt";

export default function GamesPage() {
  const [tab, setTab] = useState<Tab>("quiz");
  const [guestId, setGuestId] = useState<string | null>(null);

  const [questions, setQuestions] = useState<QuizQ[] | null>(null);
  const [myAnswers, setMyAnswers] = useState<Record<string, QuizAnswer>>({});

  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [completions, setCompletions] = useState<Set<string>>(new Set());

  useEffect(() => {
    const sb = supabase();
    let cancelled = false;

    const load = async () => {
      const guest = await getCurrentGuest();
      if (cancelled) return;
      setGuestId(guest?.id ?? null);
      if (!guest) return;

      const [qRes, aRes, tRes, cRes] = await Promise.all([
        sb.from("quiz_public").select("*").order("position", { ascending: true }),
        sb.from("quiz_answers").select("*").eq("guest_id", guest.id),
        sb.from("scavenger_tasks").select("*").order("position", { ascending: true }),
        sb.from("scavenger_completions").select("*").eq("guest_id", guest.id),
      ]);
      if (cancelled) return;
      if (qRes.data) setQuestions(qRes.data as QuizQ[]);
      if (aRes.data)
        setMyAnswers(
          Object.fromEntries((aRes.data as QuizAnswer[]).map((a) => [a.question_id, a])),
        );
      if (tRes.data) setTasks(tRes.data as Task[]);
      if (cRes.data) setCompletions(new Set((cRes.data as Completion[]).map((c) => c.task_id)));
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

  const toggleTask = async (taskId: string) => {
    if (!guestId) return;
    const sb = supabase();
    const isDone = completions.has(taskId);
    setCompletions((s) => {
      const next = new Set(s);
      if (isDone) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
    if (isDone) {
      await sb.from("scavenger_completions").delete().eq("task_id", taskId).eq("guest_id", guestId);
    } else {
      await sb.from("scavenger_completions").upsert({ task_id: taskId, guest_id: guestId });
    }
  };

  const score = questions
    ? questions.filter((q) => myAnswers[q.id]?.is_correct === true).length
    : 0;

  const TABS: { key: Tab; label: string }[] = [
    { key: "quiz", label: "Mr & Mrs" },
    { key: "hunt", label: "Scavenger" },
  ];

  return (
    <PageFrame
      sectionMark="V"
      eyebrow="The Parlour Games"
      title="The Salon"
      subtitle="How well do you really know her?"
    >
      <div className="grid grid-cols-2 gap-0 border-y mb-8" style={{ borderColor: "var(--color-rule)" }}>
        {TABS.map((t, i) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`label text-[9px] py-3.5 ${i > 0 ? "border-l" : ""}`}
            style={{
              borderColor: "var(--color-rule)",
              background: tab === t.key ? "var(--color-navy)" : "transparent",
              color: tab === t.key ? "var(--color-paper)" : "var(--color-navy)",
              minHeight: "48px",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "quiz" && (
        <QuizTab questions={questions} myAnswers={myAnswers} score={score} total={questions?.length ?? 0} onAnswer={answer} />
      )}
      {tab === "hunt" && <HuntTab tasks={tasks} done={completions} onToggle={toggleTask} />}
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

function HuntTab({
  tasks,
  done,
  onToggle,
}: {
  tasks: Task[] | null;
  done: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (!tasks) return <SkeletonList n={6} h="h-14" />;
  const completed = tasks.filter((t) => done.has(t.id)).length;
  return (
    <>
      <div
        className="border p-4 mb-6 flex items-baseline justify-between"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <span className="label text-[9px]" style={{ color: "var(--color-gold)" }}>
          The Hunt
        </span>
        <span className="font-display" style={{ color: "var(--color-navy)", fontSize: "20px" }}>
          {completed} / {tasks.length}
        </span>
      </div>
      <ul className="space-y-2">
        {tasks.map((t) => {
          const isDone = done.has(t.id);
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onToggle(t.id)}
                className="w-full text-left border p-4 flex items-center gap-4"
                style={{
                  background: isDone ? "var(--color-paper-warm)" : "transparent",
                  borderColor: isDone ? "var(--color-gold)" : "var(--color-rule)",
                  minHeight: "56px",
                }}
              >
                <span
                  className="w-5 h-5 border shrink-0 flex items-center justify-center"
                  style={{
                    borderColor: isDone ? "var(--color-gold)" : "var(--color-rule)",
                    background: isDone ? "var(--color-gold)" : "transparent",
                  }}
                  aria-hidden
                />
                <span
                  className="font-display flex-1"
                  style={{
                    color: "var(--color-navy)",
                    fontSize: "16px",
                    lineHeight: 1.3,
                    textDecoration: isDone ? "line-through" : "none",
                    opacity: isDone ? 0.55 : 1,
                  }}
                >
                  {t.task}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
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
