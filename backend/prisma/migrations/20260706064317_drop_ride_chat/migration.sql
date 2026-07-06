-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_rideId_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_senderId_fkey";

-- DropTable
DROP TABLE "messages";

