export type PresetFigure =
  | { kind: "role"; department: string; roleTitle: string; required: boolean }
  | { kind: "dept"; department: string;                    required: boolean }
  | { kind: "all";                                          required: boolean };

const ROLE_REGISTA               = { kind: "role" as const, department: "TEAM_CREATIVO", roleTitle: "Regista",                      required: true };
const ROLE_ASS_REGIA             = { kind: "role" as const, department: "TEAM_CREATIVO", roleTitle: "Assistente alla Regia",        required: true };
const ROLE_DIRETTORE             = { kind: "role" as const, department: "TEAM_CREATIVO", roleTitle: "Direttore d'Orchestra",        required: true };
const ROLE_DIR_COMPL             = { kind: "role" as const, department: "TEAM_CREATIVO", roleTitle: "Direttore del Complesso Musicale di Palcoscenico", required: true };
const ROLE_COSTUMISTA            = { kind: "role" as const, department: "TEAM_CREATIVO", roleTitle: "Costumista",                   required: true };
const ROLE_SCENOGRAFO            = { kind: "role" as const, department: "TEAM_CREATIVO", roleTitle: "Scenografo",                   required: true };
const ROLE_ASS_SCENOGRAFO        = { kind: "role" as const, department: "TEAM_CREATIVO", roleTitle: "Assistente alle Scene",        required: true };
const ROLE_LIGHTING              = { kind: "role" as const, department: "TEAM_CREATIVO", roleTitle: "Light Designer",               required: true };
const ROLE_VIDEO                 = { kind: "role" as const, department: "TEAM_CREATIVO", roleTitle: "Video Designer",               required: true };
const ROLE_COMPARSE              = { kind: "role" as const, department: "CAST_EXTRAS",  roleTitle: "Comparse",                     required: true };
const ROLE_MIMI                  = { kind: "role" as const, department: "CAST_EXTRAS",  roleTitle: "Mimi",                         required: true };
const ROLE_MIME                  = { kind: "role" as const, department: "CAST_EXTRAS",  roleTitle: "Mime",                         required: true };
const DEPT_CAST                  = { kind: "dept" as const, department: "CAST",                                                     required: true };
const DEPT_TEAM_CREATIVO         = { kind: "dept" as const, department: "TEAM_CREATIVO",                                            required: true };
const DEPT_MAESTRO_DI_SALA       = { kind: "dept" as const, department: "MAESTRO_DI_SALA",                                          required: true };
const DEPT_MAESTRI_PALCO         = { kind: "dept" as const, department: "MAESTRI_DI_PALCOSCENICO",                                  required: true };
const DEPT_MAESTRO_ALLE_LUCI     = { kind: "dept" as const, department: "MAESTRO_ALLE_LUCI",                                        required: true };
const DEPT_ORCHESTRA             = { kind: "dept" as const, department: "ORCHESTRA",                                                required: true };
const DEPT_COMPL_MUSICALE        = { kind: "dept" as const, department: "COMPLESSO_MUSICALE_PALCOSCENICO",                          required: true };
const DEPT_CORO_UOMINI           = { kind: "dept" as const, department: "ARTISTI_CORO_UOMINI",                                      required: true };
const DEPT_CORO_DONNE            = { kind: "dept" as const, department: "ARTISTE_CORO_DONNE",                                       required: true };
const DEPT_CORO_VOCI_BIANCHE     = { kind: "dept" as const, department: "CORO_VOCI_BIANCHE",                                        required: true };
const DEPT_MACCHINISTI           = { kind: "dept" as const, department: "MACCHINISTI",                                              required: true };
const DEPT_ELETTRICISTI          = { kind: "dept" as const, department: "ELETTRICISTI",                                             required: true };
const DEPT_CONSOLLISTA           = { kind: "dept" as const, department: "CONSOLLISTA",                                              required: true };
const DEPT_ATTREZZISTI           = { kind: "dept" as const, department: "ATTREZZISTI",                                              required: true };
const DEPT_FONICI                = { kind: "dept" as const, department: "FONICI",                                                   required: true };
const DEPT_SARTORIA              = { kind: "dept" as const, department: "SARTORIA",                                                 required: true };
const DEPT_TRUCCO_PARRUCCO       = { kind: "dept" as const, department: "TRUCCO_PARRUCCO",                                          required: true };
const ALL_REPARTI                = { kind: "all"  as const, required: true };

const optional = (f: PresetFigure): PresetFigure => ({ ...f, required: false } as PresetFigure);

