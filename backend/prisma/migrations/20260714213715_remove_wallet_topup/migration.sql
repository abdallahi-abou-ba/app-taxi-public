/*
  Warnings:

  - You are about to drop the `wallet_topups` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "wallet_topups" DROP CONSTRAINT "wallet_topups_confirmedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "wallet_topups" DROP CONSTRAINT "wallet_topups_driverId_fkey";

-- DropTable
DROP TABLE "wallet_topups";

-- DropEnum
DROP TYPE "WalletTopUpStatus";
