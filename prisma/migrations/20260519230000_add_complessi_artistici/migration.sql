-- Add linkedToDept column
ALTER TABLE "Department" ADD COLUMN "linkedToDept" TEXT;

-- Move Orchestra into Complessi Artistici and adjust sortOrder
UPDATE "Department" SET "group" = 'Complessi Artistici', sortOrder = 4 WHERE value = 'ORCHESTRA';

-- Add new Complessi Artistici departments
INSERT INTO "Department" (id, value, label, color, "group", sortOrder, isCustom) VALUES
('dept_compl_mus_palco',   'COMPLESSO_MUSICALE_PALCOSCENICO', 'Complesso Musicale di Palcoscenico', '#3d7ebf', 'Complessi Artistici', 5, 0),
('dept_artisti_coro_u',    'ARTISTI_CORO_UOMINI',             'Artisti del Coro (Uomini)',          '#2d6ea0', 'Complessi Artistici', 6, 0),
('dept_artiste_coro_d',    'ARTISTE_CORO_DONNE',              'Artiste del Coro (Donne)',           '#2d6ea0', 'Complessi Artistici', 7, 0),
('dept_coro_voci_b',       'CORO_VOCI_BIANCHE',               'Coro Voci Bianche',                  '#2d6ea0', 'Complessi Artistici', 8, 0),
('dept_corpo_ballo',       'CORPO_DI_BALLO',                  'Corpo di Ballo',                     '#5b8ad0', 'Complessi Artistici', 9, 0);

-- Push existing Maestri Collaboratori + Reparti Tecnici down
UPDATE "Department" SET sortOrder = 10 WHERE value = 'MAESTRO_DI_SALA';
UPDATE "Department" SET sortOrder = 11 WHERE value = 'MAESTRI_DI_PALCOSCENICO';
UPDATE "Department" SET sortOrder = 12 WHERE value = 'MAESTRO_ALLE_LUCI';
UPDATE "Department" SET sortOrder = 13 WHERE value = 'MAESTRO_AI_SOVRATITOLI';

-- Add Maestri del Coro linked to their choir sections
INSERT INTO "Department" (id, value, label, color, "group", sortOrder, isCustom, "linkedToDept") VALUES
('dept_maestro_coro_u',  'MAESTRO_CORO_UOMINI',       'Maestro del Coro (Uomini)',       '#7b5ea7', 'Maestri Collaboratori', 14, 0, 'ARTISTI_CORO_UOMINI'),
('dept_maestro_coro_d',  'MAESTRO_CORO_DONNE',        'Maestro del Coro (Donne)',        '#7b5ea7', 'Maestri Collaboratori', 15, 0, 'ARTISTE_CORO_DONNE'),
('dept_maestro_coro_vb', 'MAESTRO_CORO_VOCI_BIANCHE', 'Maestro del Coro Voci Bianche',  '#7b5ea7', 'Maestri Collaboratori', 16, 0, 'CORO_VOCI_BIANCHE');

-- Push Reparti Tecnici down
UPDATE "Department" SET sortOrder = 17 WHERE value = 'MACCHINISTI';
UPDATE "Department" SET sortOrder = 18 WHERE value = 'ELETTRICISTI';
UPDATE "Department" SET sortOrder = 19 WHERE value = 'CONSOLLISTA';
UPDATE "Department" SET sortOrder = 20 WHERE value = 'ATTREZZISTI';
UPDATE "Department" SET sortOrder = 21 WHERE value = 'FONICI';
UPDATE "Department" SET sortOrder = 22 WHERE value = 'SARTORIA';
UPDATE "Department" SET sortOrder = 23 WHERE value = 'TRUCCO_PARRUCCO';
