-- AlterTable
ALTER TABLE "Challenge"
ADD COLUMN "iconKey" TEXT NOT NULL DEFAULT 'trophy',
ADD COLUMN "rewardTitle" TEXT,
ADD COLUMN "rewardUrl" TEXT;
