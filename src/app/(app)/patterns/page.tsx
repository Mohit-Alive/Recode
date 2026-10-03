import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Roadmap } from "@/components/patterns/roadmap";
import { requireUser } from "@/server/auth";
import { getNow } from "@/server/clock";
import { getPatternOverview } from "@/server/queries";
import { formatPercent } from "@/lib/format";
import { MEMORY_LABEL, memoryLevel } from "@/lib/srs/mastery";

export const metadata = { title: "Patterns" };

export default async function PatternsPage() {
  const user = await requireUser();
  const now = await getNow();
  const patterns = await getPatternOverview(user, now);
  const next = patterns.find((p) => p.status === "ready");
  const weakest = patterns
    .filter((p) => p.retention !== null)
    .sort((a, b) => (a.retention ?? 1) - (b.retention ?? 1))[0];

  return (
    <PageContainer className="max-w-[1180px]">
      <PageHeader
        title="Patterns"
        description="Eighteen patterns cover almost every interview problem. Your memory of each one is the weighted recall of everything you have solved in it, with Hard problems counting double."
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Callout label="Learn next">
          {next ? (
            <>
              <span className="text-ink">{next.name}</span>. Its prerequisites are started, so this is the next topic on the roadmap.
            </>
          ) : (
            "Every pattern is started. Keep reviews flowing."
          )}
        </Callout>
        <Callout label="Weakest memory">
          {weakest ? (
            <>
              <span className="text-ink">{weakest.name}</span> at {formatPercent(weakest.retention ?? 0)} recall
              {weakest.atRisk > 0 ? `, ${weakest.atRisk} ${weakest.atRisk === 1 ? "problem" : "problems"} at risk` : ""}.
            </>
          ) : (
            "Solve a few problems to see where memory is weakest."
          )}
        </Callout>
      </div>

      <section aria-labelledby="roadmap" className="mt-10">
        <h2 id="roadmap" className="sr-only">
          Roadmap
        </h2>
        <Roadmap
          nodes={patterns.map((p) => ({
            slug: p.slug,
            name: p.name,
            prereqs: p.prereqs,
            status: p.status,
            solved: p.solved,
            total: p.total,
            retention: p.retention,
            atRisk: p.atRisk,
          }))}
        />
      </section>

      <section aria-labelledby="table" className="mt-14">
        <h2 id="table" className="text-[15px] font-semibold tracking-tight">
          Detail
        </h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="bg-surface-1 text-[12px] text-ink-subtle">
              <tr className="border-b border-line">
                <th className="px-4 py-2.5 font-normal">Pattern</th>
                <th className="px-4 py-2.5 font-normal">Recognition cue</th>
                <th className="px-4 py-2.5 text-right font-normal">Solved</th>
                <th className="px-4 py-2.5 text-right font-normal">Recall</th>
                <th className="px-4 py-2.5 text-right font-normal">Spotting</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {patterns.map((p) => (
                <tr key={p.slug}>
                  <td className="px-4 py-3 align-top font-medium whitespace-nowrap text-ink">{p.name}</td>
                  <td className="max-w-[46ch] px-4 py-3 align-top text-ink-subtle">{p.cue}</td>
                  <td className="px-4 py-3 text-right align-top font-mono text-ink-muted tabular">
                    {p.solved}/{p.total}
                  </td>
                  <td className="px-4 py-3 text-right align-top font-mono whitespace-nowrap text-ink-muted tabular">
                    {p.retention === null ? "-" : `${formatPercent(p.retention)}`}
                    <span className="ml-1.5 font-sans text-[11px] text-ink-subtle">{p.retention === null ? "" : MEMORY_LABEL[memoryLevel(p.retention)]}</span>
                  </td>
                  <td className="px-4 py-3 text-right align-top font-mono text-ink-muted tabular" title="Pattern recognition recall, trained by drills">
                    {p.recognition === null ? "-" : formatPercent(p.recognition)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PageContainer>
  );
}

function Callout({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface-1 px-4 py-3.5">
      <p className="text-[12px] text-ink-subtle">{label}</p>
      <p className="mt-1 text-[14px] leading-relaxed text-ink-muted">{children}</p>
    </div>
  );
}
