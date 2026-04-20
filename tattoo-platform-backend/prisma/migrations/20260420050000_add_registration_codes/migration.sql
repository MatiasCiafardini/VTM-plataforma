CREATE TABLE "RegistrationCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "maxUses" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegistrationCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RegistrationCode_code_key" ON "RegistrationCode"("code");

-- Seed the initial student registration code
INSERT INTO "RegistrationCode" ("id", "code", "label", "role", "isActive", "usageCount", "updatedAt")
VALUES (
    gen_random_uuid()::text,
    'VMT2026',
    'Codigo inicial de alumnos',
    'STUDENT',
    true,
    0,
    NOW()
);
