-- AlterTable
ALTER TABLE "rides" ADD COLUMN     "stripeCheckoutSessionId" TEXT,
ADD COLUMN     "stripePaymentIntentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "rides_stripeCheckoutSessionId_key" ON "rides"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "rides_stripePaymentIntentId_key" ON "rides"("stripePaymentIntentId");

