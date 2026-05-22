export const DEFAULT_LOCATIONS = [
  "Palcoscenico",
  "Camerone Trucco",
  "Sartoria",
  "Camerini",
  "Buca d'Orchestra",
  "Foyer",
] as const;

export const EXTRAS_TYPES = [
  "Mime", "Mimi", "Comparse", "Acrobati",
  "Circensi", "Stuntman", "Danzatori", "Illusionista",
] as const;

export const REPARTI_TECNICI_TYPES = [
  "Macchinisti", "Elettricisti", "Consollista", "Attrezzisti",
  "Fonici", "Sartoria", "Trucco e Parrucco",
] as const;

export const MAESTRI_COLLABORATORI_TYPES = [
  "Maestro di Sala", "Maestri di Palcoscenico", "Maestro alle Luci",
  "Maestro ai Sovratitoli", "Maestro del Coro (Uomini)",
  "Maestro del Coro (Donne)", "Maestro del Coro Voci Bianche",
] as const;

export const COMPLESSI_ARTISTICI_TYPES = [
  "Orchestra", "Complesso Musicale di Palcoscenico",
  "Artisti del Coro (Uomini)", "Artiste del Coro (Donne)",
  "Coro Voci Bianche", "Corpo di Ballo",
] as const;

export const TEAM_CREATIVO_TYPES = [
  "Regista", "Assistente alla Regia",
  "Scenografo", "Assistente alle Scene",
  "Costumista", "Assistente ai Costumi",
  "Coreografo", "Assistente Coreografo",
  "Movimenti Scenici", "Direttore d'Orchestra",
  "Light Designer", "Video Designer",
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
