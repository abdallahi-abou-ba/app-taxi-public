-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'SUSPENDED', 'UNAVAILABLE', 'ARCHIVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DriverApprovalStatus" ADD VALUE 'SUSPENDED';
ALTER TYPE "DriverApprovalStatus" ADD VALUE 'BLOCKED';

-- AlterTable
ALTER TABLE "rides" ADD COLUMN     "commissionAmount" DOUBLE PRECISION,
ADD COLUMN     "commissionRateSnapshot" DOUBLE PRECISION,
ADD COLUMN     "driverNetAmount" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "address" TEXT,
ADD COLUMN     "commissionRate" DOUBLE PRECISION,
ADD COLUMN     "contractType" TEXT,
ADD COLUMN     "idDocumentUrl" TEXT,
ADD COLUMN     "initialBalance" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "licenseDocumentUrl" TEXT,
ADD COLUMN     "licenseExpiryAt" TIMESTAMP(3),
ADD COLUMN     "licenseNumber" TEXT,
ADD COLUMN     "nationalId" TEXT,
ADD COLUMN     "photoUrl" TEXT;

-- CreateTable
CREATE TABLE "commission_changes" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "oldRate" DOUBLE PRECISION,
    "newRate" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "changedByUserId" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "color" TEXT,
    "year" INTEGER,
    "type" TEXT,
    "seatCount" INTEGER,
    "insuranceProvider" TEXT,
    "insuranceNumber" TEXT,
    "insuranceExpiresAt" TIMESTAMP(3),
    "carteGriseNumber" TEXT,
    "technicalInspectionExpiresAt" TIMESTAMP(3),
    "status" "VehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentDriverId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_assignments" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "commission_changes_driverId_idx" ON "commission_changes"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_plate_key" ON "vehicles"("plate");

-- CreateIndex
CREATE INDEX "vehicles_status_idx" ON "vehicles"("status");

-- CreateIndex
CREATE INDEX "vehicles_currentDriverId_idx" ON "vehicles"("currentDriverId");

-- CreateIndex
CREATE INDEX "vehicle_assignments_driverId_idx" ON "vehicle_assignments"("driverId");

-- CreateIndex
CREATE INDEX "vehicle_assignments_vehicleId_endDate_idx" ON "vehicle_assignments"("vehicleId", "endDate");

-- CreateIndex
CREATE INDEX "rides_driverId_completedAt_idx" ON "rides"("driverId", "completedAt");

-- AddForeignKey
ALTER TABLE "commission_changes" ADD CONSTRAINT "commission_changes_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_changes" ADD CONSTRAINT "commission_changes_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_currentDriverId_fkey" FOREIGN KEY ("currentDriverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_assignments" ADD CONSTRAINT "vehicle_assignments_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_assignments" ADD CONSTRAINT "vehicle_assignments_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
