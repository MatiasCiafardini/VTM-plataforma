CREATE TABLE "MentorshipFeedback" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedback" TEXT NOT NULL,
    "achievement" TEXT NOT NULL,
    "originalRating" INTEGER NOT NULL,
    "originalFeedback" TEXT NOT NULL,
    "originalAchievement" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MentorshipFeedback_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MentorshipFeedback_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
    CONSTRAINT "MentorshipFeedback_originalRating_check" CHECK ("originalRating" BETWEEN 1 AND 5)
);
CREATE UNIQUE INDEX "MentorshipFeedback_studentId_submissionId_key" ON "MentorshipFeedback"("studentId", "submissionId");
CREATE INDEX "MentorshipFeedback_studentId_createdAt_idx" ON "MentorshipFeedback"("studentId", "createdAt");
CREATE INDEX "MentorshipFeedback_createdAt_id_idx" ON "MentorshipFeedback"("createdAt", "id");
CREATE INDEX "MentorshipFeedback_weekStart_idx" ON "MentorshipFeedback"("weekStart");
ALTER TABLE "MentorshipFeedback" ADD CONSTRAINT "MentorshipFeedback_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
