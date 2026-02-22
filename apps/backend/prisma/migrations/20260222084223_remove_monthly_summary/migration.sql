/*
  Warnings:

  - You are about to drop the `MonthlySummary` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MonthlySummary" DROP CONSTRAINT "MonthlySummary_userId_fkey";

-- DropTable
DROP TABLE "MonthlySummary";
