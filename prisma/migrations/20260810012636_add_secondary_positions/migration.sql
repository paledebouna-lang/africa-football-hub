-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "secondaryPositions" "Position"[] DEFAULT ARRAY[]::"Position"[];
