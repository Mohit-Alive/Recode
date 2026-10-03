"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, ArrowUpRight, CaretLeft, Check, X } from "@phosphor-icons/react/ssr";
import { submitDrill } from "@/actions/review";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { DifficultyLabel } from "@/components/problems/difficulty";
import type { Difficulty } from "@/db/schema";
import { cn } from "@/lib/cn";

type Item = { problemId: number; slug: string; title: string; difficulty: Difficulty; patternId: number; solved: boolean; options: number[] };
type Pattern = { id: number; name: string; cue: string };
type Answer = { chosen: number; correct: boolean; ms: number };

export function DrillSession({ items, patterns }: { items: Item[]; patterns: Pattern[] }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const shownAt = useRef(0);
  const byId = new Map(patterns.map((p) => [p.id, p]));
  const item = items[index];
  const answer = answers[index];
  const finished = index >= items.length;

  useEffect(() => {
    shownAt.current = performance.now();
  }, [index]);

  const choose = useCallback(
    (patternId: number) => {
      if (!item || answer) return;
      const ms = Math.round(performance.now() - shownAt.current);
      const correct = patternId === item.patternId;
      setAnswers((a) => {
        const next = [...a];
        next[index] = { chosen: patternId, correct, ms };
        return next;
      });
      void submitDrill({ problemId: item.problemId, chosenPatternId: patternId, responseMs: ms });
    },
    [item, answer, index],
  );

  const next = useCallback(() => setIndex((i) => i + 1), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement).closest("input, textarea")) return;
      if (!finished && !answer && ["1", "2", "3", "4"].includes(e.key)) {
        const id = item.options[Number(e.key) - 1];
        if (id) choose(id);
      } else if (!finished && answer && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, answer, item, choose, next]);

  const score = answers.filter((a) => a?.correct).length;

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-[560px] flex-col items-center px-4 py-24 text-center">
        <h1 className="text-[22px] font-semibold tracking-tight">No drills left for now</h1>
        <p className="mt-2 text-[14px] text-ink-subtle">You have drilled every available problem in your unlocked patterns today. Solve something new to widen the pool.</p>
        <Button asChild variant="primary" className="mt-8">
          <Link href="/today">Back to Today</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 py-8 sm:px-8 sm:py-10">
      <div className="flex items-center justify-between text-[13px] text-ink-subtle">
        <Link href="/today" className="inline-flex items-center gap-1 hover:text-ink">
          <CaretLeft size={13} aria-hidden /> Today
        </Link>
        <span className="font-mono text-[12px] tabular">
          {Math.min(index + 1, items.length)}/{items.length}
        </span>
      </div>
      <div className="mt-4 flex gap-1" aria-hidden>
        {items.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-0.5 flex-1 rounded-full transition-colors duration-300",
              answers[i] ? (answers[i].correct ? "bg-accent" : "bg-risk") : i === index ? "bg-ink-faint" : "bg-line",
            )}
          />
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {!finished ? (
          <motion.section
            key={item.problemId}
            initial={reduce ? false : { opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -12 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10"
            aria-labelledby="drill-title"
          >
            <p className="text-[13px] text-ink-subtle">Which pattern would you reach for?</p>
            <h1 id="drill-title" className="mt-2 text-[26px] font-semibold tracking-[-0.025em] text-ink">
              {item.title}
            </h1>
            <div className="mt-2 flex items-center gap-3 text-[12px]">
              <DifficultyLabel difficulty={item.difficulty} />
              <span className="text-ink-subtle">{item.solved ? "You have solved this" : "New to you"}</span>
              <a href={`https://leetcode.com/problems/${item.slug}/`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent-text hover:underline">
                Read the statement <ArrowUpRight size={11} aria-hidden />
              </a>
            </div>

            <div className="mt-8 grid gap-2" role="group" aria-label="Patterns">
              {item.options.map((id, i) => {
                const p = byId.get(id)!;
                const isCorrect = id === item.patternId;
                const isChosen = answer?.chosen === id;
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={Boolean(answer)}
                    onClick={() => choose(id)}
                    className={cn(
                      "flex h-12 items-center gap-3 rounded-lg border bg-surface-1 px-4 text-left text-[14px] transition-[border-color,background-color,opacity] duration-150",
                      !answer && "border-line hover:border-line-strong hover:bg-surface-2",
                      answer && isCorrect && "border-strong/60 bg-strong/10",
                      answer && isChosen && !isCorrect && "border-risk/60 bg-risk/10",
                      answer && !isCorrect && !isChosen && "border-line opacity-50",
                    )}
                  >
                    <Kbd>{i + 1}</Kbd>
                    <span className="flex-1 text-ink">{p.name}</span>
                    {answer && isCorrect ? <Check size={16} weight="bold" className="text-strong" aria-label="Correct answer" /> : null}
                    {answer && isChosen && !isCorrect ? <X size={16} weight="bold" className="text-risk" aria-label="Your answer" /> : null}
                  </button>
                );
              })}
            </div>

            <div aria-live="polite">
              {answer ? (
                <div className="mt-6 rounded-lg border border-line bg-surface-1 p-4">
                  <p className="text-[13px] font-medium text-ink">
                    {answer.correct ? `Right, in ${(answer.ms / 1000).toFixed(1)}s.` : `It is ${byId.get(item.patternId)?.name}.`}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-subtle">Cue: {byId.get(item.patternId)?.cue}</p>
                  <div className="mt-4 flex items-center gap-3">
                    <Button variant="primary" size="sm" onClick={next} autoFocus>
                      {index + 1 < items.length ? "Next" : "See Results"} <ArrowRight size={13} aria-hidden />
                    </Button>
                    <span className="hidden text-[12px] text-ink-subtle sm:inline">
                      <Kbd>↵</Kbd>
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-6 hidden text-[12px] text-ink-subtle sm:block">
                  Press <Kbd>1</Kbd> to <Kbd>4</Kbd>. Speed counts: a quick right answer strengthens the pattern more than a slow one.
                </p>
              )}
            </div>
          </motion.section>
        ) : (
          <motion.section key="done" initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-14 text-center" aria-live="polite">
            <p className="font-mono text-[44px] font-medium tracking-tight text-ink">
              {score}/{items.length}
            </p>
            <h1 className="mt-2 text-[20px] font-semibold tracking-tight">Round complete</h1>
            <p className="mx-auto mt-2 max-w-[44ch] text-[14px] text-ink-subtle">
              {score === items.length
                ? "Every pattern spotted. These patterns will come back less often now."
                : "The patterns you missed are scheduled to come back sooner, so the cue sticks."}
            </p>
            <div className="mt-8 flex justify-center gap-2">
              <Button variant="primary" onClick={() => router.refresh()}>
                Another Round
              </Button>
              <Button asChild variant="secondary">
                <Link href="/today">Back to Today</Link>
              </Button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
