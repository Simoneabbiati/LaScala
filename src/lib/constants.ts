export const EXTRAS_TYPES = [
  "Mime", "Mimi", "Comparse", "Acrobati",
  "Circensi", "Stuntman", "Danzatori", "Illusionista",
] as const;

export const DEPARTMENTS = [
  { value: "TEAM_CREATIVO", label: "Team Creativo", color: "#e8a598" },
  { value: "CAST", label: "Solisti", color: "#e8a598" },
  { value: "CAST_EXTRAS", label: "Extras", color: "#e8a598" },
  { value: "ORCHESTRA", label: "Orchestra", color: "#a8c4d4" },
  { value: "MAESTRO_DI_SALA", label: "Maestro di Sala", color: "#a8c4d4" },
  { value: "MAESTRI_DI_PALCOSCENICO", label: "Maestri di Palcoscenico", color: "#a8c4d4" },
  { value: "MAESTRO_ALLE_LUCI", label: "Maestro alle Luci", color: "#a8c4d4" },
  { value: "MAESTRO_AI_SOVRATITOLI", label: "Maestro ai Sovratitoli", color: "#a8c4d4" },
  { value: "MACCHINISTI", label: "Reparto Macchinisti", color: "#a8c8a0" },
  { value: "ELETTRICISTI", label: "Reparto Elettricisti", color: "#a8c8a0" },
  { value: "CONSOLLISTA", label: "Consollista", color: "#a8c8a0" },
  { value: "ATTREZZISTI", label: "Reparto Attrezzisti", color: "#a8c8a0" },
  { value: "FONICI", label: "Reparto Fonici", color: "#a8c8a0" },
  { value: "SARTORIA", label: "Reparto Sartoria", color: "#a8c8a0" },
  { value: "TRUCCO_PARRUCCO", label: "Reparto Trucco e Parrucco", color: "#a8c8a0" },
  { value: "AREA_TECNICA", label: "Area Tecnica", color: "#a8c8a0" }, // legacy
] as const;

export type Department = (typeof DEPARTMENTS)[number]["value"];

export const MAESTRI_COLLABORATORI_VALUES = [
  "MAESTRO_DI_SALA", "MAESTRI_DI_PALCOSCENICO", "MAESTRO_ALLE_LUCI", "MAESTRO_AI_SOVRATITOLI",
] as const;

export const TECHNICAL_DEPT_VALUES = [
  "MACCHINISTI", "ELETTRICISTI", "CONSOLLISTA", "ATTREZZISTI",
  "FONICI", "SARTORIA", "TRUCCO_PARRUCCO",
] as const;

export const DEPT_ORDER = [
  "TEAM_CREATIVO", "CAST", "CAST_EXTRAS", "ORCHESTRA",
  "MAESTRO_DI_SALA", "MAESTRI_DI_PALCOSCENICO", "MAESTRO_ALLE_LUCI", "MAESTRO_AI_SOVRATITOLI",
  "MACCHINISTI", "ELETTRICISTI", "CONSOLLISTA", "ATTREZZISTI",
  "FONICI", "SARTORIA", "TRUCCO_PARRUCCO",
  "AREA_TECNICA",
];

export const ACTIVITIES = [
  "Prova di Scena",
  "Prova Musicale",
  "Prova d'Orchestra",
  "Prova Generale",
  "Prova Antigenerale",
  "Prova in Costume",
  "Prova Tecnica",
  "Prova d'Assieme",
  "Prova all'Italiana",
  "Prova di Regia",
  "Regia con Musica",
  "Prove Coro",
  "Sitzprobe",
  "Protagonisti",
  "Filata",
  "A disposizione",
  "Sistemazione",
  "Trucco e Parrucco",
  "Sartoria",
  "Recita",
] as const;

export type Activity = (typeof ACTIVITIES)[number];

export const DEPT_LABEL: Record<string, string> = Object.fromEntries(
  DEPARTMENTS.map((d) => [d.value, d.label])
);

export const DEPT_COLOR: Record<string, string> = Object.fromEntries(
  DEPARTMENTS.map((d) => [d.value, d.color])
);

export const DEPT_BG: Record<string, string> = Object.fromEntries(
  DEPARTMENTS.map((d) => [d.value, `${d.color}44`])
);
