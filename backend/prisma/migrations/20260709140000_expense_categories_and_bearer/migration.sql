-- CreateEnum
CREATE TYPE "ExpenseBearer" AS ENUM ('COMPANY', 'DRIVER', 'SHARED');

-- Remap any existing rows using a category value the new enum drops
-- (SALARY, RENT - a Phase 2 taxonomy replaced by the client's actual spec)
-- to OTHER before the type swap below, since a value not present in the
-- new enum would otherwise fail the USING cast.
UPDATE "expenses" SET "category" = 'OTHER' WHERE "category" IN ('SALARY', 'RENT');

-- AlterEnum
BEGIN;
CREATE TYPE "ExpenseCategory_new" AS ENUM ('DRIVER_ADVANCE', 'PENALTY', 'UNIFORM', 'TRAINING', 'DOCUMENT_FEE', 'COMMUNICATION', 'FUEL', 'OIL_CHANGE', 'REPAIR', 'CAR_WASH', 'INSURANCE', 'TECHNICAL_INSPECTION', 'TIRES', 'MAINTENANCE', 'SPARE_PARTS', 'SERVER_HOSTING', 'SMS', 'INTERNET', 'ADVERTISING', 'CUSTOMER_SUPPORT', 'PAYMENT_PROCESSING_FEE', 'ADMIN_FEE', 'OTHER');
ALTER TABLE "expenses" ALTER COLUMN "category" TYPE "ExpenseCategory_new" USING ("category"::text::"ExpenseCategory_new");
ALTER TYPE "ExpenseCategory" RENAME TO "ExpenseCategory_old";
ALTER TYPE "ExpenseCategory_new" RENAME TO "ExpenseCategory";
DROP TYPE "public"."ExpenseCategory_old";
COMMIT;

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'BANKILY';
ALTER TYPE "PaymentMethod" ADD VALUE 'SEDAD';
ALTER TYPE "PaymentMethod" ADD VALUE 'MASRIVI';
ALTER TYPE "PaymentMethod" ADD VALUE 'WALLET';
ALTER TYPE "PaymentMethod" ADD VALUE 'COMPANY';

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "bearer" "ExpenseBearer" NOT NULL DEFAULT 'COMPANY',
ADD COLUMN     "driverShareAmount" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "whatsapp" TEXT;

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "ownerName" TEXT;
