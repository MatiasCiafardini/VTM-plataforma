-- CreateEnum
CREATE TYPE "OnboardingStepKind" AS ENUM ('CLASS', 'MEETING', 'RESOURCE', 'ACTION_MANUAL');

-- CreateEnum
CREATE TYPE "OnboardingCompletionMode" AS ENUM ('SELF_SERVICE', 'STAFF_ONLY', 'AUTOMATIC');

-- CreateEnum
CREATE TYPE "OnboardingCompletionSource" AS ENUM ('STUDENT', 'MENTOR', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "OnboardingAutomationKey" AS ENUM ('STUDENT_ACCOUNT_CREATED', 'INITIAL_PROFILE_COMPLETED', 'FIRST_METRIC_PERIOD_SUBMITTED');

-- CreateTable
CREATE TABLE "OnboardingRoadmap" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingRoadmap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingPhase" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "notesInternal" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "countsForProgress" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingStep" (
    "id" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "locationHint" TEXT,
    "notesInternal" TEXT,
    "stepKind" "OnboardingStepKind" NOT NULL DEFAULT 'ACTION_MANUAL',
    "completionMode" "OnboardingCompletionMode" NOT NULL DEFAULT 'SELF_SERVICE',
    "automationKey" "OnboardingAutomationKey",
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "countsForProgress" BOOLEAN NOT NULL DEFAULT true,
    "challengeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingStepResource" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingStepResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingStepStatus" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completionSource" "OnboardingCompletionSource",
    "completedByUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingStepStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingRoadmap_slug_key" ON "OnboardingRoadmap"("slug");

-- CreateIndex
CREATE INDEX "OnboardingPhase_roadmapId_sortOrder_idx" ON "OnboardingPhase"("roadmapId", "sortOrder");

-- CreateIndex
CREATE INDEX "OnboardingStep_phaseId_sortOrder_idx" ON "OnboardingStep"("phaseId", "sortOrder");

-- CreateIndex
CREATE INDEX "OnboardingStep_challengeId_idx" ON "OnboardingStep"("challengeId");

-- CreateIndex
CREATE INDEX "OnboardingStepResource_stepId_sortOrder_idx" ON "OnboardingStepResource"("stepId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingStepStatus_studentId_stepId_key" ON "OnboardingStepStatus"("studentId", "stepId");

-- CreateIndex
CREATE INDEX "OnboardingStepStatus_studentId_isCompleted_idx" ON "OnboardingStepStatus"("studentId", "isCompleted");

-- CreateIndex
CREATE INDEX "OnboardingStepStatus_stepId_isCompleted_idx" ON "OnboardingStepStatus"("stepId", "isCompleted");

-- AddForeignKey
ALTER TABLE "OnboardingPhase" ADD CONSTRAINT "OnboardingPhase_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "OnboardingRoadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingStep" ADD CONSTRAINT "OnboardingStep_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "OnboardingPhase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingStep" ADD CONSTRAINT "OnboardingStep_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingStepResource" ADD CONSTRAINT "OnboardingStepResource_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "OnboardingStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingStepStatus" ADD CONSTRAINT "OnboardingStepStatus_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingStepStatus" ADD CONSTRAINT "OnboardingStepStatus_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "OnboardingStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingStepStatus" ADD CONSTRAINT "OnboardingStepStatus_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
