-- CreateEnum
CREATE TYPE "NewsOrigin" AS ENUM ('MANUAL', 'AUTO');

-- AlterTable
ALTER TABLE "NewsItem" ADD COLUMN     "origin" "NewsOrigin" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "sourceName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "NewsItem_sourceUrl_key" ON "NewsItem"("sourceUrl");
