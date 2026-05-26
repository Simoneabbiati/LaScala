-- Add conductor fields to ProductionMember
ALTER TABLE "ProductionMember" ADD COLUMN "conductorName" TEXT;
ALTER TABLE "ProductionMember" ADD COLUMN "conductorEmail" TEXT;
ALTER TABLE "ProductionMember" ADD COLUMN "conductorPhone" TEXT;

-- Data migration A: members stored as the linked sub-dept (MAESTRO_CORO_*)
-- For each MAESTRO_CORO_* member, copy person fields into the parent section's conductor fields
UPDATE "ProductionMember" AS parent
SET
  "conductorName"  = (SELECT p.name  FROM "Person" p JOIN "ProductionMember" sub ON sub."personId" = p.id WHERE sub.department = 'MAESTRO_CORO_UOMINI' AND sub."productionId" = parent."productionId" LIMIT 1),
  "conductorEmail" = (SELECT p.email FROM "Person" p JOIN "ProductionMember" sub ON sub."personId" = p.id WHERE sub.department = 'MAESTRO_CORO_UOMINI' AND sub."productionId" = parent."productionId" LIMIT 1),
  "conductorPhone" = (SELECT p.phone FROM "Person" p JOIN "ProductionMember" sub ON sub."personId" = p.id WHERE sub.department = 'MAESTRO_CORO_UOMINI' AND sub."productionId" = parent."productionId" LIMIT 1)
WHERE parent.department = 'ARTISTI_CORO_UOMINI'
  AND EXISTS (SELECT 1 FROM "ProductionMember" sub WHERE sub.department = 'MAESTRO_CORO_UOMINI' AND sub."productionId" = parent."productionId");

UPDATE "ProductionMember" AS parent
SET
  "conductorName"  = (SELECT p.name  FROM "Person" p JOIN "ProductionMember" sub ON sub."personId" = p.id WHERE sub.department = 'MAESTRO_CORO_DONNE' AND sub."productionId" = parent."productionId" LIMIT 1),
  "conductorEmail" = (SELECT p.email FROM "Person" p JOIN "ProductionMember" sub ON sub."personId" = p.id WHERE sub.department = 'MAESTRO_CORO_DONNE' AND sub."productionId" = parent."productionId" LIMIT 1),
  "conductorPhone" = (SELECT p.phone FROM "Person" p JOIN "ProductionMember" sub ON sub."personId" = p.id WHERE sub.department = 'MAESTRO_CORO_DONNE' AND sub."productionId" = parent."productionId" LIMIT 1)
WHERE parent.department = 'ARTISTE_CORO_DONNE'
  AND EXISTS (SELECT 1 FROM "ProductionMember" sub WHERE sub.department = 'MAESTRO_CORO_DONNE' AND sub."productionId" = parent."productionId");

UPDATE "ProductionMember" AS parent
SET
  "conductorName"  = (SELECT p.name  FROM "Person" p JOIN "ProductionMember" sub ON sub."personId" = p.id WHERE sub.department = 'MAESTRO_CORO_VOCI_BIANCHE' AND sub."productionId" = parent."productionId" LIMIT 1),
  "conductorEmail" = (SELECT p.email FROM "Person" p JOIN "ProductionMember" sub ON sub."personId" = p.id WHERE sub.department = 'MAESTRO_CORO_VOCI_BIANCHE' AND sub."productionId" = parent."productionId" LIMIT 1),
  "conductorPhone" = (SELECT p.phone FROM "Person" p JOIN "ProductionMember" sub ON sub."personId" = p.id WHERE sub.department = 'MAESTRO_CORO_VOCI_BIANCHE' AND sub."productionId" = parent."productionId" LIMIT 1)
WHERE parent.department = 'CORO_VOCI_BIANCHE'
  AND EXISTS (SELECT 1 FROM "ProductionMember" sub WHERE sub.department = 'MAESTRO_CORO_VOCI_BIANCHE' AND sub."productionId" = parent."productionId");

