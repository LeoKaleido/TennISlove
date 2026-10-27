-- CreateEnum
CREATE TYPE "PredictionSide" AS ENUM ('A', 'B');

-- CreateEnum
CREATE TYPE "PredictionHow" AS ENUM ('TWO_SETS', 'SUPER_TIEBREAK');

-- CreateTable
CREATE TABLE "Prediction" (
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "pick" "PredictionSide" NOT NULL,
    "how" "PredictionHow",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("matchId","playerId")
);

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
