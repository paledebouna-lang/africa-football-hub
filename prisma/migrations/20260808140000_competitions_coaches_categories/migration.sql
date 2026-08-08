-- CreateEnum
CREATE TYPE "AgeCategory" AS ENUM ('SENIOR', 'U23', 'U20', 'U19', 'U17', 'U15');

-- CreateEnum
CREATE TYPE "CompetitionType" AS ENUM ('LEAGUE', 'CUP', 'SUPER_CUP', 'CONTINENTAL', 'INTERNATIONAL', 'YOUTH');

-- CreateEnum
CREATE TYPE "ClubType" AS ENUM ('CLUB', 'ACADEMY');

-- CreateEnum
CREATE TYPE "CoachRole" AS ENUM ('HEAD_COACH', 'ASSISTANT', 'GOALKEEPING', 'FITNESS', 'ANALYST', 'ACADEMY_DIRECTOR', 'SCOUT');

-- CreateEnum
CREATE TYPE "VideoType" AS ENUM ('HIGHLIGHTS', 'MATCH', 'INTERVIEW', 'SKILLS');

-- DropForeignKey
ALTER TABLE "Club" DROP CONSTRAINT "Club_leagueId_fkey";

-- DropForeignKey
ALTER TABLE "League" DROP CONSTRAINT "League_countryId_fkey";

-- DropIndex
DROP INDEX "Club_leagueId_idx";

-- AlterTable
ALTER TABLE "Club" DROP COLUMN "leagueId",
ADD COLUMN     "parentClubId" TEXT,
ADD COLUMN     "primaryCompetitionId" TEXT,
ADD COLUMN     "type" "ClubType" NOT NULL DEFAULT 'CLUB',
ADD COLUMN     "websiteUrl" TEXT;

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "ageCategory" "AgeCategory" NOT NULL DEFAULT 'SENIOR';

-- DropTable
DROP TABLE "League";

-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "type" "CompetitionType" NOT NULL DEFAULT 'LEAGUE',
    "ageCategory" "AgeCategory" NOT NULL DEFAULT 'SENIOR',
    "tier" INTEGER NOT NULL DEFAULT 1,
    "logoUrl" TEXT,
    "countryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubCompetition" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubCompetition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NationalTeamSelection" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "level" "AgeCategory" NOT NULL DEFAULT 'SENIOR',
    "caps" INTEGER NOT NULL DEFAULT 0,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "firstCallUp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NationalTeamSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerVideo" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "type" "VideoType" NOT NULL DEFAULT 'HIGHLIGHTS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coach" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "photoUrl" TEXT,
    "licence" TEXT,
    "nationalityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachSpell" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "role" "CoachRole" NOT NULL DEFAULT 'HEAD_COACH',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachSpell_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Competition_slug_key" ON "Competition"("slug");

-- CreateIndex
CREATE INDEX "Competition_countryId_idx" ON "Competition"("countryId");

-- CreateIndex
CREATE INDEX "Competition_type_idx" ON "Competition"("type");

-- CreateIndex
CREATE INDEX "ClubCompetition_competitionId_seasonId_idx" ON "ClubCompetition"("competitionId", "seasonId");

-- CreateIndex
CREATE INDEX "ClubCompetition_clubId_seasonId_idx" ON "ClubCompetition"("clubId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubCompetition_clubId_competitionId_seasonId_key" ON "ClubCompetition"("clubId", "competitionId", "seasonId");

-- CreateIndex
CREATE INDEX "NationalTeamSelection_playerId_idx" ON "NationalTeamSelection"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "NationalTeamSelection_playerId_countryId_level_key" ON "NationalTeamSelection"("playerId", "countryId", "level");

-- CreateIndex
CREATE INDEX "PlayerVideo_playerId_idx" ON "PlayerVideo"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Coach_slug_key" ON "Coach"("slug");

-- CreateIndex
CREATE INDEX "Coach_name_idx" ON "Coach"("name");

-- CreateIndex
CREATE INDEX "Coach_nationalityId_idx" ON "Coach"("nationalityId");

-- CreateIndex
CREATE INDEX "CoachSpell_coachId_idx" ON "CoachSpell"("coachId");

-- CreateIndex
CREATE INDEX "CoachSpell_clubId_endDate_idx" ON "CoachSpell"("clubId", "endDate");

-- CreateIndex
CREATE INDEX "Club_primaryCompetitionId_idx" ON "Club"("primaryCompetitionId");

-- CreateIndex
CREATE INDEX "Club_parentClubId_idx" ON "Club"("parentClubId");

-- CreateIndex
CREATE INDEX "Club_type_idx" ON "Club"("type");

-- CreateIndex
CREATE INDEX "Player_ageCategory_idx" ON "Player"("ageCategory");

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_primaryCompetitionId_fkey" FOREIGN KEY ("primaryCompetitionId") REFERENCES "Competition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_parentClubId_fkey" FOREIGN KEY ("parentClubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubCompetition" ADD CONSTRAINT "ClubCompetition_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubCompetition" ADD CONSTRAINT "ClubCompetition_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubCompetition" ADD CONSTRAINT "ClubCompetition_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NationalTeamSelection" ADD CONSTRAINT "NationalTeamSelection_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NationalTeamSelection" ADD CONSTRAINT "NationalTeamSelection_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerVideo" ADD CONSTRAINT "PlayerVideo_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coach" ADD CONSTRAINT "Coach_nationalityId_fkey" FOREIGN KEY ("nationalityId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachSpell" ADD CONSTRAINT "CoachSpell_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachSpell" ADD CONSTRAINT "CoachSpell_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
