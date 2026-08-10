-- DropIndex
DROP INDEX "ClubCompetition_competitionId_seasonId_idx";

-- AlterTable
ALTER TABLE "ClubCompetition" ADD COLUMN     "group" TEXT;

-- CreateTable
CREATE TABLE "NationalTeamEntry" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "group" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NationalTeamEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NationalTeamMatch" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "homeCountryId" TEXT NOT NULL,
    "awayCountryId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'PLAYED',
    "ageCategory" "AgeCategory" NOT NULL DEFAULT 'SENIOR',
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "venue" TEXT,
    "matchday" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NationalTeamMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NationalTeamMatchAppearance" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "isStarter" BOOLEAN NOT NULL DEFAULT true,
    "minutesPlayed" INTEGER NOT NULL DEFAULT 0,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "yellowCards" INTEGER NOT NULL DEFAULT 0,
    "redCards" INTEGER NOT NULL DEFAULT 0,
    "ownGoals" INTEGER NOT NULL DEFAULT 0,
    "goalsConceded" INTEGER,
    "cleanSheet" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NationalTeamMatchAppearance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NationalTeamEntry_competitionId_seasonId_group_idx" ON "NationalTeamEntry"("competitionId", "seasonId", "group");

-- CreateIndex
CREATE INDEX "NationalTeamEntry_countryId_seasonId_idx" ON "NationalTeamEntry"("countryId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "NationalTeamEntry_countryId_competitionId_seasonId_key" ON "NationalTeamEntry"("countryId", "competitionId", "seasonId");

-- CreateIndex
CREATE INDEX "NationalTeamMatch_competitionId_seasonId_idx" ON "NationalTeamMatch"("competitionId", "seasonId");

-- CreateIndex
CREATE INDEX "NationalTeamMatch_homeCountryId_date_idx" ON "NationalTeamMatch"("homeCountryId", "date");

-- CreateIndex
CREATE INDEX "NationalTeamMatch_awayCountryId_date_idx" ON "NationalTeamMatch"("awayCountryId", "date");

-- CreateIndex
CREATE INDEX "NationalTeamMatch_date_idx" ON "NationalTeamMatch"("date");

-- CreateIndex
CREATE INDEX "NationalTeamMatchAppearance_playerId_idx" ON "NationalTeamMatchAppearance"("playerId");

-- CreateIndex
CREATE INDEX "NationalTeamMatchAppearance_countryId_matchId_idx" ON "NationalTeamMatchAppearance"("countryId", "matchId");

-- CreateIndex
CREATE UNIQUE INDEX "NationalTeamMatchAppearance_matchId_playerId_key" ON "NationalTeamMatchAppearance"("matchId", "playerId");

-- CreateIndex
CREATE INDEX "ClubCompetition_competitionId_seasonId_group_idx" ON "ClubCompetition"("competitionId", "seasonId", "group");

-- AddForeignKey
ALTER TABLE "NationalTeamEntry" ADD CONSTRAINT "NationalTeamEntry_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NationalTeamEntry" ADD CONSTRAINT "NationalTeamEntry_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NationalTeamEntry" ADD CONSTRAINT "NationalTeamEntry_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NationalTeamMatch" ADD CONSTRAINT "NationalTeamMatch_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NationalTeamMatch" ADD CONSTRAINT "NationalTeamMatch_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NationalTeamMatch" ADD CONSTRAINT "NationalTeamMatch_homeCountryId_fkey" FOREIGN KEY ("homeCountryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NationalTeamMatch" ADD CONSTRAINT "NationalTeamMatch_awayCountryId_fkey" FOREIGN KEY ("awayCountryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NationalTeamMatchAppearance" ADD CONSTRAINT "NationalTeamMatchAppearance_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "NationalTeamMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NationalTeamMatchAppearance" ADD CONSTRAINT "NationalTeamMatchAppearance_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NationalTeamMatchAppearance" ADD CONSTRAINT "NationalTeamMatchAppearance_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;
