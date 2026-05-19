-- Update department colors to be visually distinct per group

-- Compagnia: warm rose
UPDATE "Department" SET color = '#d9534f' WHERE value = 'CAST';
UPDATE "Department" SET color = '#e07b6a' WHERE value = 'CAST_EXTRAS';

-- Team Creativo: amber
UPDATE "Department" SET color = '#c87d2e' WHERE value = 'TEAM_CREATIVO';

-- Musica: blue
UPDATE "Department" SET color = '#3d7ebf' WHERE value = 'ORCHESTRA';

-- Maestri Collaboratori: violet
UPDATE "Department" SET color = '#7b5ea7' WHERE value = 'MAESTRO_DI_SALA';
UPDATE "Department" SET color = '#7b5ea7' WHERE value = 'MAESTRI_DI_PALCOSCENICO';
UPDATE "Department" SET color = '#7b5ea7' WHERE value = 'MAESTRO_ALLE_LUCI';
UPDATE "Department" SET color = '#7b5ea7' WHERE value = 'MAESTRO_AI_SOVRATITOLI';

-- Reparti Tecnici: teal
UPDATE "Department" SET color = '#2e8b6e' WHERE value = 'MACCHINISTI';
UPDATE "Department" SET color = '#2e8b6e' WHERE value = 'ELETTRICISTI';
UPDATE "Department" SET color = '#2e8b6e' WHERE value = 'CONSOLLISTA';
UPDATE "Department" SET color = '#2e8b6e' WHERE value = 'ATTREZZISTI';
UPDATE "Department" SET color = '#2e8b6e' WHERE value = 'FONICI';
UPDATE "Department" SET color = '#2e8b6e' WHERE value = 'SARTORIA';
UPDATE "Department" SET color = '#2e8b6e' WHERE value = 'TRUCCO_PARRUCCO';
