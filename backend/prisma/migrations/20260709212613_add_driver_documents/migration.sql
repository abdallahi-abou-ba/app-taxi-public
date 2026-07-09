/*
  Warnings:

  - You are about to drop the column `idDocumentUrl` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `licenseDocumentUrl` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `photoUrl` on the `users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "DriverDocumentType" AS ENUM ('PHOTO', 'ID_CARD', 'LICENSE');

-- AlterTable
ALTER TABLE "users" DROP COLUMN "idDocumentUrl",
DROP COLUMN "licenseDocumentUrl",
DROP COLUMN "photoUrl";

-- CreateTable
CREATE TABLE "driver_documents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "DriverDocumentType" NOT NULL,
    "data" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "driver_documents_userId_type_key" ON "driver_documents"("userId", "type");

-- AddForeignKey
ALTER TABLE "driver_documents" ADD CONSTRAINT "driver_documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
