-- CreateEnum
CREATE TYPE "Position" AS ENUM ('GK', 'CB', 'LB', 'RB', 'DM', 'CM', 'AM', 'LW', 'RW', 'ST');

-- CreateEnum
CREATE TYPE "Foot" AS ENUM ('LEFT', 'RIGHT', 'BOTH');

-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('PERMANENT', 'LOAN', 'LOAN_RETURN', 'FREE', 'END_OF_CONTRACT', 'YOUTH_PROMOTION', 'RETIRED');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'MODERATOR', 'ADMIN');

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "flagUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 1,
    "logoUrl" TEXT,
    "countryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "shortName" TEXT,
    "city" TEXT,
    "stadium" TEXT,
    "founded" INTEGER,
    "logoUrl" TEXT,
    "leagueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "position" "Position",
    "foot" "Foot",
    "heightCm" INTEGER,
    "shirtNumber" INTEGER,
    "contractUntil" TIMESTAMP(3),
    "agent" TEXT,
    "photoUrl" TEXT,
    "clubId" TEXT,
    "nationalityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "fromClubId" TEXT,
    "toClubId" TEXT,
    "seasonId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "TransferType" NOT NULL DEFAULT 'PERMANENT',
    "feeEur" INTEGER,
    "isFeeUndisclosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketValue" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "valueEur" INTEGER NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValueProposal" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "valueEur" INTEGER NOT NULL,
    "comment" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValueProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Country_slug_key" ON "Country"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");

-- CreateIndex
CREATE UNIQUE INDEX "League_slug_key" ON "League"("slug");

-- CreateIndex
CREATE INDEX "League_countryId_idx" ON "League"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "Club_slug_key" ON "Club"("slug");

-- CreateIndex
CREATE INDEX "Club_leagueId_idx" ON "Club"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_slug_key" ON "Player"("slug");

-- CreateIndex
CREATE INDEX "Player_clubId_idx" ON "Player"("clubId");

-- CreateIndex
CREATE INDEX "Player_nationalityId_idx" ON "Player"("nationalityId");

-- CreateIndex
CREATE INDEX "Player_name_idx" ON "Player"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Season_label_key" ON "Season"("label");

-- CreateIndex
CREATE INDEX "Transfer_playerId_idx" ON "Transfer"("playerId");

-- CreateIndex
CREATE INDEX "Transfer_date_idx" ON "Transfer"("date");

-- CreateIndex
CREATE INDEX "Transfer_seasonId_idx" ON "Transfer"("seasonId");

-- CreateIndex
CREATE INDEX "MarketValue_playerId_effectiveAt_idx" ON "MarketValue"("playerId", "effectiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_username_key" ON "UserProfile"("username");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_email_key" ON "UserProfile"("email");

-- CreateIndex
CREATE INDEX "ValueProposal_playerId_status_idx" ON "ValueProposal"("playerId", "status");

-- CreateIndex
CREATE INDEX "ValueProposal_userId_idx" ON "ValueProposal"("userId");

-- CreateIndex
CREATE INDEX "ValueProposal_status_idx" ON "ValueProposal"("status");

-- AddForeignKey
ALTER TABLE "League" ADD CONSTRAINT "League_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_nationalityId_fkey" FOREIGN KEY ("nationalityId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_fromClubId_fkey" FOREIGN KEY ("fromClubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_toClubId_fkey" FOREIGN KEY ("toClubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketValue" ADD CONSTRAINT "MarketValue_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValueProposal" ADD CONSTRAINT "ValueProposal_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValueProposal" ADD CONSTRAINT "ValueProposal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValueProposal" ADD CONSTRAINT "ValueProposal_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
