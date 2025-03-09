ALTER TABLE "sessions" ADD COLUMN "token_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "token_updated_at";