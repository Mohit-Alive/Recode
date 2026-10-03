import { DIFFICULTY_LABEL, formatPercent } from "@/lib/format";
import type { Difficulty } from "@/db/schema";

type Item = { title: string; difficulty: Difficulty; r: number };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Plain, table-based HTML that renders in every mail client. */
export function dailyDigest({ name, due, items, streak, appUrl }: { name: string | null; due: number; items: Item[]; streak: number; appUrl: string }) {
  const subject = due === 1 ? "1 problem is fading" : `${due} problems are fading`;
  const rows = items
    .map(
      (i) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #e6e7ea;font-size:14px;color:#0e0f10">${esc(i.title)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #e6e7ea;font-size:12px;color:#63676e;text-align:right;white-space:nowrap">${DIFFICULTY_LABEL[i.difficulty]} &middot; ${formatPercent(i.r)} recall</td>
      </tr>`,
    )
    .join("");
  const html = `<!doctype html><html><body style="margin:0;background:#fbfbfc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbfbfc;padding:32px 16px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e6e7ea;border-radius:12px;padding:28px">
      <tr><td style="font-size:13px;color:#63676e">Recode${streak > 1 ? ` &middot; ${streak} day streak` : ""}</td></tr>
      <tr><td style="padding-top:8px;font-size:22px;font-weight:600;letter-spacing:-0.02em;color:#0e0f10">${esc(subject)}</td></tr>
      <tr><td style="padding-top:8px;font-size:14px;line-height:1.6;color:#3c3f45">${name ? `${esc(name)}, these` : "These"} are about to drop below your recall target. Re-solving them today keeps them for weeks.</td></tr>
      <tr><td style="padding-top:16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
      <tr><td style="padding-top:24px"><a href="${appUrl}/review" style="display:inline-block;background:#5e6ad2;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;padding:10px 16px;border-radius:8px">Start Reviews</a></td></tr>
      <tr><td style="padding-top:24px;font-size:12px;color:#9a9ea6">You get this only on days with reviews due. <a href="${appUrl}/settings" style="color:#63676e">Change reminder settings</a>.</td></tr>
    </table>
  </td></tr></table></body></html>`;
  const text = `${subject}\n\n${items.map((i) => `- ${i.title} (${DIFFICULTY_LABEL[i.difficulty]}, ${formatPercent(i.r)} recall)`).join("\n")}\n\nStart reviews: ${appUrl}/review\nSettings: ${appUrl}/settings`;
  return { subject, html, text };
}
