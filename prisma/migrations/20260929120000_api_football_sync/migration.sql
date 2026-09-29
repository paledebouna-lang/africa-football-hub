-- AlterTable
ALTER TABLE "Competition" ADD COLUMN "apiFootballLeagueId" INTEGER;

-- AlterTable
ALTER TABLE "Club" ADD COLUMN "apiFootballTeamId" INTEGER,
ADD COLUMN "squadSyncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Player" ADD COLUMN "apiFootballPlayerId" INTEGER;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN "apiFootballFixtureId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Competition_apiFootballLeagueId_key" ON "Competition"("apiFootballLeagueId");

-- CreateIndex
CREATE UNIQUE INDEX "Club_apiFootballTeamId_key" ON "Club"("apiFootballTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_apiFootballPlayerId_key" ON "Player"("apiFootballPlayerId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_apiFootballFixtureId_key" ON "Match"("apiFootballFixtureId");

-- CreateTable
CREATE TABLE "ApiFootballSync" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "ranAt" TIMESTAMP(3) NOT NULL,
    "report" JSONB NOT NULL,

    CONSTRAINT "ApiFootballSync_pkey" PRIMARY KEY ("id")
);
