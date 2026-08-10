-- CreateEnum
CREATE TYPE "CompetitionGender" AS ENUM ('MALE', 'FEMALE');

-- AlterTable
ALTER TABLE "Competition" ADD COLUMN     "gender" "CompetitionGender" NOT NULL DEFAULT 'MALE';
