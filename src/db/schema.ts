import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const difficultyEnum = pgEnum("difficulty", ["EASY", "MEDIUM", "HARD"]);
export const sheetKindEnum = pgEnum("sheet_kind", ["curated", "company"]);
export const reviewSourceEnum = pgEnum("review_source", ["first_solve", "review", "sync"]);

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

/** FSRS card columns shared by problem cards and pattern cards (mirrors ts-fsrs `Card`). */
const fsrsColumns = () => ({
  due: ts("due").notNull(),
  stability: doublePrecision("stability").notNull(),
  difficulty: doublePrecision("difficulty").notNull(),
  elapsedDays: integer("elapsed_days").notNull().default(0),
  scheduledDays: integer("scheduled_days").notNull().default(0),
  learningSteps: integer("learning_steps").notNull().default(0),
  reps: integer("reps").notNull().default(0),
  lapses: integer("lapses").notNull().default(0),
  state: smallint("state").notNull().default(0),
  lastReview: ts("last_review"),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user id
  email: text("email"),
  name: text("name"),
  imageUrl: text("image_url"),
  timezone: text("timezone").notNull().default("UTC"),
  timezoneLocked: boolean("timezone_locked").notNull().default(false),
  desiredRetention: real("desired_retention").notNull().default(0.9),
  dailyMinutes: integer("daily_minutes").notNull().default(45),
  newPerDay: integer("new_per_day").notNull().default(3),
  activeSheetSlug: text("active_sheet_slug").notNull().default("roadmap-150"),
  emailReminders: boolean("email_reminders").notNull().default(true),
  reminderHour: smallint("reminder_hour").notNull().default(19),
  lastReminderSentOn: date("last_reminder_sent_on"),
  leetcodeUsername: text("leetcode_username"),
  leetcodeVerified: boolean("leetcode_verified").notNull().default(false),
  leetcodeVerifyToken: text("leetcode_verify_token"),
  leetcodeSyncedAt: ts("leetcode_synced_at"),
  streakCurrent: integer("streak_current").notNull().default(0),
  streakBest: integer("streak_best").notNull().default(0),
  streakFreezes: integer("streak_freezes").notNull().default(0),
  lastActiveOn: date("last_active_on"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const patterns = pgTable("patterns", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  blurb: text("blurb").notNull(),
  cue: text("cue").notNull(),
  position: integer("position").notNull(),
  prereqs: text("prereqs").array().notNull().default(sql`'{}'::text[]`),
  neighbors: text("neighbors").array().notNull().default(sql`'{}'::text[]`),
});

export const problems = pgTable(
  "problems",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    difficulty: difficultyEnum("difficulty").notNull(),
    url: text("url").notNull(),
    acceptanceRate: real("acceptance_rate"),
    topics: text("topics").array().notNull().default(sql`'{}'::text[]`),
    patternId: integer("pattern_id").references(() => patterns.id),
    /** true when the pattern comes from a hand-curated sheet (safe to use in drills). */
    patternCurated: boolean("pattern_curated").notNull().default(false),
    companyCount: integer("company_count").notNull().default(0),
  },
  (t) => [index("problems_pattern_idx").on(t.patternId)],
);

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  problemCount: integer("problem_count").notNull().default(0),
});

export const companyProblems = pgTable(
  "company_problems",
  {
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    problemId: integer("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    frequency: real("frequency").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.companyId, t.problemId] }),
    index("company_problems_problem_idx").on(t.problemId),
  ],
);

export const sheets = pgTable("sheets", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  position: integer("position").notNull().default(0),
  kind: sheetKindEnum("kind").notNull().default("curated"),
});

export const sheetProblems = pgTable(
  "sheet_problems",
  {
    sheetId: integer("sheet_id")
      .notNull()
      .references(() => sheets.id, { onDelete: "cascade" }),
    problemId: integer("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    section: text("section").notNull(),
  },
  (t) => [primaryKey({ columns: [t.sheetId, t.problemId] })],
);

/** One FSRS memory card per (user, problem), created on first solve. */
export const userProblems = pgTable(
  "user_problems",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    problemId: integer("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    solvedAt: ts("solved_at").notNull(),
    insight: text("insight"),
    notes: text("notes"),
    starred: boolean("starred").notNull().default(false),
    ...fsrsColumns(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.problemId] }),
    index("user_problems_due_idx").on(t.userId, t.due),
  ],
);

export const reviewLogs = pgTable(
  "review_logs",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    problemId: integer("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    rating: smallint("rating").notNull(),
    state: smallint("state").notNull(),
    due: ts("due").notNull(),
    stability: doublePrecision("stability").notNull(),
    difficulty: doublePrecision("difficulty").notNull(),
    elapsedDays: integer("elapsed_days").notNull(),
    lastElapsedDays: integer("last_elapsed_days").notNull(),
    scheduledDays: integer("scheduled_days").notNull(),
    learningSteps: integer("learning_steps").notNull().default(0),
    review: ts("review").notNull(),
    /** Retrievability at the moment of review (null for first solves). */
    retrievability: real("retrievability"),
    source: reviewSourceEnum("source").notNull(),
    suggestedRating: smallint("suggested_rating"),
    timeTakenSec: integer("time_taken_sec"),
    hintUsed: boolean("hint_used"),
    viewedSolution: boolean("viewed_solution"),
    wrongSubmissions: smallint("wrong_submissions"),
    patternCorrect: boolean("pattern_correct"),
  },
  (t) => [
    index("review_logs_user_review_idx").on(t.userId, t.review),
    index("review_logs_user_problem_idx").on(t.userId, t.problemId),
  ],
);

/** Pattern-recognition memory per (user, pattern), trained by drills and reviews. */
export const userPatterns = pgTable(
  "user_patterns",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    patternId: integer("pattern_id")
      .notNull()
      .references(() => patterns.id, { onDelete: "cascade" }),
    ...fsrsColumns(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.patternId] })],
);

export const drillLogs = pgTable(
  "drill_logs",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    problemId: integer("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    patternId: integer("pattern_id")
      .notNull()
      .references(() => patterns.id),
    chosenPatternId: integer("chosen_pattern_id").references(() => patterns.id),
    correct: boolean("correct").notNull(),
    rating: smallint("rating").notNull(),
    responseMs: integer("response_ms"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("drill_logs_user_idx").on(t.userId, t.createdAt)],
);

export const dailyActivity = pgTable(
  "daily_activity",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    solves: integer("solves").notNull().default(0),
    reviews: integer("reviews").notNull().default(0),
    drills: integer("drills").notNull().default(0),
    seconds: integer("seconds").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
);

export const leetcodeSubmissions = pgTable(
  "leetcode_submissions",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    submissionId: text("submission_id").notNull(),
    titleSlug: text("title_slug").notNull(),
    title: text("title").notNull(),
    submittedAt: ts("submitted_at").notNull(),
    dismissed: boolean("dismissed").notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.submissionId] }),
    uniqueIndex("leetcode_submissions_user_slug_time").on(t.userId, t.titleSlug, t.submittedAt),
  ],
);

export type User = typeof users.$inferSelect;
export type Problem = typeof problems.$inferSelect;
export type Pattern = typeof patterns.$inferSelect;
export type UserProblem = typeof userProblems.$inferSelect;
export type ReviewLogRow = typeof reviewLogs.$inferSelect;
export type UserPattern = typeof userPatterns.$inferSelect;
export type Difficulty = (typeof difficultyEnum.enumValues)[number];
