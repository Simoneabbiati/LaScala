-- CreateTable
CREATE TABLE "Opera" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wikidataId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "composer" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OperaCharacter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "voiceType" TEXT,
    CONSTRAINT "OperaCharacter_operaId_fkey" FOREIGN KEY ("operaId") REFERENCES "Opera" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Opera_wikidataId_key" ON "Opera"("wikidataId");

-- CreateIndex
CREATE UNIQUE INDEX "OperaCharacter_operaId_name_key" ON "OperaCharacter"("operaId", "name");
