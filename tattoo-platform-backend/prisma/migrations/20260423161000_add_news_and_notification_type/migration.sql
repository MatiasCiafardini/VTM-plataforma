-- Add NEWS_PUBLISHED to NotificationType if it is missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'NotificationType'
      AND e.enumlabel = 'NEWS_PUBLISHED'
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'NEWS_PUBLISHED';
  END IF;
END $$;

-- Create News table if it does not exist
CREATE TABLE IF NOT EXISTS "News" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);
