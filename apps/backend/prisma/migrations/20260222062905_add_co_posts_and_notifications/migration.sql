/*
  Warnings:

  - Added the required column `initiatedBy` to the `Post` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CO_POST_RECEIVED', 'CO_POST_ACCEPTED', 'CO_POST_DECLINED', 'CO_POST_CONTRIBUTED');

-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "contributedBy" TEXT;

-- AlterTable: add initiatedBy as nullable first, backfill, then set NOT NULL
ALTER TABLE "Post" ADD COLUMN     "coAuthorAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "coAuthorId" TEXT,
ADD COLUMN     "initiatedBy" TEXT,
ADD COLUMN     "isCoPost" BOOLEAN NOT NULL DEFAULT false;

-- Backfill initiatedBy for all existing posts
UPDATE "Post" SET "initiatedBy" = "userId";

-- Now enforce NOT NULL
ALTER TABLE "Post" ALTER COLUMN "initiatedBy" SET NOT NULL;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "postId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Post_coAuthorId_idx" ON "Post"("coAuthorId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_coAuthorId_fkey" FOREIGN KEY ("coAuthorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_initiatedBy_fkey" FOREIGN KEY ("initiatedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
