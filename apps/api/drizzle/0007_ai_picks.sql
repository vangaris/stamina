CREATE TABLE "llm_call" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_pseudonym" text,
	"purpose" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"cost_micro_usd" integer NOT NULL,
	"outcome" text NOT NULL,
	"detail" text,
	CONSTRAINT "llm_call_purpose_valid" CHECK ("llm_call"."purpose" in ('session-picks', 'meal-idea', 'sport-draft')),
	CONSTRAINT "llm_call_outcome_valid" CHECK ("llm_call"."outcome" in ('accepted', 'rejected', 'failed')),
	CONSTRAINT "llm_call_usage_valid" CHECK ("llm_call"."input_tokens" >= 0 and "llm_call"."output_tokens" >= 0 and "llm_call"."cost_micro_usd" >= 0)
);
--> statement-breakpoint
-- `llm_call` is pseudonymous (no user id) and read and written only by the API's own connection,
-- the table owner, through the AI gateway. RLS is enabled with no policy and `stamina_app` gets no
-- grant, so a user-scoped query (`withUser`) can neither read nor write it.
ALTER TABLE "llm_call" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "session_exercise" ADD COLUMN "pick_reason" text;--> statement-breakpoint
CREATE INDEX "llm_call_user_at" ON "llm_call" USING btree ("user_pseudonym","at");--> statement-breakpoint
CREATE INDEX "llm_call_at" ON "llm_call" USING btree ("at");--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_ai_pick_recorded" CHECK (("session"."model" is null) = ("session"."prompt_version" is null));--> statement-breakpoint
ALTER TABLE "session_exercise" ADD CONSTRAINT "session_exercise_pick_reason_length" CHECK ("session_exercise"."pick_reason" is null or char_length("session_exercise"."pick_reason") <= 200);