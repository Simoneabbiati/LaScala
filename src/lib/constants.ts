export const EXTRAS_TYPES = [
  "Mime", "Mimi", "Comparse", "Acrobati",
  "Circensi", "Stuntman", "Danzatori", "Illusionista",
] as const;

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
