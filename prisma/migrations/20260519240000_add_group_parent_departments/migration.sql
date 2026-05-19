-- Shift Complessi Artistici sub-depts up by 1
UPDATE "Department" SET sortOrder = sortOrder + 1 WHERE value IN ('ORCHESTRA','COMPLESSO_MUSICALE_PALCOSCENICO','ARTISTI_CORO_UOMINI','ARTISTE_CORO_DONNE','CORO_VOCI_BIANCHE','CORPO_DI_BALLO');

-- Shift Maestri Collaboratori sub-depts up by 2
UPDATE "Department" SET sortOrder = sortOrder + 2 WHERE value IN ('MAESTRO_DI_SALA','MAESTRI_DI_PALCOSCENICO','MAESTRO_ALLE_LUCI','MAESTRO_AI_SOVRATITOLI','MAESTRO_CORO_UOMINI','MAESTRO_CORO_DONNE','MAESTRO_CORO_VOCI_BIANCHE');

-- Shift Reparti Tecnici sub-depts up by 3
UPDATE "Department" SET sortOrder = sortOrder + 3 WHERE value IN ('MACCHINISTI','ELETTRICISTI','CONSOLLISTA','ATTREZZISTI','FONICI','SARTORIA','TRUCCO_PARRUCCO');

-- Insert parent departments (appear first in their group)
INSERT INTO "Department" (id, value, label, color, "group", sortOrder, isCustom) VALUES
('dept_complessi_art_parent',   'COMPLESSI_ARTISTICI',   'Complessi Artistici',   '#3d7ebf', 'Complessi Artistici',   4,  0),
('dept_maestri_collab_parent',  'MAESTRI_COLLABORATORI', 'Maestri Collaboratori', '#7b5ea7', 'Maestri Collaboratori', 11, 0),
('dept_reparti_tecnici_parent', 'REPARTI_TECNICI',       'Reparti Tecnici',       '#a8c8a0', 'Reparti Tecnici',       19, 0);
