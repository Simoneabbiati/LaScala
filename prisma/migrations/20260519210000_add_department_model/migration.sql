-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#cccccc',
    "group" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isCustom" BOOLEAN NOT NULL DEFAULT false
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_value_key" ON "Department"("value");

-- Seed system departments
INSERT INTO "Department" ("id", "value", "label", "color", "group", "sortOrder", "isCustom") VALUES
('dept_cast',                   'CAST',                    'Solisti',                   '#e8a598', 'Compagnia',            1,  0),
('dept_cast_extras',            'CAST_EXTRAS',             'Extras',                    '#e8a598', 'Compagnia',            2,  0),
('dept_team_creativo',          'TEAM_CREATIVO',           'Team Creativo',             '#e8a598', NULL,                   3,  0),
('dept_orchestra',              'ORCHESTRA',               'Orchestra',                 '#a8c4d4', 'Musica',               4,  0),
('dept_maestro_di_sala',        'MAESTRO_DI_SALA',         'Maestro di Sala',           '#a8c4d4', 'Maestri Collaboratori', 5, 0),
('dept_maestri_di_palcoscenico','MAESTRI_DI_PALCOSCENICO', 'Maestri di Palcoscenico',   '#a8c4d4', 'Maestri Collaboratori', 6, 0),
('dept_maestro_alle_luci',      'MAESTRO_ALLE_LUCI',       'Maestro alle Luci',         '#a8c4d4', 'Maestri Collaboratori', 7, 0),
('dept_maestro_ai_sovratitoli', 'MAESTRO_AI_SOVRATITOLI',  'Maestro ai Sovratitoli',    '#a8c4d4', 'Maestri Collaboratori', 8, 0),
('dept_macchinisti',            'MACCHINISTI',             'Reparto Macchinisti',       '#a8c8a0', 'Reparti Tecnici',      9,  0),
('dept_elettricisti',           'ELETTRICISTI',            'Reparto Elettricisti',      '#a8c8a0', 'Reparti Tecnici',      10, 0),
('dept_consollista',            'CONSOLLISTA',             'Consollista',               '#a8c8a0', 'Reparti Tecnici',      11, 0),
('dept_attrezzisti',            'ATTREZZISTI',             'Reparto Attrezzisti',       '#a8c8a0', 'Reparti Tecnici',      12, 0),
('dept_fonici',                 'FONICI',                  'Reparto Fonici',            '#a8c8a0', 'Reparti Tecnici',      13, 0),
('dept_sartoria',               'SARTORIA',                'Reparto Sartoria',          '#a8c8a0', 'Reparti Tecnici',      14, 0),
('dept_trucco_parrucco',        'TRUCCO_PARRUCCO',         'Reparto Trucco e Parrucco', '#a8c8a0', 'Reparti Tecnici',      15, 0);
