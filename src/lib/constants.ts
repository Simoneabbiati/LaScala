export const DEPARTMENTS = [
  { value: "TEAM_CREATIVO", label: "Team Creativo", color: "#e8a598" },
  { value: "CAST", label: "Cast", color: "#e8a598" },
  { value: "ORCHESTRA", label: "Orchestra", color: "#a8c4d4" },
  { value: "MAESTRI_COLLABORATORI", label: "Maestri Collaboratori", color: "#a8c4d4" },
  { value: "AREA_TECNICA", label: "Area Tecnica", color: "#a8c8a0" },
] as const;

export type Department = (typeof DEPARTMENTS)[number]["value"];

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
