-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACTOR');

-- CreateTable
CREATE TABLE "OrgRole" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "parentId" TEXT,
    "title" TEXT NOT NULL,
    "personName" TEXT,
    "responsibilities" TEXT,
    "department" TEXT,
    "employmentType" "EmploymentType",
    "positionX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "positionY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrgRole_companyId_idx" ON "OrgRole"("companyId");

-- CreateIndex
CREATE INDEX "OrgRole_parentId_idx" ON "OrgRole"("parentId");

-- AddForeignKey
ALTER TABLE "OrgRole" ADD CONSTRAINT "OrgRole_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgRole" ADD CONSTRAINT "OrgRole_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "OrgRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
