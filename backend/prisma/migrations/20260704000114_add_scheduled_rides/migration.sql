-- AlterEnum
ALTER TYPE "RideStatus" ADD VALUE 'SCHEDULED';

-- AlterTable
ALTER TABLE "rides" ADD COLUMN     "scheduledFor" TIMESTAMP(3);
