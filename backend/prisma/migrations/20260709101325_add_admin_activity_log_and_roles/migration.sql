-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'FINANCE', 'OPERATIONS', 'SUPPORT');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "adminRole" "AdminRole";

-- CreateTable
CREATE TABLE "admin_activity_logs" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_activity_logs_adminUserId_idx" ON "admin_activity_logs"("adminUserId");

-- CreateIndex
CREATE INDEX "admin_activity_logs_entityType_entityId_idx" ON "admin_activity_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "admin_activity_logs_createdAt_idx" ON "admin_activity_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "admin_activity_logs" ADD CONSTRAINT "admin_activity_logs_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: every admin created before this migration keeps unrestricted
-- access (a new requirePermission() check would otherwise lock them out of
-- everything except SUPER_ADMIN).
UPDATE "users" SET "adminRole" = 'SUPER_ADMIN' WHERE "role" = 'ADMIN';
