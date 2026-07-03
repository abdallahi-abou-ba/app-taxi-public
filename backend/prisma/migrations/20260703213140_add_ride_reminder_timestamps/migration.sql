-- AlterTable
ALTER TABLE "rides" ADD COLUMN     "ratingReminderSentAt" TIMESTAMP(3),
ADD COLUMN     "searchReminderSentAt" TIMESTAMP(3);
