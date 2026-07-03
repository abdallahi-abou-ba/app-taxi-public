-- AlterTable
ALTER TABLE "rides" ADD COLUMN     "clientRating" INTEGER,
ADD COLUMN     "clientRatingComment" TEXT,
ADD COLUMN     "driverRating" INTEGER,
ADD COLUMN     "driverRatingComment" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "ratingAverage" DOUBLE PRECISION,
ADD COLUMN     "ratingCount" INTEGER NOT NULL DEFAULT 0;