-- Data migration B: members stored under the umbrella "MAESTRI_COLLABORATORI" with one of the
-- Maestro del Coro role titles. Migrate them into the matching parent section's conductor fields.
UPDATE "ProductionMember" AS parent
SET
  "conductorName"  = COALESCE(parent."conductorName",  (SELECT p.name  FROM "Person" p JOIN "ProductionMember" sub ON sub."personId" = p.id WHERE sub.department = 'MAESTRI_COLLABORATORI' AND sub."roleTitle" = 'Maestro del Coro (Uomini)' AND sub."productionId" = parent."productionId" LIMIT 1)),
  "conductorEmail" = COALESCE(parent."conductorEmail", (SELECT p.email FROM "Person" p JOIN "ProductionMember" sub ON sub."personId" = p.id WHERE sub.department = 'MAESTRI_COLLABORATORI' AND sub."roleTitle" = 'Maestro del Coro (Uomini)' AND sub."productionId" = parent."productionId" LIMIT 1)),
  "conductorPhone" = COALESCE(parent."conductorPhone", (SELECT p.phone FROM "Person" p JOIN "ProductionMember" sub ON sub."personId" = p.id WHERE sub.department = 'MAESTRI_COLLABORATORI' AND sub."roleTitle" = 'Maestro del Coro (Uomini)' AND sub."productionId" = parent."productionId" LIMIT 1))
WHERE parent.department = 'ARTISTI_CORO_UOMINI';

UPDATE "ProductionMember" AS parent
SET
  "conductorName"  = COALESCE(parent."conductorName",  (SELECT p.name  FROM "Person" p JOIN "ProductionMember" sub ON sub."personId" = p.id WHERE sub.department = 'MAESTRI_COLLABORATORI' AND sub."roleTitle" = 'Maestro del Coro (Donne)' AND sub."productionId" = parent."productionId" LIMIT 1)),
  "conductorEmail" = COALESCE(parent."conductorEmail", (SELECT p.email FROM "Person" p JOIN "ProductionMember" sub ON sub."personId" = p.id WHERE sub.department = 'MAESTRI_COLLABORATORI' AND sub."roleTitle" = 'Maestro del Coro (Donne)' AND sub."productionId" = parent."productionId" LIMIT 1)),
  "conductorPhone" = COALESCE(parent."conductorPhone", (SELECT p.phone FROM "Person" p JOIN "ProductionMember" sub ON sub."personId" = p.id WHERE sub.department = 'MAESTRI_COLLABORATORI' AND sub."roleTitle" = 'Maestro del Coro (Donne)' AND sub."productionId" = parent."productionId" LIMIT 1))
WHERE parent.department = 'ARTISTE_CORO_DONNE';

UPDATE "ProductionMember" AS parent
SET
  "conductorName"  = COALESCE(parent."conductorName",  (SELECT p.name  FROM "Person" p JOIN "ProductionMember" sub ON sub."personId" = p.id WHERE sub.department = 'MAESTRI_COLLABORATORI' AND sub."roleTitle" = 'Maestro del Coro Voci Bianche' AND sub."productionId" = parent."productionId" LIMIT 1)),
  "conductorEmail" = COALESCE(parent."conductorEmail", (SELECT p.email FROM "Person" p JOIN "ProductionMember" sub ON sub."personId" = p.id WHERE sub.department = 'MAESTRI_COLLABORATORI' AND sub."roleTitle" = 'Maestro del Coro Voci Bianche' AND sub."productionId" = parent."productionId" LIMIT 1)),
  "conductorPhone" = COALESCE(parent."conductorPhone", (SELECT p.phone FROM "Person" p JOIN "ProductionMember" sub ON sub."personId" = p.id WHERE sub.department = 'MAESTRI_COLLABORATORI' AND sub."roleTitle" = 'Maestro del Coro Voci Bianche' AND sub."productionId" = parent."productionId" LIMIT 1))
WHERE parent.department = 'CORO_VOCI_BIANCHE';

-- Delete obsolete OdgEntry rows pointing at maestro coro members (FK cascade will remove them
-- automatically when we delete the members, but doing it explicitly first keeps the order clean).

-- Delete the now-migrated maestro coro members
DELETE FROM "ProductionMember"
WHERE department IN ('MAESTRO_CORO_UOMINI', 'MAESTRO_CORO_DONNE', 'MAESTRO_CORO_VOCI_BIANCHE');

-- Delete MAESTRI_COLLABORATORI members whose role title was one of the migrated maestro coro roles
DELETE FROM "ProductionMember"
WHERE department = 'MAESTRI_COLLABORATORI'
  AND "roleTitle" IN ('Maestro del Coro (Uomini)', 'Maestro del Coro (Donne)', 'Maestro del Coro Voci Bianche');

-- Delete the obsolete Department definitions
DELETE FROM "Department"
WHERE value IN ('MAESTRO_CORO_UOMINI', 'MAESTRO_CORO_DONNE', 'MAESTRO_CORO_VOCI_BIANCHE');
