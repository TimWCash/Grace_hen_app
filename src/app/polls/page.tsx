"use client";

import { useEffect, useMemo, useState } from "react";
import { PageFrame } from "@/components/PageFrame";
import { supabase } from "@/lib/supabase";
import { getCurrentGuest } from "@/lib/guest";
import { useGuest } from "@/components/GuestProvider";

type Poll = {
  id: string;
  title: string;
  status: "open" | "closed";
  position: number;
};
type Option = {
  id: string;
  poll_id: string;
  position: number;
  label: string;
};
type Vote = { poll_id: string; guest_id: string; option_id: string };

export default function PollsPage() {
  const { isAdmin } = useGuest();
  const [polls, setPolls] = useState<Poll[] | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [composer, setComposer] = useState(false);

  useEffect(() => {
    const sb = supabase();
    let cancelled = false;

    const loadAll = async () => {
      const guest = await getCurrentGuest();
      if (cancelled) return;
      setGuestId(guest?.id ?? null);

      const [pollsRes, optsRes, votesRes] = await Promise.all([
        sb.from("polls").select("*").order("position", { ascending: true }),
        sb.from("poll_options").select("*").order("position", { ascending: true }),
        sb.from("poll_votes").select("*"),
      ]);
      if (cancelled) return;
      if (pollsRes.data) setPolls(pollsRes.data as Poll[]);
      if (optsRes.data) setOptions(optsRes.data as Option[]);
      if (votesRes.data) setVotes(votesRes.data as Vote[]);
    };
    loadAll();

    const channel = sb
      .channel("polls-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "poll_votes" },
        () => loadAll(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "polls" },
        () => loadAll(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "poll_options" },
        () => loadAll(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, []);

  const myVotes = useMemo(
    () =>
      Object.fromEntries(
        votes.filter((v) => v.guest_id === guestId).map((v) => [v.poll_id, v.option_id]),
      ),
    [votes, guestId],
  );

  const togglePollStatus = async (poll: Poll) => {
    const next: Poll["status"] = poll.status === "open" ? "closed" : "open";
    setPolls((prev) =>
      prev?.map((p) => (p.id === poll.id ? { ...p, status: next } : p)) ?? null,
    );
    const sb = supabase();
    const { error } = await sb
      .from("polls")
      .update({ status: next })
      .eq("id", poll.id);
    if (error) console.error("poll status", error);
  };

  const createPoll = async (title: string, optionLabels: string[]) => {
    const sb = supabase();
    const nextPosition = (polls?.length ?? 0) + 1;
    const { data: poll, error: pErr } = await sb
      .from("polls")
      .insert({ title, status: "open", position: nextPosition })
      .select()
      .single();
    if (pErr || !poll) {
      console.error("create poll", pErr);
      return false;
    }
    const { error: oErr } = await sb.from("poll_options").insert(
      optionLabels.map((label, i) => ({
        poll_id: poll.id,
        position: i + 1,
        label,
      })),
    );
    if (oErr) {
      console.error("create poll options", oErr);
      return false;
    }
    return true;
  };

  const castVote = async (pollId: string, optionId: string) => {
    if (!guestId) return;
    const sb = supabase();
    setVotes((prev) => {
      const others = prev.filter(
        (v) => !(v.poll_id === pollId && v.guest_id === guestId),
      );
      return [...others, { poll_id: pollId, guest_id: guestId, option_id: optionId }];
    });
    const { error } = await sb
      .from("poll_votes")
      .upsert(
        { poll_id: pollId, guest_id: guestId, option_id: optionId },
        { onConflict: "poll_id,guest_id" },
      );
    if (error) console.error("vote", error);
  };

  return (
    <PageFrame eyebrow="The Vote · Real Time" title="Polls" subtitle="we decide, in style">
      {!polls ? (
        <SkeletonList />
      ) : polls.length === 0 ? (
        <Empty />
      ) : (
        <ul className="space-y-5">
          {polls.map((poll) => {
            const pollOptions = options.filter((o) => o.poll_id === poll.id);
            const pollVotes = votes.filter((v) => v.poll_id === poll.id);
            const total = pollVotes.length || 1;
            const myPick = myVotes[poll.id];
            const isClosed = poll.status === "closed";
            return (
              <li
                key={poll.id}
                className="relative rounded-xl px-5 pt-5 pb-4 overflow-hidden"
                style={{
                  background: "rgba(255, 255, 255, 0.82)",
                  border: "1px solid var(--color-rule)",
                  boxShadow:
                    "0 1px 0 rgba(184, 155, 94, 0.2), 0 8px 24px -14px rgba(10, 31, 68, 0.18)",
                }}
              >
                {/* Ballot heading */}
                <div className="flex items-center justify-between gap-3 mb-1">
                  <p
                    className="text-[9px] uppercase tracking-[0.45em]"
                    style={{ color: "var(--color-gold)" }}
                  >
                    Ballot
                  </p>
                  <button
                    type="button"
                    onClick={isAdmin ? () => togglePollStatus(poll) : undefined}
                    disabled={!isAdmin}
                    className="text-[9px] uppercase tracking-[0.3em] px-2 py-0.5 rounded-full border shrink-0 transition-opacity disabled:cursor-default"
                    style={{
                      color: isClosed ? "var(--color-navy)" : "var(--color-cream)",
                      background: isClosed ? "transparent" : "var(--color-navy)",
                      borderColor: "var(--color-rule)",
                      opacity: isClosed ? 0.6 : 1,
                      cursor: isAdmin ? "pointer" : undefined,
                    }}
                  >
                    {isClosed ? "Closed" : "Live"}
                  </button>
                </div>
                <h3
                  className="font-display text-[22px] leading-tight mt-0.5"
                  style={{ color: "var(--color-navy)" }}
                >
                  {poll.title}
                </h3>
                <div className="gold-rule my-4 w-20" />

                <ul className="space-y-2">
                  {pollOptions.map((opt, oi) => {
                    const count = pollVotes.filter((v) => v.option_id === opt.id).length;
                    const pct = Math.round((count / total) * 100);
                    const isPick = myPick === opt.id;
                    const showBar = !!myPick || isClosed;
                    return (
                      <li key={opt.id}>
                        <button
                          type="button"
                          disabled={isClosed}
                          onClick={() => castVote(poll.id, opt.id)}
                          className="w-full text-left relative overflow-hidden rounded-lg border px-4 py-3 transition-all disabled:cursor-default"
                          style={{
                            background: isPick
                              ? "rgba(10,31,68,0.05)"
                              : "rgba(245, 239, 224, 0.5)",
                            borderColor: isPick
                              ? "var(--color-gold)"
                              : "var(--color-rule)",
                          }}
                        >
                          {showBar && (
                            <div
                              className="absolute inset-y-0 left-0 transition-all"
                              style={{
                                width: `${pct}%`,
                                background: isPick
                                  ? "linear-gradient(90deg, rgba(184, 155, 94, 0.28), rgba(184, 155, 94, 0.12))"
                                  : "linear-gradient(90deg, rgba(10, 31, 68, 0.09), rgba(10, 31, 68, 0.04))",
                              }}
                            />
                          )}
                          <div className="relative flex items-center justify-between gap-3">
                            <div className="flex items-baseline gap-2.5 flex-1 min-w-0">
                              <span
                                className="numeral text-base shrink-0"
                                style={{ color: "var(--color-gold)" }}
                              >
                                {oi + 1}.
                              </span>
                              <span
                                className="font-display text-[16px] truncate"
                                style={{ color: "var(--color-navy)" }}
                              >
                                {opt.label}
                              </span>
                            </div>
                            <span className="flex items-center gap-2 shrink-0">
                              {isPick && (
                                <span
                                  className="text-[9px] uppercase tracking-[0.2em] font-display italic"
                                  style={{ color: "var(--color-gold)" }}
                                >
                                  your pick
                                </span>
                              )}
                              {showBar && (
                                <span
                                  className="font-display tabular-nums text-[15px]"
                                  style={{ color: "var(--color-navy)" }}
                                >
                                  {pct}%
                                </span>
                              )}
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <div className="flex items-center justify-between mt-4">
                  <p
                    className="font-display italic text-[12px]"
                    style={{ color: "var(--color-navy)", opacity: 0.55 }}
                  >
                    {pollVotes.length === 0
                      ? "First to vote"
                      : `${pollVotes.length} ${pollVotes.length === 1 ? "ballot cast" : "ballots cast"}`}
                  </p>
                  {!myPick && !isClosed && (
                    <p
                      className="text-[9px] uppercase tracking-[0.3em]"
                      style={{ color: "var(--color-gold)" }}
                    >
                      Cast a vote
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {isAdmin && (
        <div className="mt-6">
          {composer ? (
            <PollComposer
              onCancel={() => setComposer(false)}
              onSubmit={async (title, opts) => {
                const ok = await createPoll(title, opts);
                if (ok) setComposer(false);
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setComposer(true)}
              className="w-full rounded-xl border-2 border-dashed py-4 font-display text-lg tracking-wide"
              style={{
                background: "rgba(255,255,255,0.5)",
                borderColor: "var(--color-gold)",
                color: "var(--color-navy)",
              }}
            >
              ✎  Pose a new question
            </button>
          )}
        </div>
      )}
    </PageFrame>
  );
}

function PollComposer({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (title: string, options: string[]) => Promise<void> | void;
}) {
  const [title, setTitle] = useState("");
  const [opts, setOpts] = useState<string[]>(["", ""]);
  const [busy, setBusy] = useState(false);

  const canSubmit =
    title.trim().length > 0 && opts.filter((o) => o.trim()).length >= 2;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        setBusy(true);
        await onSubmit(
          title.trim(),
          opts.map((o) => o.trim()).filter(Boolean),
        );
        setBusy(false);
      }}
      className="rounded-xl border p-5"
      style={{
        background: "var(--color-ivory)",
        borderColor: "var(--color-rule)",
      }}
    >
      <p
        className="text-[10px] uppercase tracking-[0.3em] text-center mb-3"
        style={{ color: "var(--color-gold)" }}
      >
        New Poll
      </p>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Question…"
        className="w-full rounded-lg border px-4 py-3 font-display text-lg"
        style={{
          background: "rgba(255,255,255,0.85)",
          borderColor: "var(--color-rule)",
          color: "var(--color-navy)",
        }}
      />
      <div className="mt-3 space-y-2">
        {opts.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="font-display italic text-sm w-5 text-right"
              style={{ color: "var(--color-gold)" }}
            >
              {i + 1}.
            </span>
            <input
              type="text"
              value={o}
              onChange={(e) =>
                setOpts((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))
              }
              placeholder={`Option ${i + 1}`}
              className="flex-1 rounded-lg border px-3 py-2 font-display"
              style={{
                background: "rgba(255,255,255,0.85)",
                borderColor: "var(--color-rule)",
                color: "var(--color-navy)",
              }}
            />
            {opts.length > 2 && (
              <button
                type="button"
                onClick={() => setOpts((prev) => prev.filter((_, j) => j !== i))}
                className="text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-md"
                style={{
                  color: "var(--color-oxblood)",
                  background: "transparent",
                }}
                aria-label="Remove option"
              >
                ×
              </button>
            )}
          </div>
        ))}
        {opts.length < 6 && (
          <button
            type="button"
            onClick={() => setOpts((prev) => [...prev, ""])}
            className="text-[10px] uppercase tracking-[0.25em] mt-1"
            style={{ color: "var(--color-gold)" }}
          >
            + Add option
          </button>
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border py-2 font-display"
          style={{
            background: "rgba(255,255,255,0.5)",
            borderColor: "var(--color-rule)",
            color: "var(--color-navy)",
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit || busy}
          className="flex-1 rounded-lg py-2 font-display tracking-wider disabled:opacity-50"
          style={{
            background: "var(--color-navy)",
            color: "var(--color-cream)",
            border: "1px solid var(--color-gold)",
          }}
        >
          {busy ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
}

function SkeletonList() {
  return (
    <ul className="space-y-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <li
          key={i}
          className="rounded-xl border h-44 animate-pulse"
          style={{
            background: "rgba(255, 255, 255, 0.4)",
            borderColor: "var(--color-rule)",
          }}
        />
      ))}
    </ul>
  );
}

function Empty() {
  return (
    <div
      className="rounded-xl border p-8 text-center"
      style={{
        background: "rgba(255, 255, 255, 0.5)",
        borderColor: "var(--color-rule)",
      }}
    >
      <p
        className="font-display italic text-lg"
        style={{ color: "var(--color-navy)" }}
      >
        No polls yet — the night is still young.
      </p>
    </div>
  );
}
