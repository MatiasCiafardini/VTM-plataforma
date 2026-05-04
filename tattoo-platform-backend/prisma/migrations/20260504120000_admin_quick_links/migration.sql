CREATE TABLE "AdminQuickLink" (
    "id" TEXT NOT NULL,
    "adminProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminQuickLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminQuickLink_adminProfileId_idx" ON "AdminQuickLink"("adminProfileId");

ALTER TABLE "AdminQuickLink" ADD CONSTRAINT "AdminQuickLink_adminProfileId_fkey" FOREIGN KEY ("adminProfileId") REFERENCES "AdminProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
