-- CreateTable
CREATE TABLE "MonthlyFinancial" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "revenue" DECIMAL(15,2) NOT NULL,
    "cost" DECIMAL(15,2) NOT NULL,
    "profit" DECIMAL(15,2) NOT NULL,
    "pdfPath" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyFinancial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonthlyFinancial_companyId_year_idx" ON "MonthlyFinancial"("companyId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyFinancial_companyId_year_month_key" ON "MonthlyFinancial"("companyId", "year", "month");

-- AddForeignKey
ALTER TABLE "MonthlyFinancial" ADD CONSTRAINT "MonthlyFinancial_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
