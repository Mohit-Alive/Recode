"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, ArrowUpRight, CaretLeft, Check, Lightbulb, X } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import { submitReview } from "@/actions/review";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/field";
import { DifficultyLabel } from "@/components/problems/difficulty";
import type { Difficulty } from "@/db/schema";
import { suggestGrade, TARGET_MINUTES } from "@/lib/srs/grade";
import { formatDayDelta, formatDuration, formatInterval, formatPercent } from "@/lib/format";
import { cn } from "@/lib/cn";

type Grade = 1 | 2 | 3 | 4;
type Step = "recall" | "solving" | "reveal" | "rate" | "done";

const GRADES: { grade: Grade; label: string; meaning: string }[] = [
  { grade: 1, label: "Again", meaning: "Could not solve it" },
  { grade: 2, label: "Hard", meaning: "Solved with real effort" },
  { grade: 3, label: "Good", meaning: "Solved it cleanly" },
  { grade: 4, label: "Easy", meaning: "Trivial now" },
];

type Props = {
  problem: { id: number; slug: string; title: string; difficulty: Difficulty; url: string; patternId: number | null; insight: string | null };
  patterns: { id: number; name: string; cue: string }[];
  intervals: Record<Grade, number>;
  recall: number;
  lastReviewedDays: number | null;
  lapses: number;
  remaining: number;
  nextHref: string;
};

