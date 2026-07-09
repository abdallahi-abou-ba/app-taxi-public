-- AlterTable
ALTER TABLE "rides" ADD COLUMN     "declinedByDriverIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
