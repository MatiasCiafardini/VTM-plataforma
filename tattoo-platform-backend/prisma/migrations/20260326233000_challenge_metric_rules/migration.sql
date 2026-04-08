-- AlterTable
ALTER TABLE "Challenge"
ADD COLUMN "difficultyStars" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "metricDefinitionId" TEXT,
ADD COLUMN "targetValue" DECIMAL(18,4);

-- CreateIndex
CREATE INDEX "Challenge_metricDefinitionId_idx" ON "Challenge"("metricDefinitionId");

-- AddForeignKey
ALTER TABLE "Challenge"
ADD CONSTRAINT "Challenge_metricDefinitionId_fkey"
FOREIGN KEY ("metricDefinitionId") REFERENCES "MetricDefinition"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
