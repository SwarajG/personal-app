-- CreateEnum
CREATE TYPE "PersonStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PERSON_REQUEST_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'PERSON_REQUEST_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'PERSON_REQUEST_DECLINED';

-- AlterTable: add relationship and status to Person
ALTER TABLE "Person" ADD COLUMN "relationship" TEXT;
ALTER TABLE "Person" ADD COLUMN "status" "PersonStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable: add personId to Notification
ALTER TABLE "Notification" ADD COLUMN "personId" TEXT;

-- CreateIndex
CREATE INDEX "Person_status_idx" ON "Person"("status");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_personId_fkey"
  FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill existing Person rows as ACCEPTED (they were added directly before this feature)
UPDATE "Person" SET "status" = 'ACCEPTED';
