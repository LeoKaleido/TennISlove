-- Superfici dei campi (D-075): quelle di ogni circolo e quella su cui si gioca la partita
ALTER TABLE "Club" ADD COLUMN "surfaces" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Match" ADD COLUMN "surface" TEXT;
