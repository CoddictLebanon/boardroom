-- AlterEnum
ALTER TYPE "MeetingStatus" ADD VALUE 'PAUSED';

-- AlterTable
ALTER TABLE "AgendaItem" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "notes" TEXT;

-- CreateIndex
CREATE INDEX "AgendaItem_createdById_idx" ON "AgendaItem"("createdById");

-- AddForeignKey
ALTER TABLE "AgendaItem" ADD CONSTRAINT "AgendaItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
