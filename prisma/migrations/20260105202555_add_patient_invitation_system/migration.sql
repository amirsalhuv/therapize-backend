-- CreateEnum
CREATE TYPE "AgeRange" AS ENUM ('CHILD', 'TEEN', 'ADULT', 'SENIOR');

-- CreateEnum
CREATE TYPE "PatientInvitationStatus" AS ENUM ('PENDING', 'USED', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "patient_profiles" ADD COLUMN     "age_range" "AgeRange",
ADD COLUMN     "city" TEXT,
ADD COLUMN     "condition_description" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "invited_by_therapist_id" TEXT;

-- CreateTable
CREATE TABLE "patient_invitations" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "invited_by_user_id" TEXT NOT NULL,
    "invited_by_therapist_id" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "age_range" "AgeRange",
    "gender" "Gender",
    "condition_description" TEXT,
    "status" "PatientInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "used_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patient_invitations_token_key" ON "patient_invitations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "patient_invitations_used_by_user_id_key" ON "patient_invitations"("used_by_user_id");

-- CreateIndex
CREATE INDEX "patient_invitations_token_idx" ON "patient_invitations"("token");

-- CreateIndex
CREATE INDEX "patient_invitations_invited_by_user_id_idx" ON "patient_invitations"("invited_by_user_id");

-- CreateIndex
CREATE INDEX "patient_invitations_status_idx" ON "patient_invitations"("status");

-- CreateIndex
CREATE INDEX "patient_profiles_invited_by_therapist_id_idx" ON "patient_profiles"("invited_by_therapist_id");

-- AddForeignKey
ALTER TABLE "patient_invitations" ADD CONSTRAINT "patient_invitations_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_invitations" ADD CONSTRAINT "patient_invitations_used_by_user_id_fkey" FOREIGN KEY ("used_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_invited_by_therapist_id_fkey" FOREIGN KEY ("invited_by_therapist_id") REFERENCES "therapist_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
