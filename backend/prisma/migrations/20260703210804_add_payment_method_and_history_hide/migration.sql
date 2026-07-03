-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD');

-- AlterTable
ALTER TABLE "rides" ADD COLUMN     "hiddenByClient" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hiddenByDriver" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH';
