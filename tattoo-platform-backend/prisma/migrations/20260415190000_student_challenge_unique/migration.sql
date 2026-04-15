-- If you have duplicate (studentId, challengeId) rows from older data, run this first:
-- DELETE FROM "StudentChallenge" s1 USING "StudentChallenge" s2
--   WHERE s1.id > s2.id AND s1."studentId" = s2."studentId" AND s1."challengeId" = s2."challengeId";

-- CreateIndex
CREATE UNIQUE INDEX "StudentChallenge_studentId_challengeId_key" ON "StudentChallenge"("studentId", "challengeId");
