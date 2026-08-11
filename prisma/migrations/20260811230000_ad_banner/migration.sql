-- CreateEnum
CREATE TYPE "AdPlacement" AS ENUM ('RAIL', 'INLINE');

-- CreateTable
CREATE TABLE "AdBanner" (
    "id" TEXT NOT NULL,
    "placement" "AdPlacement" NOT NULL,
    "imageUrl" TEXT,
    "linkUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdBanner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdBanner_placement_key" ON "AdBanner"("placement");
