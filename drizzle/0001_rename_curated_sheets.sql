ALTER TABLE "users" ALTER COLUMN "active_sheet_slug" SET DEFAULT 'roadmap-150';--> statement-breakpoint
-- Rename the curated sheets in place so sheet ids, sheet_problems and users' choices survive.
-- The seed upserts by slug, so this must run before the next `pnpm db:seed`.
UPDATE "sheets" SET "slug" = 'roadmap-150', "name" = 'Roadmap 150', "description" = '150 problems ordered along the pattern roadmap, one pattern at a time.' WHERE "slug" = 'neetcode-150';--> statement-breakpoint
UPDATE "sheets" SET "slug" = 'essentials-75', "name" = 'Essentials 75', "description" = '75 must-know interview problems, grouped by data structure.' WHERE "slug" = 'blind-75';--> statement-breakpoint
UPDATE "users" SET "active_sheet_slug" = 'roadmap-150' WHERE "active_sheet_slug" = 'neetcode-150';--> statement-breakpoint
UPDATE "users" SET "active_sheet_slug" = 'essentials-75' WHERE "active_sheet_slug" = 'blind-75';
