"use client";

import { useState, useTransition } from "react";
import { CheckCircle, Copy } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import { startLeetCodeLink, syncLeetCode, unlinkLeetCode, verifyLeetCodeLink } from "@/actions/leetcode";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label } from "@/components/ui/field";

export function LeetCodeLink({ username, verified, token }: { username: string | null; verified: boolean; token: string | null }) {
  const [value, setValue] = useState(username ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (username && verified) {
    return (
      <div className="flex flex-col gap-4">
        <p className="flex items-center gap-2 text-[14px] text-ink">
          <CheckCircle size={16} weight="fill" className="text-strong" aria-hidden />
          Linked to <span className="font-mono">{username}</span>
        </p>
        <Hint>Your recent accepted submissions appear on Today as suggestions. Nothing is logged without your click.</Hint>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await syncLeetCode(true);
                if (res.ok) toast.success(res.added ? `Found ${res.added} new accepted submissions.` : "Up to date.");
                else toast.error(res.error);
              })
            }
          >
            {pending ? "Syncing…" : "Sync Now"}
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => start(async () => void (await unlinkLeetCode()))}>
            Unlink
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          start(async () => {
            const res = await startLeetCodeLink(value);
            if (!res.ok) setError(res.error);
          });
        }}
      >
        <Label htmlFor="lc-username">LeetCode username</Label>
        <div className="flex gap-2">
          <Input
            id="lc-username"
            name="leetcode-username"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. neal_wu…"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "lc-error" : undefined}
            className="max-w-xs"
          />
          <Button type="submit" variant="secondary" disabled={pending || !value.trim()}>
            {token && username === value.trim() ? "New Token" : "Continue"}
          </Button>
        </div>
        {error ? (
          <p id="lc-error" className="text-[12px] text-risk">
            {error}
          </p>
        ) : null}
      </form>

      {token && username ? (
        <div className="rounded-lg border border-line bg-surface-2 p-4">
          <p className="text-[13px] text-ink-muted">
            To prove the account is yours, paste this token anywhere in your{" "}
            <a href="https://leetcode.com/profile/" target="_blank" rel="noreferrer" className="text-accent-text hover:underline">
              LeetCode profile summary
            </a>
            , save, then verify. You can remove it afterwards.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="rounded-md border border-line bg-surface-1 px-2.5 py-1.5 font-mono text-[13px] text-ink" translate="no">
              {token}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Copy token"
              onClick={() => {
                void navigator.clipboard.writeText(token);
                toast.success("Token copied.");
              }}
            >
              <Copy size={15} aria-hidden />
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="ml-auto"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await verifyLeetCodeLink();
                  if (res.ok) toast.success("LeetCode linked.");
                  else toast.error(res.error);
                })
              }
            >
              {pending ? "Checking…" : "Verify"}
            </Button>
          </div>
        </div>
      ) : (
        <Hint>Optional. Only public data is read: your last 20 accepted submissions.</Hint>
      )}
    </div>
  );
}