export function ReviewSession(props: Props) {
  const { problem, patterns, intervals } = props;
  const router = useRouter();
  const reduce = useReducedMotion();
  const [step, setStep] = useState<Step>("recall");
  const [guess, setGuess] = useState<number | null>(null);
  const [approach, setApproach] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [stoppedAt, setStoppedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [solved, setSolved] = useState(true);
  const [hintUsed, setHintUsed] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const [viewedSolution, setViewedSolution] = useState(false);
  const [wrong, setWrong] = useState(0);
  const [insight, setInsight] = useState(problem.insight ?? "");
  const [result, setResult] = useState<{ days: number; grade: Grade } | null>(null);
  const [pending, startTransition] = useTransition();
  const topRef = useRef<HTMLDivElement>(null);

  // Timer display refresh (once a second, only while solving).
  useEffect(() => {
    if (step !== "solving" || startedAt === null) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [step, startedAt]);

  const seconds = useMemo(() => {
    void tick;
    if (startedAt === null) return null;
    // eslint-disable-next-line react-hooks/purity -- the live timer intentionally reads the clock on each tick
    return Math.round(((stoppedAt ?? Date.now()) - startedAt) / 1000);
  }, [startedAt, stoppedAt, tick]);

  const patternName = patterns.find((p) => p.id === problem.patternId)?.name ?? null;
  const patternCue = patterns.find((p) => p.id === problem.patternId)?.cue ?? null;
  const guessCorrect = guess === null || problem.patternId === null ? null : guess === problem.patternId;
  const target = TARGET_MINUTES[problem.difficulty];

  const suggestion = suggestGrade({
    difficulty: problem.difficulty,
    solved,
    viewedSolution,
    hintUsed,
    wrongSubmissions: wrong,
    minutes: seconds === null ? null : seconds / 60,
    patternRecalled: guessCorrect === null ? null : guessCorrect ? "instant" : "no",
  });

  const go = useCallback((s: Step) => {
    setStep(s);
    topRef.current?.scrollIntoView({ block: "start" });
  }, []);

  function startSolving() {
    setStartedAt(Date.now());
    go("solving");
  }

  function finishSolving(accepted: boolean) {
    setStoppedAt(Date.now());
    setSolved(accepted);
    go("reveal");
  }

  const submit = useCallback(
    (grade: Grade) => {
      if (pending) return;
      startTransition(async () => {
        const res = await submitReview({
          problemId: problem.id,
          grade,
          solved,
          viewedSolution,
          hintUsed,
          wrongSubmissions: wrong,
          seconds,
          patternGuessId: guess,
          insight: insight.trim() && insight.trim() !== (problem.insight ?? "") ? insight.trim() : undefined,
        });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        setResult({ days: res.days, grade });
        go("done");
      });
    },
    [pending, problem.id, problem.insight, solved, viewedSolution, hintUsed, wrong, seconds, guess, insight, go],
  );

  // Keyboard: 1-4 rate on the rating step, Enter advances on the done step.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, [contenteditable=true]")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (step === "rate" && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        submit(Number(e.key) as Grade);
      } else if (step === "rate" && e.key === "Enter") {
        e.preventDefault();
        submit(suggestion.grade as Grade);
      } else if (step === "done" && e.key === "Enter") {
        e.preventDefault();
        router.push(props.nextHref);
      } else if (step === "reveal" && e.key === "Enter") {
        e.preventDefault();
        go("rate");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, submit, suggestion.grade, router, props.nextHref, go]);

  const transition = reduce ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <div ref={topRef} className="mx-auto w-full max-w-[720px] px-4 py-8 sm:px-8 sm:py-10">
      <div className="flex items-center justify-between text-[13px] text-ink-subtle">
        <Link href="/today" className="inline-flex items-center gap-1 hover:text-ink">
          <CaretLeft size={13} aria-hidden /> Today
        </Link>
        <span className="font-mono text-[12px] tabular">{props.remaining > 0 ? `${props.remaining} more after this` : "Last one"}</span>
      </div>

      <StepIndicator step={step} />

      <header className="mt-6">
        <div className="flex items-center gap-3 text-[12px] text-ink-subtle">
          <DifficultyLabel difficulty={problem.difficulty} />
          <span>
            Recall now <span className="font-mono text-ink-muted tabular">{formatPercent(props.recall)}</span>
          </span>
          {props.lastReviewedDays !== null ? <span>Last seen {formatDayDelta(-props.lastReviewedDays)}</span> : null}
          {props.lapses > 0 ? <span>Forgotten {props.lapses}×</span> : null}
        </div>
        <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.025em] text-ink sm:text-[30px]">{problem.title}</h1>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={transition}
          className="mt-8"
        >
          {step === "recall" ? (
            <section aria-labelledby="recall-h">
              <h2 id="recall-h" className="text-[15px] font-semibold tracking-tight">
                Before you open it, which pattern solves it?
              </h2>
              <p className="mt-1 text-[13px] text-ink-subtle">Answer from memory. Retrieval is the workout; peeking skips it.</p>
              <div className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-3" role="radiogroup" aria-label="Pattern">
                {patterns.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={guess === p.id}
                    onClick={() => setGuess(guess === p.id ? null : p.id)}
                    className={cn(
                      "h-9 truncate rounded-md border px-3 text-left text-[13px] transition-colors",
                      guess === p.id ? "border-accent bg-surface-2 text-ink" : "border-line bg-surface-1 text-ink-muted hover:border-line-strong hover:text-ink",
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <label htmlFor="approach" className="mt-6 block text-[13px] font-medium text-ink-muted">
                Sketch the approach <span className="font-normal text-ink-subtle">(optional, stays on this page)</span>
              </label>
              <Textarea
                id="approach"
                name="approach"
                autoComplete="off"
                rows={3}
                value={approach}
                onChange={(e) => setApproach(e.target.value)}
                placeholder="Key data structure, the invariant, the complexity…"
                className="mt-2"
              />
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Button asChild variant="primary" size="lg">
                  <a href={problem.url} target="_blank" rel="noreferrer" onClick={startSolving}>
                    Open on LeetCode and Start Timer <ArrowUpRight size={15} aria-hidden />
                  </a>
                </Button>
                <Button variant="ghost" onClick={() => go("reveal")}>
                  Solved it elsewhere, skip timer
                </Button>
              </div>
            </section>
          ) : null}

          {step === "solving" ? (
            <section aria-labelledby="solving-h" className="rounded-xl border border-line bg-surface-1 p-6 hairline-top">
              <h2 id="solving-h" className="sr-only">
                Solving
              </h2>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[12px] text-ink-subtle">Time on this problem</p>
                  <p className="mt-1 font-mono text-[44px] leading-none font-medium tracking-tight text-ink tabular" aria-live="off">
                    {formatDuration(seconds ?? 0)}
                  </p>
                </div>
                <p className="text-right text-[12px] text-ink-subtle">
                  Target
                  <br />
                  <span className="font-mono text-ink-muted tabular">{target}:00</span>
                </p>
              </div>
              <div className="mt-5 h-1 overflow-hidden rounded-full bg-line" aria-hidden>
                <div
                  className={cn("h-full rounded-full transition-[width] duration-1000 ease-linear", (seconds ?? 0) > target * 60 ? "bg-fading" : "bg-accent")}
                  style={{ width: `${Math.min(100, ((seconds ?? 0) / (target * 60)) * 100)}%` }}
                />
              </div>

              {hintShown ? (
                <div className="mt-5 rounded-lg border border-line bg-surface-2 p-4">
                  <p className="flex items-center gap-1.5 text-[12px] font-medium text-ink-muted">
                    <Lightbulb size={13} aria-hidden /> Your key insight
                  </p>
                  <p className="mt-1.5 text-[14px] text-ink">{problem.insight ?? patternCue ?? "No saved insight for this one."}</p>
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-2">
                <Button variant="primary" onClick={() => finishSolving(true)}>
                  <Check size={15} aria-hidden /> Accepted
                </Button>
                {!hintShown ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setHintShown(true);
                      setHintUsed(true);
                    }}
                  >
                    <Lightbulb size={15} aria-hidden /> Show a Hint
                  </Button>
                ) : null}
                <Button variant="ghost" onClick={() => finishSolving(false)}>
                  <X size={15} aria-hidden /> Give Up
                </Button>
                <a href={problem.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 self-center text-[13px] text-accent-text hover:underline">
                  Reopen problem <ArrowUpRight size={12} aria-hidden />
                </a>
              </div>
            </section>
          ) : null}

          {step === "reveal" ? (
            <section aria-labelledby="reveal-h">
              <h2 id="reveal-h" className="text-[15px] font-semibold tracking-tight">
                Compare with what you knew
              </h2>
              <dl className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface-1">
                <div className="flex flex-col gap-1 p-4 sm:flex-row sm:items-start sm:gap-6">
                  <dt className="w-28 shrink-0 text-[13px] text-ink-subtle">Pattern</dt>
                  <dd className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-[14px] text-ink">
                      {patternName ?? "Unlabelled"}
                      {guessCorrect === true ? (
                        <span className="inline-flex items-center gap-1 text-[12px] text-strong">
                          <Check size={12} weight="bold" aria-hidden /> You called it
                        </span>
                      ) : guessCorrect === false ? (
                        <span className="inline-flex items-center gap-1 text-[12px] text-risk">
                          <X size={12} weight="bold" aria-hidden /> You guessed {patterns.find((p) => p.id === guess)?.name}
                        </span>
                      ) : null}
                    </p>
                    {patternCue ? <p className="mt-1 text-[13px] leading-relaxed text-ink-subtle">Cue: {patternCue}</p> : null}
                  </dd>
                </div>
                {approach.trim() ? (
                  <div className="flex flex-col gap-1 p-4 sm:flex-row sm:gap-6">
                    <dt className="w-28 shrink-0 text-[13px] text-ink-subtle">Your sketch</dt>
                    <dd className="flex-1 text-[14px] whitespace-pre-wrap text-ink-muted">{approach}</dd>
                  </div>
                ) : null}
                <div className="flex flex-col gap-2 p-4 sm:flex-row sm:gap-6">
                  <dt className="w-28 shrink-0 pt-2 text-[13px] text-ink-subtle">
                    <label htmlFor="insight">Key insight</label>
                  </dt>
                  <dd className="flex-1">
                    <Textarea
                      id="insight"
                      name="insight"
                      autoComplete="off"
                      rows={2}
                      maxLength={280}
                      value={insight}
                      onChange={(e) => setInsight(e.target.value)}
                      placeholder="The one line that cracks it…"
                    />
                    <p className="mt-1.5 text-[12px] text-ink-subtle">Sharpen it now while the solution is fresh. You will see it again next time.</p>
                  </dd>
                </div>
              </dl>
              <div className="mt-6 flex items-center gap-3">
                <Button variant="primary" onClick={() => go("rate")}>
                  Rate This Review <ArrowRight size={14} aria-hidden />
                </Button>
                <span className="hidden text-[12px] text-ink-subtle sm:inline">
                  or press <Kbd>↵</Kbd>
                </span>
              </div>
            </section>
          ) : null}

          {step === "rate" ? (
            <section aria-labelledby="rate-h">
              <h2 id="rate-h" className="text-[15px] font-semibold tracking-tight">
                How did it go?
              </h2>
              <div className="mt-4 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
                <SignalRow label="Reached Accepted">
                  <Switch checked={solved} onCheckedChange={setSolved} aria-label="Reached Accepted" />
                </SignalRow>
                <SignalRow label="Used a hint">
                  <Switch checked={hintUsed} onCheckedChange={setHintUsed} aria-label="Used a hint" />
                </SignalRow>
                <SignalRow label="Looked at the solution">
                  <Switch checked={viewedSolution} onCheckedChange={setViewedSolution} aria-label="Looked at the solution" />
                </SignalRow>
                <SignalRow label="Wrong submissions">
                  <div className="flex items-center gap-1" role="group" aria-label="Wrong submissions">
                    {[0, 1, 2, 3].map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-pressed={wrong === n}
                        onClick={() => setWrong(n)}
                        className={cn(
                          "h-7 min-w-8 rounded-md border px-2 font-mono text-[12px] transition-colors",
                          wrong === n ? "border-accent bg-surface-2 text-ink" : "border-line text-ink-subtle hover:text-ink",
                        )}
                      >
                        {n === 3 ? "3+" : n}
                      </button>
                    ))}
                  </div>
                </SignalRow>
              </div>

              <p className="mt-5 text-[13px] text-ink-subtle">
                Suggested <span className="font-medium text-ink">{GRADES[suggestion.grade - 1].label}</span>: {suggestion.reasons.join(". ")}.
                {seconds !== null ? ` Time ${formatDuration(seconds)}.` : ""}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Rate your recall">
                {GRADES.map((g) => {
                  const suggested = g.grade === suggestion.grade;
                  const aboveCap = g.grade > suggestion.cap;
                  return (
                    <button
                      key={g.grade}
                      type="button"
                      disabled={pending}
                      onClick={() => submit(g.grade)}
                      title={aboveCap ? "Higher than your signals suggest. Allowed, but be honest with yourself." : g.meaning}
                      className={cn(
                        "group relative flex flex-col items-start gap-2 rounded-lg border border-b-[3px] bg-surface-1 p-3 text-left transition-[border-color,background-color,transform] active:translate-y-px disabled:opacity-60",
                        suggested ? "border-accent" : "border-line-strong hover:border-ink-faint",
                      )}
                    >
                      <span className="flex w-full items-center justify-between">
                        <Kbd>{g.grade}</Kbd>
                        <span className="font-mono text-[12px] text-ink-subtle tabular">{formatInterval(intervals[g.grade])}</span>
                      </span>
                      <span className={cn("text-[14px] font-medium", aboveCap ? "text-ink-subtle" : "text-ink")}>{g.label}</span>
                      <span className="text-[11.5px] leading-snug text-ink-subtle">{g.meaning}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 hidden text-[12px] text-ink-subtle sm:block">
                Press <Kbd>1</Kbd> to <Kbd>4</Kbd>, or <Kbd>↵</Kbd> to accept the suggestion. The number on each key is when you would see this again.
              </p>
            </section>
          ) : null}

          {step === "done" && result ? (
            <section aria-live="polite" className="rounded-xl border border-line bg-surface-1 p-6 hairline-top">
              <p className="text-[13px] text-ink-subtle">Rated {GRADES[result.grade - 1].label}</p>
              <p className="mt-1 text-[22px] font-semibold tracking-tight text-ink">
                {result.grade === 1 ? "Back tomorrow. Forgetting is part of it." : `See you ${formatDayDelta(Math.max(1, result.days))}.`}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-subtle">
                {result.grade === 1
                  ? "A lapse resets the interval but not the memory: relearning is faster than learning, and the next gaps will grow again."
                  : "Each successful re-solve makes the memory more stable, so the gap before the next one grows."}
              </p>
              <div className="mt-6 flex items-center gap-3">
                <Button asChild variant="primary">
                  <Link href={props.nextHref}>
                    {props.remaining > 0 ? "Next Review" : "Finish"} <ArrowRight size={14} aria-hidden />
                  </Link>
                </Button>
                <span className="hidden text-[12px] text-ink-subtle sm:inline">
                  or press <Kbd>↵</Kbd>
                </span>
              </div>
            </section>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function SignalRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-surface-1 px-4 py-3">
      <span className="text-[13.5px] text-ink-muted">{label}</span>
      {children}
    </div>
  );
}

const STEPS: { key: Step; label: string }[] = [
  { key: "recall", label: "Recall" },
  { key: "solving", label: "Solve" },
  { key: "reveal", label: "Compare" },
  { key: "rate", label: "Rate" },
];

function StepIndicator({ step }: { step: Step }) {
  const idx = step === "done" ? STEPS.length : STEPS.findIndex((s) => s.key === step);
  return (
    <ol className="mt-6 flex items-center gap-1.5" aria-label="Review progress">
      {STEPS.map((s, i) => (
        <li key={s.key} className="flex flex-1 flex-col gap-1.5" aria-current={i === idx ? "step" : undefined}>
          <span className={cn("h-0.5 rounded-full transition-colors duration-300", i <= idx ? "bg-accent" : "bg-line")} />
          <span className={cn("text-[11px]", i === idx ? "text-ink" : "text-ink-faint")}>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}
