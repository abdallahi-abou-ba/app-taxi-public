-- AlterTable
ALTER TABLE "settlements" ADD COLUMN     "driverMarkedPaidAt" TIMESTAMP(3),
ADD COLUMN     "driverPaymentMethod" "PaymentMethod";

