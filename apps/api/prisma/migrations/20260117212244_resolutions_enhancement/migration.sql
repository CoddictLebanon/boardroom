-- CreateEnum
CREATE TYPE "SignatureStatus" AS ENUM ('PENDING', 'SIGNED', 'DECLINED');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "companyEmail" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "registrationNo" TEXT,
ADD COLUMN     "stampUrl" TEXT,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "Resolution" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "generatedBy" TEXT,
ADD COLUMN     "includeStamp" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "signatureUrl" TEXT;

-- CreateTable
CREATE TABLE "ResolutionSignature" (
    "id" TEXT NOT NULL,
    "resolutionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "SignatureStatus" NOT NULL DEFAULT 'PENDING',
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResolutionSignature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResolutionSignature_resolutionId_idx" ON "ResolutionSignature"("resolutionId");

-- CreateIndex
CREATE INDEX "ResolutionSignature_userId_idx" ON "ResolutionSignature"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ResolutionSignature_resolutionId_userId_key" ON "ResolutionSignature"("resolutionId", "userId");

-- AddForeignKey
ALTER TABLE "Resolution" ADD CONSTRAINT "Resolution_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResolutionSignature" ADD CONSTRAINT "ResolutionSignature_resolutionId_fkey" FOREIGN KEY ("resolutionId") REFERENCES "Resolution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResolutionSignature" ADD CONSTRAINT "ResolutionSignature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
