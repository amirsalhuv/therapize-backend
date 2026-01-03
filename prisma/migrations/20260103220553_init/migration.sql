-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PATIENT', 'THERAPIST', 'LEAD_THERAPIST', 'ADMIN', 'OWNER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "EpisodeStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContinuationDecision" AS ENUM ('EXTEND', 'MAINTENANCE', 'DISCHARGE', 'PENDING');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'MISSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PDF', 'IMAGE', 'VIDEO', 'OTHER');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('EN', 'HE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "phone_number" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3),
    "gender" "Gender",
    "avatar_url" TEXT,
    "locale" "Locale" NOT NULL DEFAULT 'EN',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "roles" "UserRole"[],

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "device_info" TEXT,
    "ip_address" TEXT,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "medical_record_number" TEXT,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "insurance_provider" TEXT,
    "insurance_policy_number" TEXT,
    "primary_diagnosis" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapist_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "license_number" TEXT,
    "license_state" TEXT,
    "specializations" TEXT[],
    "bio" TEXT,
    "years_of_experience" INTEGER,
    "is_lead_therapist" BOOLEAN NOT NULL DEFAULT false,
    "max_patients" INTEGER NOT NULL DEFAULT 50,
    "accepting_new_patients" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "therapist_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_episodes" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "therapist_id" TEXT NOT NULL,
    "status" "EpisodeStatus" NOT NULL DEFAULT 'ACTIVE',
    "duration_weeks" INTEGER NOT NULL DEFAULT 12,
    "current_week" INTEGER NOT NULL DEFAULT 1,
    "continuation_decision" "ContinuationDecision" NOT NULL DEFAULT 'PENDING',
    "start_date" TIMESTAMP(3) NOT NULL,
    "expected_end_date" TIMESTAMP(3) NOT NULL,
    "actual_end_date" TIMESTAMP(3),
    "phases" JSONB,
    "goals" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_episodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_he" TEXT,
    "description" TEXT,
    "description_he" TEXT,
    "duration_weeks" INTEGER NOT NULL,
    "category" TEXT,
    "target_conditions" TEXT[],
    "structure" JSONB NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_plans" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "episode_id" TEXT NOT NULL,
    "template_id" TEXT,
    "name" TEXT NOT NULL,
    "customizations" JSONB,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "episode_id" TEXT NOT NULL,
    "plan_id" TEXT,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "scheduled_time" TIMESTAMP(3),
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "duration_minutes" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_feedbacks" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "overall_rating" INTEGER,
    "pain_now" INTEGER,
    "fatigue_now" INTEGER,
    "confidence" INTEGER,
    "new_symptoms" BOOLEAN,
    "new_symptoms_details" TEXT,
    "questionnaire_answers" JSONB,
    "additional_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "template_id" TEXT,
    "name" TEXT NOT NULL,
    "name_he" TEXT,
    "description" TEXT,
    "description_he" TEXT,
    "instructions" TEXT,
    "instructions_he" TEXT,
    "media_url" TEXT,
    "media_type" TEXT,
    "duration_minutes" INTEGER,
    "repetitions" INTEGER,
    "sets" INTEGER,
    "category" TEXT,
    "difficulty" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_exercises" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "custom_instructions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_item_feedbacks" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "difficulty_rating" INTEGER,
    "pain_impact" TEXT,
    "clarity_rating" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "skip_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_item_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_patient_notes" (
    "id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "therapist_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "visible_to_patient" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercise_patient_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_documents" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" "DocumentType" NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "document_date" TIMESTAMP(3),
    "is_confidential" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "medical_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_notes" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_threads" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "episode_id" TEXT,
    "is_group" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_thread_participants" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    "last_read_at" TIMESTAMP(3),
    "is_muted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "group_thread_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "content_type" TEXT NOT NULL DEFAULT 'text',
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thread_invites" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "inviter_id" TEXT NOT NULL,
    "invitee_id" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "requires_patient_approval" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thread_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employer_accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT,
    "max_members" INTEGER NOT NULL,
    "coverage_policy" TEXT NOT NULL DEFAULT 'employee_only',
    "subsidy_type" TEXT NOT NULL DEFAULT 'full',
    "copay_amount" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "contract_start_date" TIMESTAMP(3) NOT NULL,
    "contract_end_date" TIMESTAMP(3),
    "settings" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employer_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employer_members" (
    "id" TEXT NOT NULL,
    "employer_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "employee_id" TEXT,
    "department" TEXT,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),

    CONSTRAINT "employer_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primary_member_id" TEXT,
    "max_members" INTEGER NOT NULL DEFAULT 6,
    "discount_tier" TEXT,
    "is_prepaid" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "household_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_members" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "relationship" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "household_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_catalogs" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_he" TEXT,
    "description" TEXT,
    "description_he" TEXT,
    "category" TEXT,
    "questions" JSONB NOT NULL,
    "scoring_rules" JSONB NOT NULL,
    "interpretation_guide" JSONB,
    "how_to_score_video_url" TEXT,
    "estimated_minutes" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_catalogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_results" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "episode_id" TEXT NOT NULL,
    "assessment_type" TEXT NOT NULL DEFAULT 'baseline',
    "answers" JSONB NOT NULL,
    "score" DOUBLE PRECISION,
    "interpretation" TEXT,
    "completed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_votes" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "therapist_id" TEXT NOT NULL,
    "is_useful" BOOLEAN NOT NULL,
    "condition_tag" TEXT,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "correlation_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_key" ON "password_resets"("token");

-- CreateIndex
CREATE INDEX "password_resets_token_idx" ON "password_resets"("token");

-- CreateIndex
CREATE UNIQUE INDEX "patient_profiles_user_id_key" ON "patient_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_profiles_medical_record_number_key" ON "patient_profiles"("medical_record_number");

-- CreateIndex
CREATE UNIQUE INDEX "therapist_profiles_user_id_key" ON "therapist_profiles"("user_id");

-- CreateIndex
CREATE INDEX "program_episodes_patient_id_idx" ON "program_episodes"("patient_id");

-- CreateIndex
CREATE INDEX "program_episodes_therapist_id_idx" ON "program_episodes"("therapist_id");

-- CreateIndex
CREATE INDEX "program_episodes_status_idx" ON "program_episodes"("status");

-- CreateIndex
CREATE INDEX "program_templates_category_idx" ON "program_templates"("category");

-- CreateIndex
CREATE INDEX "program_templates_is_published_idx" ON "program_templates"("is_published");

-- CreateIndex
CREATE INDEX "patient_plans_patient_id_idx" ON "patient_plans"("patient_id");

-- CreateIndex
CREATE INDEX "patient_plans_episode_id_idx" ON "patient_plans"("episode_id");

-- CreateIndex
CREATE INDEX "sessions_episode_id_idx" ON "sessions"("episode_id");

-- CreateIndex
CREATE INDEX "sessions_scheduled_date_idx" ON "sessions"("scheduled_date");

-- CreateIndex
CREATE INDEX "sessions_status_idx" ON "sessions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "session_feedbacks_session_id_key" ON "session_feedbacks"("session_id");

-- CreateIndex
CREATE INDEX "exercises_category_idx" ON "exercises"("category");

-- CreateIndex
CREATE UNIQUE INDEX "session_exercises_session_id_exercise_id_key" ON "session_exercises"("session_id", "exercise_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_item_feedbacks_session_id_exercise_id_key" ON "session_item_feedbacks"("session_id", "exercise_id");

-- CreateIndex
CREATE INDEX "exercise_patient_notes_exercise_id_patient_id_idx" ON "exercise_patient_notes"("exercise_id", "patient_id");

-- CreateIndex
CREATE INDEX "medical_documents_patient_id_idx" ON "medical_documents"("patient_id");

-- CreateIndex
CREATE INDEX "medical_documents_category_idx" ON "medical_documents"("category");

-- CreateIndex
CREATE INDEX "document_notes_document_id_idx" ON "document_notes"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_threads_episode_id_key" ON "group_threads"("episode_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_thread_participants_thread_id_user_id_key" ON "group_thread_participants"("thread_id", "user_id");

-- CreateIndex
CREATE INDEX "messages_thread_id_idx" ON "messages"("thread_id");

-- CreateIndex
CREATE INDEX "messages_sender_id_idx" ON "messages"("sender_id");

-- CreateIndex
CREATE INDEX "thread_invites_invitee_id_status_idx" ON "thread_invites"("invitee_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "employer_members_employer_id_patient_id_key" ON "employer_members"("employer_id", "patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "household_members_household_id_patient_id_key" ON "household_members"("household_id", "patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_catalogs_code_key" ON "assessment_catalogs"("code");

-- CreateIndex
CREATE INDEX "assessment_results_episode_id_idx" ON "assessment_results"("episode_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_votes_assessment_id_therapist_id_key" ON "assessment_votes"("assessment_id", "therapist_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapist_profiles" ADD CONSTRAINT "therapist_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_episodes" ADD CONSTRAINT "program_episodes_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_episodes" ADD CONSTRAINT "program_episodes_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "therapist_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_templates" ADD CONSTRAINT "program_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "therapist_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_plans" ADD CONSTRAINT "patient_plans_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_plans" ADD CONSTRAINT "patient_plans_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "program_episodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_plans" ADD CONSTRAINT "patient_plans_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "program_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "program_episodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "patient_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_feedbacks" ADD CONSTRAINT "session_feedbacks_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "program_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_item_feedbacks" ADD CONSTRAINT "session_item_feedbacks_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_item_feedbacks" ADD CONSTRAINT "session_item_feedbacks_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_patient_notes" ADD CONSTRAINT "exercise_patient_notes_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_patient_notes" ADD CONSTRAINT "exercise_patient_notes_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "therapist_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_documents" ADD CONSTRAINT "medical_documents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_notes" ADD CONSTRAINT "document_notes_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "medical_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_threads" ADD CONSTRAINT "group_threads_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "program_episodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_thread_participants" ADD CONSTRAINT "group_thread_participants_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "group_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_thread_participants" ADD CONSTRAINT "group_thread_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "group_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_invites" ADD CONSTRAINT "thread_invites_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "group_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_invites" ADD CONSTRAINT "thread_invites_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_invites" ADD CONSTRAINT "thread_invites_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employer_members" ADD CONSTRAINT "employer_members_employer_id_fkey" FOREIGN KEY ("employer_id") REFERENCES "employer_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employer_members" ADD CONSTRAINT "employer_members_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "household_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessment_catalogs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "program_episodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_votes" ADD CONSTRAINT "assessment_votes_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessment_catalogs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_votes" ADD CONSTRAINT "assessment_votes_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "therapist_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
