export const DEFAULT_LOCATIONS = [
  "Palcoscenico",
  "Camerone Trucco",
  "Sartoria",
  "Camerini",
  "Buca d'Orchestra",
  "Foyer",
] as const;

export const EXTRAS_TYPES = [
  "Mime", "Mimi", "Comparse", "Figuranti", "Acrobati",
  "Circensi", "Stuntman", "Danzatori", "Illusionista",
] as const;

export const REPARTI_TECNICI_TYPES = [
  "Macchinisti", "Elettricisti", "Consollista", "Attrezzisti",
  "Fonici", "Sartoria", "Trucco e Parrucco", "Logistica",
] as const;

export const MAESTRI_COLLABORATORI_TYPES = [
  "Maestro di Sala", "Maestri di Palcoscenico", "Maestro alle Luci",
  "Maestro ai Sovratitoli",
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
  "Prova Italiana",
  "Antepiano",
  "Prova d'Insieme",
  "Prova Tecnica",
  "Prova Luci",
  "Prova Luci e Video",
  "Prova Costume",
  "Prova Trucco e Parrucco",
  "Prova Riepilogativa",
  "Assestamento",
  "1ª Rappresentazione",
  "2ª Rappresentazione",
  "3ª Rappresentazione",
  "A Disposizione della Tecnica",
  "A Disposizione della Tecnica e delle Luci",
  "Conferenza Stampa",
  "Montaggio",
  "Antegenerale",
  "Generale",
  "Prova d'Insieme in Costume",
  "Prova di Scena in Costume",
  "Accordatura Cembalo",
] as const;

export type Activity = (typeof ACTIVITIES)[number];