export const ACTIVITY_PRESETS: Record<string, PresetFigure[]> = {
  "Prova di Scena": [
    ROLE_REGISTA, ROLE_ASS_REGIA,
    DEPT_CAST,
    DEPT_MAESTRO_DI_SALA, DEPT_MAESTRI_PALCO,
  ],
  "Prova Musicale": [
    ROLE_DIRETTORE,
    DEPT_CAST,
    DEPT_MAESTRO_DI_SALA,
    optional(DEPT_CORO_UOMINI), optional(DEPT_CORO_DONNE),
  ],
  "Prova Italiana": [
    ROLE_DIRETTORE,
    DEPT_CAST,
    DEPT_ORCHESTRA,
    DEPT_COMPL_MUSICALE, ROLE_DIR_COMPL,
    DEPT_CORO_UOMINI, DEPT_CORO_DONNE,
    DEPT_CORO_VOCI_BIANCHE,
  ],
  "Antepiano": [
    ROLE_REGISTA, ROLE_ASS_REGIA,
    DEPT_CAST,
    { kind: "dept", department: "CAST_EXTRAS", required: true },
    DEPT_MAESTRO_DI_SALA, DEPT_MAESTRI_PALCO, DEPT_MAESTRO_ALLE_LUCI,
    DEPT_MACCHINISTI, DEPT_ELETTRICISTI, DEPT_ATTREZZISTI, DEPT_FONICI,
    DEPT_TRUCCO_PARRUCCO, DEPT_SARTORIA,
  ],
  "Prova d'Insieme": [ALL_REPARTI],
  "Prova Tecnica": [
    ROLE_REGISTA, ROLE_ASS_REGIA,
    DEPT_MACCHINISTI, DEPT_ELETTRICISTI, DEPT_ATTREZZISTI,
  ],
  "Prova Luci": [
    ROLE_REGISTA, ROLE_ASS_REGIA,
    ROLE_LIGHTING,
    ROLE_COMPARSE, ROLE_MIMI, ROLE_MIME,
    DEPT_MACCHINISTI,
    DEPT_ELETTRICISTI, DEPT_CONSOLLISTA,
    DEPT_ATTREZZISTI,
  ],
  "Prova Luci e Video": [
    ROLE_REGISTA, ROLE_ASS_REGIA,
    ROLE_LIGHTING, ROLE_VIDEO,
    ROLE_COMPARSE, ROLE_MIMI, ROLE_MIME,
    DEPT_MACCHINISTI,
    DEPT_ELETTRICISTI, DEPT_CONSOLLISTA,
    DEPT_ATTREZZISTI,
  ],
  "Prova Costume": [
    ROLE_COSTUMISTA,
    DEPT_CAST,
    DEPT_SARTORIA,
  ],
  "Prova Trucco e Parrucco": [
    ROLE_COSTUMISTA,
    DEPT_CAST,
    DEPT_SARTORIA, DEPT_TRUCCO_PARRUCCO,
  ],
  "Prova Riepilogativa": [
    ROLE_DIRETTORE,
    DEPT_ORCHESTRA,
  ],
  "Assestamento": [
    ROLE_DIRETTORE,
    DEPT_ORCHESTRA,
  ],
  "1ª Rappresentazione": [ALL_REPARTI],
  "2ª Rappresentazione": [ALL_REPARTI],
  "3ª Rappresentazione": [ALL_REPARTI],
  "A Disposizione della Tecnica": [
    DEPT_MACCHINISTI, DEPT_ELETTRICISTI, DEPT_ATTREZZISTI, DEPT_FONICI,
  ],
  "A Disposizione della Tecnica e delle Luci": [
    DEPT_MACCHINISTI,
    DEPT_ELETTRICISTI, DEPT_CONSOLLISTA,
    DEPT_ATTREZZISTI, DEPT_FONICI,
  ],
  "Conferenza Stampa": [
    DEPT_CAST,
    DEPT_TEAM_CREATIVO,
  ],
  "Montaggio": [
    ROLE_SCENOGRAFO, ROLE_ASS_SCENOGRAFO,
    ROLE_REGISTA, ROLE_ASS_REGIA,
    DEPT_MACCHINISTI, DEPT_ELETTRICISTI, DEPT_ATTREZZISTI, DEPT_FONICI,
  ],
  "Antegenerale": [ALL_REPARTI],
  "Generale": [ALL_REPARTI],
  "Prova d'Insieme in Costume": [ALL_REPARTI],
  "Prova di Scena in Costume": [
    ROLE_REGISTA, ROLE_ASS_REGIA,
    DEPT_CAST,
    DEPT_MAESTRO_DI_SALA, DEPT_MAESTRI_PALCO,
    DEPT_SARTORIA, DEPT_TRUCCO_PARRUCCO,
    DEPT_MACCHINISTI,
    DEPT_ELETTRICISTI, DEPT_CONSOLLISTA,
    DEPT_ATTREZZISTI,
  ],
  "Accordatura Cembalo": [
    DEPT_ORCHESTRA,
  ],
};
