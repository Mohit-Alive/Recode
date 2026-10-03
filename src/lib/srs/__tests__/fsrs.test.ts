import { describe, expect, it } from "vitest";
import { Rating } from "ts-fsrs";
import { curve, fromCard, previewIntervals, retrievability, schedule, toCard } from "../fsrs";

const now = new Date("2026-10-03T10:00:00Z");

describe("fsrs adapter", () => {
  it("round-trips every card field through the DB row shape", () => {
    const { card } = schedule(null, now, Rating.Good);
    expect(fromCard(toCard(card))).toEqual(card);
  });

  it("schedules a first Good solve days out, never minutes", () => {
    const { card, log } = schedule(null, now, Rating.Good);
    const days = (card.due.getTime() - now.getTime()) / 86_400_000;
    expect(days).toBeGreaterThanOrEqual(1);
    expect(log.rating).toBe(Rating.Good);
  });

  it("grows the interval after a successful review", () => {
    const first = schedule(null, now, Rating.Good).card;
    const later = first.due;
    const second = schedule(first, later, Rating.Good).card;
    expect(second.scheduledDays).toBeGreaterThan(first.scheduledDays);
    expect(second.stability).toBeGreaterThan(first.stability);
  });

  it("shrinks stability after a lapse", () => {
    const first = schedule(null, now, Rating.Good).card;
    const second = schedule(first, first.due, Rating.Good).card;
    const lapse = schedule(second, second.due, Rating.Again).card;
    expect(lapse.stability).toBeLessThan(second.stability);
    expect(lapse.lapses).toBe(1);
  });

  it("orders preview intervals Again <= Hard <= Good <= Easy", () => {
    const card = schedule(null, now, Rating.Good).card;
    const p = previewIntervals(card, card.due);
    expect(p[Rating.Again]).toBeLessThanOrEqual(p[Rating.Hard]);
    expect(p[Rating.Hard]).toBeLessThanOrEqual(p[Rating.Good]);
    expect(p[Rating.Good]).toBeLessThanOrEqual(p[Rating.Easy]);
  });

  it("retrievability decays over time and sits near the target at the due date", () => {
    const card = schedule(null, now, Rating.Good).card;
    const r0 = retrievability(card, now);
    const rDue = retrievability(card, card.due);
    const rLate = retrievability(card, new Date(card.due.getTime() + 30 * 86_400_000));
    expect(r0).toBeCloseTo(1, 2);
    expect(rDue).toBeGreaterThan(0.8);
    expect(rDue).toBeLessThan(0.97);
    expect(rLate).toBeLessThan(rDue);
  });

  it("forgetting curve is 0.9 at t = stability", () => {
    expect(curve(10, 10)).toBeCloseTo(0.9, 2);
    expect(curve(10, 0)).toBeCloseTo(1, 5);
  });

  it("new cards have zero retrievability", () => {
    expect(retrievability({ ...schedule(null, now, Rating.Good).card, state: 0, lastReview: null }, now)).toBe(0);
  });
});

import { memoryCurve } from "../history";

describe("memoryCurve", () => {
  it("restores recall to 100% at each review and decays in between", () => {
    const t0 = new Date("2026-09-01T10:00:00Z");
    const first = schedule(null, t0, Rating.Good);
    const second = schedule(first.card, first.card.due, Rating.Good);
    const logs = [
      { review: t0, rating: 3, stability: first.log.stability, retrievability: null },
      { review: first.card.due, rating: 3, stability: second.log.stability, retrievability: 0.9 },
    ];
    const { points, reviews } = memoryCurve(logs, second.card, new Date("2026-10-01T10:00:00Z"));
    expect(reviews).toHaveLength(2);
    expect(points[0].r).toBeCloseTo(1, 3);
    const atReview = points.filter((p) => p.t === first.card.due.getTime());
    expect(atReview.map((p) => p.r)).toContain(1);
    expect(Math.min(...atReview.map((p) => p.r))).toBeLessThan(0.95);
    for (let i = 1; i < points.length; i++) expect(points[i].t).toBeGreaterThanOrEqual(points[i - 1].t);
  });
});
