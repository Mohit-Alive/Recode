"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { LinkSimple } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import { addCustomItems, type AddLinksResult } from "@/actions/custom-sheets";
import { FIRST_SOLVE_OPTIONS } from "@/components/problems/solve-check";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { Kbd } from "@/components/ui/kbd";
import type { Difficulty } from "@/db/schema";
import type { Grade } from "@/lib/srs/fsrs";
import { extractLinks, parseProblemLink } from "@/lib/links/problem-link";
import { formatDayDelta } from "@/lib/format";
import { cn } from "@/lib/cn";

const DIFFICULTY_OPTIONS: { value: Difficulty | null; label: string; hint: string }[] = [
  { value: null, label: "Auto", hint: "Known problems fill this in; others count as Medium" },
  { value: "EASY", label: "Easy", hint: "Easy" },
  { value: "MEDIUM", label: "Medium", hint: "Medium" },
  { value: "HARD", label: "Hard", hint: "Hard" },
];

const noop = () => () => {};

function summary(res: Extract<AddLinksResult, { ok: true }>): string {
  const parts: string[] = [];
  const when = res.days === null ? "" : ` ${res.added + res.reviewed === 1 ? "Next" : "First"} review ${formatDayDelta(Math.max(1, res.days))}.`;
  if (res.added === 1 && res.reviewed === 0) parts.push(`Added ${res.firstTitle}.${when}`);
  else if (res.reviewed === 1 && res.added === 0) parts.push(`Logged ${res.firstTitle} as a re-solve.${when}`);
  else {
    if (res.added) parts.push(`Added ${res.added} ${res.added === 1 ? "problem" : "problems"}.`);
    if (res.reviewed) parts.push(`Logged ${res.reviewed} as ${res.reviewed === 1 ? "a re-solve" : "re-solves"}.`);
  }
  if (res.skipped) parts.push(`${res.skipped} already logged today.`);
  if (res.invalid) parts.push(`${res.invalid} ${res.invalid === 1 ? "link was" : "links were"} not recognised.`);
  return parts.join(" ");
}

/**
 * Paste the links of problems solved today. Each one becomes a memory in this sheet only, rated by
 * how the solve went; pasting a link that is already here logs a re-solve instead.
 */
export function AddLinksForm({ sheetId, className }: { sheetId: number; className?: string }) {
  const [text, setText] = useState("");
  const [grade, setGrade] = useState<Grade>(3);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [insight, setInsight] = useState("");
  const [pending, start] = useTransition();
  const isMac = useSyncExternalStore(
    noop,
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => false,
  );

  const preview = useMemo(() => {
    const raw = extractLinks(text);
    const seen = new Set<string>();
    const links = [];
    for (const r of raw) {
      const link = parseProblemLink(r);
      if (link && !seen.has(link.url)) {
        seen.add(link.url);
        links.push(link);
      }
    }
    return { links, invalid: raw.filter((r) => !parseProblemLink(r)).length, words: text.trim().length > 0 && raw.length === 0 };
  }, [text]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (pending || preview.links.length === 0) return;
    start(async () => {
      const res = await addCustomItems({
        sheetId,
        text,
        grade,
        difficulty,
        insight: preview.links.length === 1 ? insight : undefined,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.added + res.reviewed === 0) toast(summary(res));
      else toast.success(summary(res));
      setText("");
      setInsight("");
    });
  }

  return (
    <form onSubmit={submit} aria-labelledby="add-links" className={cn("rounded-xl border border-line bg-surface-1 p-5 hairline-top", className)}>
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-accent-text">
          <LinkSimple size={16} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id="add-links" className="text-[15px] font-semibold tracking-tight">
            Log what you solved
          </h2>
          <p className="mt-0.5 text-[13px] text-ink-subtle">Paste a problem link from any site. Several at once work too, one per line.</p>
        </div>
      </div>

      <label htmlFor={`links-${sheetId}`} className="sr-only">
        Problem links
      </label>
      <Textarea
        id={`links-${sheetId}`}
        name="links"
        autoComplete="off"
        spellCheck={false}
        inputMode="url"
        rows={preview.links.length > 1 ? 4 : 2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
        }}
        placeholder="https://…/problems/two-sum"
        className="mt-4 font-mono text-[13px]"
      />

      {preview.links.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Problems to add">
          {preview.links.slice(0, 12).map((l) => (
            <li key={l.url} className="max-w-full truncate rounded-md border border-line bg-surface-2 px-2 py-0.5 text-[12px] text-ink-muted" title={l.url}>
              {l.title}
            </li>
          ))}
          {preview.links.length > 12 ? <li className="px-1 py-0.5 text-[12px] text-ink-subtle">+{preview.links.length - 12} more</li> : null}
        </ul>
      ) : null}
      {preview.invalid > 0 || preview.words ? (
        <p className="mt-2 text-[12px] text-ink-subtle">
          {preview.words ? "Paste a full link to a problem page." : `${preview.invalid} ${preview.invalid === 1 ? "link does" : "links do"} not look like a problem page and will be skipped.`}
        </p>
      ) : null}

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <fieldset>
          <legend className="text-[13px] font-medium text-ink-muted">How did it go?</legend>
          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4" role="radiogroup" aria-label="How the solve went">
            {FIRST_SOLVE_OPTIONS.map((o) => (
              <Chip key={o.grade} checked={grade === o.grade} onSelect={() => setGrade(o.grade)} title={o.hint}>
                {o.label}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-[13px] font-medium text-ink-muted">Difficulty</legend>
          <div className="mt-2 grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Difficulty">
            {DIFFICULTY_OPTIONS.map((o) => (
              <Chip key={o.label} checked={difficulty === o.value} onSelect={() => setDifficulty(o.value)} title={o.hint}>
                {o.label}
              </Chip>
            ))}
          </div>
        </fieldset>
      </div>

      {preview.links.length === 1 ? (
        <div className="mt-5">
          <label htmlFor={`insight-${sheetId}`} className="text-[13px] font-medium text-ink-muted">
            Key insight <span className="font-normal text-ink-subtle">(optional)</span>
          </label>
          <Input
            id={`insight-${sheetId}`}
            name="insight"
            autoComplete="off"
            maxLength={280}
            value={insight}
            onChange={(e) => setInsight(e.target.value)}
            placeholder="One line you would tell yourself next time…"
            className="mt-2"
          />
        </div>
      ) : null}

      <div className="mt-5 flex items-center justify-end gap-3">
        <span className="hidden text-[12px] text-ink-subtle sm:inline">
          <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>&nbsp;<Kbd>↵</Kbd> to add
        </span>
        <Button type="submit" variant="primary" disabled={pending || preview.links.length === 0}>
          {preview.links.length > 1 ? `Add ${preview.links.length} Problems` : "Add to Sheet"}
        </Button>
      </div>
    </form>
  );
}

function Chip({ checked, onSelect, title, children }: { checked: boolean; onSelect: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      title={title}
      onClick={onSelect}
      className={cn(
        "h-9 rounded-md border px-2 text-[12.5px] transition-colors",
        checked ? "border-accent bg-surface-2 text-ink" : "border-line text-ink-subtle hover:border-line-strong hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
