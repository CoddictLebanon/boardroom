-- AlterTable
ALTER TABLE "ActionItem" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "Decision" ADD COLUMN     "createdById" TEXT;

-- CreateIndex
CREATE INDEX "ActionItem_createdById_idx" ON "ActionItem"("createdById");

-- CreateIndex
CREATE INDEX "Decision_createdById_idx" ON "Decision"("createdById");

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
