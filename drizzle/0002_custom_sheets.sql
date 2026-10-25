CREATE TABLE "custom_review_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"user_id" text NOT NULL,
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
	"wrong_submissions" smallint
);
--> statement-breakpoint
CREATE TABLE "custom_sheet_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"sheet_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"level" "difficulty" DEFAULT 'MEDIUM' NOT NULL,
	"problem_id" integer,
	"solved_at" timestamp with time zone NOT NULL,
	"insight" text,
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_sheets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"desired_retention" real DEFAULT 0.9 NOT NULL,
	"max_interval" integer DEFAULT 365 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "custom_review_logs" ADD CONSTRAINT "custom_review_logs_item_id_custom_sheet_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."custom_sheet_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_review_logs" ADD CONSTRAINT "custom_review_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_sheet_items" ADD CONSTRAINT "custom_sheet_items_sheet_id_custom_sheets_id_fk" FOREIGN KEY ("sheet_id") REFERENCES "public"."custom_sheets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_sheet_items" ADD CONSTRAINT "custom_sheet_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_sheet_items" ADD CONSTRAINT "custom_sheet_items_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_sheets" ADD CONSTRAINT "custom_sheets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "custom_review_logs_item_idx" ON "custom_review_logs" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "custom_review_logs_user_review_idx" ON "custom_review_logs" USING btree ("user_id","review");--> statement-breakpoint
CREATE UNIQUE INDEX "custom_sheet_items_sheet_url" ON "custom_sheet_items" USING btree ("sheet_id","url");--> statement-breakpoint
CREATE INDEX "custom_sheet_items_user_due_idx" ON "custom_sheet_items" USING btree ("user_id","due");--> statement-breakpoint
CREATE INDEX "custom_sheets_user_idx" ON "custom_sheets" USING btree ("user_id");