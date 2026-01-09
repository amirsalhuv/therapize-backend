-- CreateEnum
CREATE TYPE "FirstSessionFormStatus" AS ENUM ('DRAFT', 'COMPLETED');

-- CreateTable
CREATE TABLE "first_session_forms" (
    "id" TEXT NOT NULL,
    "episode_id" TEXT NOT NULL,
    "status" "FirstSessionFormStatus" NOT NULL DEFAULT 'DRAFT',
    "basic_data" JSONB,
    "performance_tests" JSONB,
    "therapy_goals" JSONB,
    "onboarding" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "first_session_forms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "first_session_forms_episode_id_key" ON "first_session_forms"("episode_id");

-- AddForeignKey
ALTER TABLE "first_session_forms" ADD CONSTRAINT "first_session_forms_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "program_episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
