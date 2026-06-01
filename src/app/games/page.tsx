"use client";

import { useEffect, useState } from "react";
import { PageFrame } from "@/components/PageFrame";
import { supabase } from "@/lib/supabase";
import { getCurrentGuest } from "@/lib/guest";

type QuizQ = { id: string; position: number; question: string; options: string[] };
type QuizAnswer = {
  question_id: string;
  guest_id: string;
  chosen_index: number;
  is_correct: boolean;
};
type Task = { id: string; position: number; task: string };
type Completion = { task_id: string; guest_id: string };

export default function GamesPage() {
  const [tab, setTab] = useState<"quiz" | "hunt">("quiz");
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
          Object.fromEntries(
            (aRes.data as QuizAnswer[]).map((a) => [a.question_id, a]),
          ),
        );
      if (tRes.data) setTasks(tRes.data as Task[]);
      if (cRes.data)
        setCompletions(new Set((cRes.data as Completion[]).map((c) => c.task_id)));
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const answer = async (qId: string, idx: number) => {
    if (!guestId) return;
    const sb = supabase();
    setMyAnswers((prev) => ({
      ...prev,
      [qId]: {
        question_id: qId,
        guest_id: guestId,
        chosen_index: idx,
        is_correct: false,
      },
    }));
    const { data, error } = await sb.rpc("check_quiz_answer", {
      q: qId,
      chosen: idx,
    });
    if (error) {
      console.error(error);
      return;
    }
    setMyAnswers((prev) => ({
      ...prev,
      [qId]: {
        question_id: qId,
        guest_id: guestId,
        chosen_index: idx,
        is_correct: !!data,
      },
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
      await sb
        .from("scavenger_completions")
        .delete()
        .eq("task_id", taskId)
        .eq("guest_id", guestId);
    } else {
      await sb
        .from("scavenger_completions")
        .upsert({ task_id: taskId, guest_id: guestId });
    }
  };

  const answered = questions
    ? questions.filter((q) => myAnswers[q.id] !== undefined)
    : [];
  const score = answered.filter((q) => myAnswers[q.id]?.is_correct).length;

  return (
    <PageFrame
      eyebrow="The Parlour Games"
      title="Mr & Mrs"
      subtitle="how well do you really know her?"
    >
      <div className="flex gap-2 mb-6">
        {(["quiz", "hunt"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="flex-1 rounded-lg border py-2 font-display text-sm tracking-wider transition-all"
            style={{
              background: tab === t ? "var(--color-navy)" : "rgba(255,255,255,0.6)",
              color: tab === t ? "var(--color-cream)" : "var(--color-navy)",
              borderColor: "var(--color-rule)",
            }}
          >
            {t === "quiz" ? "Mr & Mrs" : "Scavenger"}
          </button>
        ))}
      </div>

      {tab === "quiz" ? (
        <QuizTab
          questions={questions}
          myAnswers={myAnswers}
          score={score}
          total={questions?.length ?? 0}
          onAnswer={answer}
        />
      ) : (
        <HuntTab tasks={tasks} done={completions} onToggle={toggleTask} />
      )}
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
  return (
    <>
      <div
        className="rounded-xl border p-4 mb-4 flex items-center justify-between"
        style={{
          background: "var(--color-ivory)",
          borderColor: "var(--color-rule)",
        }}
      >
        <div>
          <div
            className="text-[10px] uppercase tracking-[0.3em]"
            style={{ color: "var(--color-gold)" }}
          >
            Mark's answers · pre-filled
          </div>
          <div
            className="font-display text-lg"
            style={{ color: "var(--color-navy)" }}
          >
            Your score: {score} / {total}
          </div>
        </div>
        <div
          className="font-display text-3xl"
          style={{ color: "var(--color-oxblood)" }}
        >
          ♛
        </div>
      </div>

      {!questions ? (
        <SkeletonList n={3} h="h-40" />
      ) : (
        <ol className="space-y-4">
          {questions.map((q, i) => {
            const mine = myAnswers[q.id];
            return (
              <li
                key={q.id}
                className="rounded-xl border p-4"
                style={{
                  background: "rgba(255, 255, 255, 0.7)",
                  borderColor: "var(--color-rule)",
                }}
              >
                <div className="flex items-baseline gap-2 mb-3">
                  <span
                    className="font-display italic text-sm"
                    style={{ color: "var(--color-gold)" }}
                  >
                    №{String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="font-display text-base leading-snug"
                    style={{ color: "var(--color-navy)" }}
                  >
                    {q.question}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {q.options.map((opt, oi) => {
                    const picked = mine?.chosen_index === oi;
                    const showResult = !!mine;
                    const isCorrect = picked && mine?.is_correct;
                    return (
                      <button
                        key={oi}
                        type="button"
                        onClick={() => onAnswer(q.id, oi)}
                        className="text-left rounded-lg border px-3 py-2 transition-all"
                        style={{
                          background: picked
                            ? showResult && isCorrect
                              ? "rgba(58, 138, 58, 0.12)"
                              : showResult
                              ? "rgba(107, 31, 46, 0.1)"
                              : "var(--color-navy)"
                            : "rgba(255,255,255,0.5)",
                          color:
                            picked && !showResult
                              ? "var(--color-cream)"
                              : "var(--color-navy)",
                          borderColor: picked
                            ? showResult && isCorrect
                              ? "rgb(58, 138, 58)"
                              : showResult
                              ? "var(--color-oxblood)"
                              : "var(--color-gold)"
                            : "var(--color-rule)",
                        }}
                      >
                        <span className="text-sm">{opt}</span>
                        {picked && showResult && (
                          <span
                            className="float-right font-display italic text-sm"
                            style={{
                              color: isCorrect
                                ? "rgb(58, 138, 58)"
                                : "var(--color-oxblood)",
                            }}
                          >
                            {isCorrect ? "✓ Mark agrees" : "✗ not quite"}
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
      )}
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
  return (
    <ul className="space-y-2">
      {tasks.map((t) => {
        const isDone = done.has(t.id);
        return (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onToggle(t.id)}
              className="w-full text-left rounded-xl border p-4 flex items-center gap-4 transition-all"
              style={{
                background: isDone
                  ? "rgba(10, 31, 68, 0.06)"
                  : "rgba(255, 255, 255, 0.7)",
                borderColor: "var(--color-rule)",
              }}
            >
              <div
                className="w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0"
                style={{
                  background: isDone ? "var(--color-navy)" : "transparent",
                  borderColor: isDone ? "var(--color-gold)" : "var(--color-rule)",
                }}
              >
                {isDone && (
                  <span
                    className="font-display text-sm"
                    style={{ color: "var(--color-gold-soft)" }}
                  >
                    ✓
                  </span>
                )}
              </div>
              <span
                className="font-display text-base leading-snug flex-1"
                style={{
                  color: "var(--color-navy)",
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
  );
}

function SkeletonList({ n, h }: { n: number; h: string }) {
  return (
    <ul className="space-y-2">
      {Array.from({ length: n }).map((_, i) => (
        <li
          key={i}
          className={`rounded-xl border ${h} animate-pulse`}
          style={{
            background: "rgba(255, 255, 255, 0.4)",
            borderColor: "var(--color-rule)",
          }}
        />
      ))}
    </ul>
  );
}
