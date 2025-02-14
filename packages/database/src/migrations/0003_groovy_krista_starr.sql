ALTER TABLE "active_sessions" RENAME TO "sessions";--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "active_sessions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "active_sessions_user_id_device_id_pk";--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_device_id_pk" PRIMARY KEY("user_id","device_id");--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;