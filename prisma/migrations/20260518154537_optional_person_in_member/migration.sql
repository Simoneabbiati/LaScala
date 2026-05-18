-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProductionMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT,
    "productionId" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "characterName" TEXT,
    "notes" TEXT,
    CONSTRAINT "ProductionMember_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProductionMember_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProductionMember" ("characterName", "department", "id", "notes", "personId", "productionId", "roleTitle") SELECT "characterName", "department", "id", "notes", "personId", "productionId", "roleTitle" FROM "ProductionMember";
DROP TABLE "ProductionMember";
ALTER TABLE "new_ProductionMember" RENAME TO "ProductionMember";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
