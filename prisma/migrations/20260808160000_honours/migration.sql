-- CreateEnum
CREATE TYPE "HonourType" AS ENUM ('WINNER', 'RUNNER_UP', 'THIRD_PLACE', 'PROMOTION', 'INDIVIDUAL_AWARD');

-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "teamPhotoUrl" TEXT;

-- CreateTable
CREATE TABLE "Honour" (
    "id" TEXT NOT NULL,
    "type" "HonourType" NOT NULL DEFAULT 'WINNER',
    "year" INTEGER NOT NULL,
    "seasonLabel" TEXT,
    "competitionId" TEXT,
    "titleFr" TEXT,
    "titleEn" TEXT,
    "titleAr" TEXT,
    "note" TEXT,
    "clubId" TEXT,
    "playerId" TEXT,
    "coachId" TEXT,
    "countryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Honour_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Honour_clubId_year_idx" ON "Honour"("clubId", "year");

-- CreateIndex
CREATE INDEX "Honour_playerId_year_idx" ON "Honour"("playerId", "year");

-- CreateIndex
CREATE INDEX "Honour_coachId_year_idx" ON "Honour"("coachId", "year");

-- CreateIndex
CREATE INDEX "Honour_countryId_year_idx" ON "Honour"("countryId", "year");

-- CreateIndex
CREATE INDEX "Honour_competitionId_idx" ON "Honour"("competitionId");

-- AddForeignKey
ALTER TABLE "Honour" ADD CONSTRAINT "Honour_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Honour" ADD CONSTRAINT "Honour_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Honour" ADD CONSTRAINT "Honour_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Honour" ADD CONSTRAINT "Honour_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Honour" ADD CONSTRAINT "Honour_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;
