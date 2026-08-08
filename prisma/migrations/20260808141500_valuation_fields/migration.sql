-- CreateEnum
CREATE TYPE "ValuationSource" AS ENUM ('MANUAL', 'ALGORITHM');

-- AlterTable
ALTER TABLE "Competition" ADD COLUMN     "strengthCoefficient" DOUBLE PRECISION NOT NULL DEFAULT 1.0;

-- AlterTable
ALTER TABLE "MarketValue" ADD COLUMN     "breakdown" JSONB,
ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "source" "ValuationSource" NOT NULL DEFAULT 'MANUAL';
