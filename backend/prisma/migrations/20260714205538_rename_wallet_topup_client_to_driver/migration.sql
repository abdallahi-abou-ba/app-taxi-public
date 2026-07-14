/*
  Warnings:

  - You are about to drop the column `clientDeclaredAt` on the `wallet_topups` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `wallet_topups` table. All the data in the column will be lost.
  - Added the required column `driverId` to the `wallet_topups` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "wallet_topups" DROP CONSTRAINT "wallet_topups_clientId_fkey";

-- DropIndex
DROP INDEX "wallet_topups_clientId_idx";

-- AlterTable
ALTER TABLE "wallet_topups" DROP COLUMN "clientDeclaredAt",
DROP COLUMN "clientId",
ADD COLUMN     "driverDeclaredAt" TIMESTAMP(3),
ADD COLUMN     "driverId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "wallet_topups_driverId_idx" ON "wallet_topups"("driverId");

-- AddForeignKey
ALTER TABLE "wallet_topups" ADD CONSTRAINT "wallet_topups_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
