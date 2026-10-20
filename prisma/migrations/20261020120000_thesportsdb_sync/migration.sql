-- AlterTable
ALTER TABLE "Competition" ADD COLUMN "theSportsDbLeagueId" INTEGER;

-- AlterTable
ALTER TABLE "Club" ADD COLUMN "theSportsDbTeamId" INTEGER;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN "theSportsDbEventId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Competition_theSportsDbLeagueId_key" ON "Competition"("theSportsDbLeagueId");

-- CreateIndex
CREATE UNIQUE INDEX "Club_theSportsDbTeamId_key" ON "Club"("theSportsDbTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_theSportsDbEventId_key" ON "Match"("theSportsDbEventId");
