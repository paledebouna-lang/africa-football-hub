-- CreateEnum
CREATE TYPE "SquadLevel" AS ENUM ('FIRST_TEAM', 'RESERVE', 'YOUTH');

-- AlterTable
ALTER TABLE "MarketValue" DROP COLUMN "valueEur",
ADD COLUMN     "valueUsd" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "squadLevel" "SquadLevel" NOT NULL DEFAULT 'FIRST_TEAM';

-- AlterTable
ALTER TABLE "TrainingCostRate" DROP COLUMN "amountEur",
ADD COLUMN     "amountUsd" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Transfer" DROP COLUMN "feeEur",
ADD COLUMN     "feeUsd" INTEGER;

-- AlterTable
ALTER TABLE "ValueProposal" DROP COLUMN "valueEur",
ADD COLUMN     "valueUsd" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "Player_clubId_squadLevel_idx" ON "Player"("clubId", "squadLevel");
