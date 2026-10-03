CREATE TYPE "public"."difficulty" AS ENUM('EASY', 'MEDIUM', 'HARD');--> statement-breakpoint
CREATE TYPE "public"."review_source" AS ENUM('first_solve', 'review', 'sync');--> statement-breakpoint
CREATE TYPE "public"."sheet_kind" AS ENUM('curated', 'company');--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"problem_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "companies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "company_problems" (
	"company_id" integer NOT NULL,
	"problem_id" integer NOT NULL,
	"frequency" real NOT NULL,
	CONSTRAINT "company_problems_company_id_problem_id_pk" PRIMARY KEY("company_id","problem_id")
);
--> statement-breakpoint
CREATE TABLE "daily_activity" (
	"user_id" text NOT NULL,
	"day" date NOT NULL,
	"solves" integer DEFAULT 0 NOT NULL,
	"reviews" integer DEFAULT 0 NOT NULL,
	"drills" integer DEFAULT 0 NOT NULL,
	"seconds" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "daily_activity_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
CREATE TABLE "drill_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"problem_id" integer NOT NULL,
	"pattern_id" integer NOT NULL,
	"chosen_pattern_id" integer,
	"correct" boolean NOT NULL,
	"rating" smallint NOT NULL,
	"response_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leetcode_submissions" (
	"user_id" text NOT NULL,
	"submission_id" text NOT NULL,
	"title_slug" text NOT NULL,
	"title" text NOT NULL,
	"submitted_at" timestamp with time zone NOT NULL,
	"dismissed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "leetcode_submissions_user_id_submission_id_pk" PRIMARY KEY("user_id","submission_id")
);
--> statement-breakpoint
CREATE TABLE "patterns" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"blurb" text NOT NULL,
	"cue" text NOT NULL,
	"position" integer NOT NULL,
	"prereqs" text[] DEFAULT '{}'::text[] NOT NULL,
	"neighbors" text[] DEFAULT '{}'::text[] NOT NULL,
	CONSTRAINT "patterns_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "problems" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"difficulty" "difficulty" NOT NULL,
	"url" text NOT NULL,
	"acceptance_rate" real,
	"topics" text[] DEFAULT '{}'::text[] NOT NULL,
	"pattern_id" integer,
	"pattern_curated" boolean DEFAULT false NOT NULL,
	"company_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "problems_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "review_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"problem_id" integer NOT NULL,
	"rating" smallint NOT NULL,
	"state" smallint NOT NULL,
	"due" timestamp with time zone NOT NULL,
	"stability" double precision NOT NULL,
	"difficulty" double precision NOT NULL,
	"elapsed_days" integer NOT NULL,
	"last_elapsed_days" integer NOT NULL,
	"scheduled_days" integer NOT NULL,
	"learning_steps" integer DEFAULT 0 NOT NULL,
	"review" timestamp with time zone NOT NULL,
	"retrievability" real,
	"source" "review_source" NOT NULL,
	"suggested_rating" smallint,
	"time_taken_sec" integer,
	"hint_used" boolean,
	"viewed_solution" boolean,
	"wrong_submissions" smallint,
	"pattern_correct" boolean
);
--> statement-breakpoint
CREATE TABLE "sheet_problems" (
	"sheet_id" integer NOT NULL,
	"problem_id" integer NOT NULL,
	"position" integer NOT NULL,
	"section" text NOT NULL,
	CONSTRAINT "sheet_problems_sheet_id_problem_id_pk" PRIMARY KEY("sheet_id","problem_id")
);
--> statement-breakpoint
CREATE TABLE "sheets" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"kind" "sheet_kind" DEFAULT 'curated' NOT NULL,
	CONSTRAINT "sheets_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_patterns" (
	"user_id" text NOT NULL,
	"pattern_id" integer NOT NULL,
	"due" timestamp with time zone NOT NULL,
	"stability" double precision NOT NULL,
	"difficulty" double precision NOT NULL,
	"elapsed_days" integer DEFAULT 0 NOT NULL,
	"scheduled_days" integer DEFAULT 0 NOT NULL,
	"learning_steps" integer DEFAULT 0 NOT NULL,
	"reps" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"state" smallint DEFAULT 0 NOT NULL,
	"last_review" timestamp with time zone,
	CONSTRAINT "user_patterns_user_id_pattern_id_pk" PRIMARY KEY("user_id","pattern_id")
);
--> statement-breakpoint
CREATE TABLE "user_problems" (
	"user_id" text NOT NULL,
	"problem_id" integer NOT NULL,
	"solved_at" timestamp with time zone NOT NULL,
	"insight" text,
	"notes" text,
	"starred" boolean DEFAULT false NOT NULL,
	"due" timestamp with time zone NOT NULL,
	"stability" double precision NOT NULL,
	"difficulty" double precision NOT NULL,
	"elapsed_days" integer DEFAULT 0 NOT NULL,
	"scheduled_days" integer DEFAULT 0 NOT NULL,
	"learning_steps" integer DEFAULT 0 NOT NULL,
	"reps" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"state" smallint DEFAULT 0 NOT NULL,
	"last_review" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_problems_user_id_problem_id_pk" PRIMARY KEY("user_id","problem_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"name" text,
	"image_url" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"timezone_locked" boolean DEFAULT false NOT NULL,
	"desired_retention" real DEFAULT 0.9 NOT NULL,
	"daily_minutes" integer DEFAULT 45 NOT NULL,
	"new_per_day" integer DEFAULT 3 NOT NULL,
	"active_sheet_slug" text DEFAULT 'neetcode-150' NOT NULL,
	"email_reminders" boolean DEFAULT true NOT NULL,
	"reminder_hour" smallint DEFAULT 19 NOT NULL,
	"last_reminder_sent_on" date,
	"leetcode_username" text,
	"leetcode_verified" boolean DEFAULT false NOT NULL,
	"leetcode_verify_token" text,
	"leetcode_synced_at" timestamp with time zone,
	"streak_current" integer DEFAULT 0 NOT NULL,
	"streak_best" integer DEFAULT 0 NOT NULL,
	"streak_freezes" integer DEFAULT 0 NOT NULL,
	"last_active_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_problems" ADD CONSTRAINT "company_problems_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_problems" ADD CONSTRAINT "company_problems_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_activity" ADD CONSTRAINT "daily_activity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drill_logs" ADD CONSTRAINT "drill_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drill_logs" ADD CONSTRAINT "drill_logs_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drill_logs" ADD CONSTRAINT "drill_logs_pattern_id_patterns_id_fk" FOREIGN KEY ("pattern_id") REFERENCES "public"."patterns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drill_logs" ADD CONSTRAINT "drill_logs_chosen_pattern_id_patterns_id_fk" FOREIGN KEY ("chosen_pattern_id") REFERENCES "public"."patterns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leetcode_submissions" ADD CONSTRAINT "leetcode_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problems" ADD CONSTRAINT "problems_pattern_id_patterns_id_fk" FOREIGN KEY ("pattern_id") REFERENCES "public"."patterns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sheet_problems" ADD CONSTRAINT "sheet_problems_sheet_id_sheets_id_fk" FOREIGN KEY ("sheet_id") REFERENCES "public"."sheets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sheet_problems" ADD CONSTRAINT "sheet_problems_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_patterns" ADD CONSTRAINT "user_patterns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_patterns" ADD CONSTRAINT "user_patterns_pattern_id_patterns_id_fk" FOREIGN KEY ("pattern_id") REFERENCES "public"."patterns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_problems" ADD CONSTRAINT "user_problems_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_problems" ADD CONSTRAINT "user_problems_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_problems_problem_idx" ON "company_problems" USING btree ("problem_id");--> statement-breakpoint
CREATE INDEX "drill_logs_user_idx" ON "drill_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "leetcode_submissions_user_slug_time" ON "leetcode_submissions" USING btree ("user_id","title_slug","submitted_at");--> statement-breakpoint
CREATE INDEX "problems_pattern_idx" ON "problems" USING btree ("pattern_id");--> statement-breakpoint
CREATE INDEX "review_logs_user_review_idx" ON "review_logs" USING btree ("user_id","review");--> statement-breakpoint
CREATE INDEX "review_logs_user_problem_idx" ON "review_logs" USING btree ("user_id","problem_id");--> statement-breakpoint
CREATE INDEX "user_problems_due_idx" ON "user_problems" USING btree ("user_id","due");