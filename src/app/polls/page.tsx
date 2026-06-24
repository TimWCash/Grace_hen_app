"use client";

import { useEffect, useMemo, useState } from "react";
import { PageFrame } from "@/components/PageFrame";
import { supabase } from "@/lib/supabase";
import { celebrate } from "@/lib/celebrate";
import { getCurrentGuest } from "@/lib/guest";
import { useGuest } from "@/components/GuestProvider";

type Poll = {
  id: string;
  title: string;
  status: "open" | "closed";
  position: number;
};
type Option = { id: string; poll_id: string; position: number; label: string };
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
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "polls" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_options" }, () => loadAll())
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
    setPolls((prev) => prev?.map((p) => (p.id === poll.id ? { ...p, status: next } : p)) ?? null);
    const sb = supabase();
    const { error } = await sb.from("polls").update({ status: next }).eq("id", poll.id);
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
    const { error: oErr } = await sb
      .from("poll_options")
      .insert(optionLabels.map((label, i) => ({ poll_id: poll.id, position: i + 1, label })));
    if (oErr) {
      console.error("create poll options", oErr);
      return false;
    }
    return true;
  };

  const castVote = async (pollId: string, optionId: string) => {
    if (!guestId) return;
    const sb = supabase();
    setVotes((prev) => [
      ...prev.filter((v) => !(v.poll_id === pollId && v.guest_id === guestId)),
      { poll_id: pollId, guest_id: guestId, option_id: optionId },
    ]);
    const { error } = await sb
      .from("poll_votes")
      .upsert({ poll_id: pollId, guest_id: guestId, option_id: optionId }, { onConflict: "poll_id,guest_id" });
    if (error) console.error("vote", error);
    else celebrate();
  };

  return (
    <PageFrame
      sectionMark="VI"
      eyebrow="The Vote · Real Time"
      title="The Ballot"
      subtitle="The night, decided by committee."
    >
      {!polls ? (
        <SkeletonList />
      ) : polls.length === 0 ? (
        <Empty />
      ) : (
        <ul className="space-y-10">
          {polls.map((poll) => {
            const pollOptions = options.filter((o) => o.poll_id === poll.id);
            const pollVotes = votes.filter((v) => v.poll_id === poll.id);
            const total = pollVotes.length || 1;
            const myPick = myVotes[poll.id];
            const isClosed = poll.status === "closed";
            return (
              <li key={poll.id}>
                <div className="flex items-center justify-between gap-3">
                  <span className="label text-[9px]" style={{ color: "var(--color-gold)" }}>
                    Ballot
                  </span>
                  <button
                    type="button"
                    onClick={isAdmin ? () => togglePollStatus(poll) : undefined}
                    disabled={!isAdmin}
                    className="label text-[8.5px] px-2 py-1 border shrink-0 disabled:cursor-default"
                    style={{
                      color: isClosed ? "var(--color-navy)" : "var(--color-paper)",
                      background: isClosed ? "transparent" : "var(--color-navy)",
                      borderColor: isClosed ? "var(--color-rule)" : "var(--color-navy)",
                      opacity: isClosed ? 0.6 : 1,
                      cursor: isAdmin ? "pointer" : undefined,
                    }}
                  >
                    {isClosed ? "Closed" : "Live"}
                  </button>
                </div>
                <h3
                  className="font-display mt-2"
                  style={{
                    color: "var(--color-navy)",
                    fontSize: "clamp(22px, 5vw, 28px)",
                    letterSpacing: "-0.02em",
                    lineHeight: 1.05,
                  }}
                >
                  {poll.title}
                </h3>
                <div className="rule-gold w-12 mt-4 mb-4" />

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
                          className="w-full text-left relative overflow-hidden border px-4 py-3.5 disabled:cursor-default"
                          style={{
                            background: "transparent",
                            borderColor: isPick ? "var(--color-gold)" : "var(--color-rule)",
                            minHeight: "52px",
                          }}
                        >
                          {showBar && (
                            <div
                              className="absolute inset-y-0 left-0 transition-all"
                              style={{
                                width: `${pct}%`,
                                background: isPick
                                  ? "rgba(197, 160, 89, 0.18)"
                                  : "var(--color-rule-soft)",
                              }}
                            />
                          )}
                          <div className="relative flex items-center justify-between gap-3">
                            <span className="flex items-baseline gap-2.5 flex-1 min-w-0">
                              <span
                                className="font-display italic tabular-nums shrink-0"
                                style={{ color: "var(--color-gold)", fontSize: "13px" }}
                              >
                                {oi + 1}.
                              </span>
                              <span
                                className="font-display truncate"
                                style={{ color: "var(--color-navy)", fontSize: "16px" }}
                              >
                                {opt.label}
                              </span>
                            </span>
                            <span className="flex items-center gap-2.5 shrink-0">
                              {isPick && (
                                <span className="label text-[8px]" style={{ color: "var(--color-gold)" }}>
                                  Your pick
                                </span>
                              )}
                              {showBar && (
                                <span
                                  className="font-display tabular-nums"
                                  style={{ color: "var(--color-navy)", fontSize: "15px" }}
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

                <div className="flex items-center justify-between mt-3">
                  <span
                    className="font-display italic"
                    style={{ color: "var(--color-navy)", opacity: 0.55, fontSize: "12px" }}
                  >
                    {pollVotes.length === 0
                      ? "First to vote"
                      : `${pollVotes.length} ${pollVotes.length === 1 ? "ballot cast" : "ballots cast"}`}
                  </span>
                  {!myPick && !isClosed && (
                    <span className="label text-[8.5px]" style={{ color: "var(--color-gold)" }}>
                      Cast a vote
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {isAdmin && (
        <div className="mt-10">
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
              className="w-full border py-4 label text-[10px]"
              style={{
                borderColor: "var(--color-gold)",
                color: "var(--color-navy)",
                minHeight: "48px",
              }}
            >
              Pose a new question
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

  const canSubmit = title.trim().length > 0 && opts.filter((o) => o.trim()).length >= 2;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        setBusy(true);
        await onSubmit(title.trim(), opts.map((o) => o.trim()).filter(Boolean));
        setBusy(false);
      }}
      className="border p-5"
      style={{ borderColor: "var(--color-rule)", background: "var(--color-paper-warm)" }}
    >
      <p className="label text-[10px] text-center" style={{ color: "var(--color-gold)" }}>
        New Poll
      </p>
      <div className="rule mt-3 mb-4" />
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Question…"
        className="w-full border-b py-3 bg-transparent focus:outline-none font-display"
        style={{ borderColor: "var(--color-rule)", color: "var(--color-navy)", fontSize: "18px" }}
      />
      <div className="mt-4 space-y-2">
        {opts.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="font-display italic tabular-nums w-5 text-right shrink-0"
              style={{ color: "var(--color-gold)", fontSize: "13px" }}
            >
              {i + 1}.
            </span>
            <input
              type="text"
              value={o}
              onChange={(e) => setOpts((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
              placeholder={`Option ${i + 1}`}
              className="flex-1 border-b py-2 bg-transparent focus:outline-none font-display"
              style={{ borderColor: "var(--color-rule)", color: "var(--color-navy)", fontSize: "16px" }}
            />
            {opts.length > 2 && (
              <button
                type="button"
                onClick={() => setOpts((prev) => prev.filter((_, j) => j !== i))}
                className="label text-[10px] px-2 py-2"
                style={{ color: "var(--color-destructive)" }}
                aria-label="Remove option"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        {opts.length < 6 && (
          <button
            type="button"
            onClick={() => setOpts((prev) => [...prev, ""])}
            className="label text-[9px] mt-2"
            style={{ color: "var(--color-gold)" }}
          >
            + Add option
          </button>
        )}
      </div>
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border py-3 label text-[10px]"
          style={{ borderColor: "var(--color-rule)", color: "var(--color-navy)", minHeight: "44px" }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit || busy}
          className="flex-1 py-3 label text-[10px] disabled:opacity-50"
          style={{
            background: "var(--color-navy)",
            color: "var(--color-paper)",
            border: "0.5px solid var(--color-navy)",
            minHeight: "44px",
          }}
        >
          {busy ? "Posting" : "Post"}
        </button>
      </div>
    </form>
  );
}

function SkeletonList() {
  return (
    <ul className="space-y-6">
      {Array.from({ length: 2 }).map((_, i) => (
        <li
          key={i}
          className="border h-40 animate-pulse"
          style={{ borderColor: "var(--color-rule)" }}
        />
      ))}
    </ul>
  );
}

function Empty() {
  return (
    <p
      className="font-display italic text-center py-12"
      style={{ color: "var(--color-navy)", opacity: 0.5, fontSize: "16px" }}
    >
      No questions on the floor yet — the night is young.
    </p>
  );
}
