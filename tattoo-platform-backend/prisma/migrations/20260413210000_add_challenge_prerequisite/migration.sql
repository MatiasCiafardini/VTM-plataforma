-- AlterTable
ALTER TABLE "Challenge"
ADD COLUMN "prerequisiteChallengeId" TEXT;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_prerequisiteChallengeId_fkey"
FOREIGN KEY ("prerequisiteChallengeId") REFERENCES "Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Challenge_prerequisiteChallengeId_idx" ON "Challenge"("prerequisiteChallengeId");
