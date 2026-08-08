-- CreateEnum
CREATE TYPE "Confederation" AS ENUM ('CAF', 'UEFA', 'CONMEBOL', 'AFC', 'CONCACAF', 'OFC');

-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "fifaCategory" INTEGER;

-- CreateTable
CREATE TABLE "TrainingCostRate" (
    "id" TEXT NOT NULL,
    "confederation" "Confederation" NOT NULL,
    "category" INTEGER NOT NULL,
    "amountEur" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingCostRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingCostRate_year_idx" ON "TrainingCostRate"("year");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingCostRate_confederation_category_year_key" ON "TrainingCostRate"("confederation", "category", "year");
