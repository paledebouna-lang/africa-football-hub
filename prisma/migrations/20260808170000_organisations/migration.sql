-- CreateEnum
CREATE TYPE "OrganisationType" AS ENUM ('CLUB', 'ACADEMY', 'AGENCY');

-- CreateEnum
CREATE TYPE "OrganisationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'MANAGER', 'AGENT', 'SCOUT');

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "createdByOrganisationId" TEXT;

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrganisationType" NOT NULL DEFAULT 'CLUB',
    "status" "OrganisationStatus" NOT NULL DEFAULT 'PENDING',
    "clubId" TEXT,
    "country" TEXT,
    "city" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "websiteUrl" TEXT,
    "logoUrl" TEXT,
    "registration" TEXT,
    "claimNote" TEXT,
    "createdById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganisationMember" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MANAGER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganisationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerRepresentation" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerRepresentation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_slug_key" ON "Organisation"("slug");

-- CreateIndex
CREATE INDEX "Organisation_status_idx" ON "Organisation"("status");

-- CreateIndex
CREATE INDEX "Organisation_clubId_idx" ON "Organisation"("clubId");

-- CreateIndex
CREATE INDEX "Organisation_type_idx" ON "Organisation"("type");

-- CreateIndex
CREATE INDEX "OrganisationMember_userId_idx" ON "OrganisationMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganisationMember_organisationId_userId_key" ON "OrganisationMember"("organisationId", "userId");

-- CreateIndex
CREATE INDEX "PlayerRepresentation_playerId_endDate_idx" ON "PlayerRepresentation"("playerId", "endDate");

-- CreateIndex
CREATE INDEX "PlayerRepresentation_organisationId_idx" ON "PlayerRepresentation"("organisationId");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_createdByOrganisationId_fkey" FOREIGN KEY ("createdByOrganisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organisation" ADD CONSTRAINT "Organisation_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organisation" ADD CONSTRAINT "Organisation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organisation" ADD CONSTRAINT "Organisation_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationMember" ADD CONSTRAINT "OrganisationMember_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationMember" ADD CONSTRAINT "OrganisationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerRepresentation" ADD CONSTRAINT "PlayerRepresentation_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerRepresentation" ADD CONSTRAINT "PlayerRepresentation_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
