-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "personId" TEXT,
    "label" TEXT NOT NULL,
    "presetUsed" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_postId_key" ON "Milestone"("postId");

-- CreateIndex
CREATE INDEX "Milestone_postId_idx" ON "Milestone"("postId");

-- CreateIndex
CREATE INDEX "Milestone_personId_idx" ON "Milestone"("personId");

-- CreateIndex
CREATE INDEX "Milestone_createdBy_idx" ON "Milestone"("createdBy");

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_personId_fkey"
  FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
