-- CreateEnum
CREATE TYPE "DriverApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ADMIN';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "approvalStatus" "DriverApprovalStatus",
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "vehicleModel" TEXT,
ADD COLUMN     "vehiclePlate" TEXT;

