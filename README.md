# LaScala — Gestionale ODG

Web app per la gestione degli **Ordini del Giorno** (ODG) dei Direttori di Scena del Teatro alla Scala e altri teatri italiani.

## Funzionalità

- **Teatri & Sale** — Gestione di più teatri con le relative sale prove e palcoscenico
- **Produzioni** — Ogni opera ha il proprio roster di artisti, tecnici e staff creativo
- **Ordine del Giorno** — Creazione giornaliera con sessioni (programma del giorno) e chiamate individuali per ogni membro
- **Calendario** — Vista mensile di tutti gli ODG attivi
- **Export PDF** — Generazione del documento ufficiale da distribuire

## Stack

- [Next.js](https://nextjs.org/) 16 — App Router
- [Prisma](https://www.prisma.io/) 7 — ORM con adapter libSQL (SQLite)
- [Tailwind CSS](https://tailwindcss.com/) v4
- [shadcn/ui](https://ui.shadcn.com/) — componenti UI (Base UI)
- [@react-pdf/renderer](https://react-pdf.org/) — generazione PDF

## Setup

```bash
# Installa le dipendenze
npm install

# Genera il client Prisma
npx prisma generate

# Esegui le migration (crea il database locale)
npx prisma migrate dev

# Avvia il server di sviluppo
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

## Struttura

```
src/
├── app/
│   ├── api/          # API routes (productions, odg, theatres)
│   ├── calendar/     # Vista calendario mensile
│   ├── productions/  # Lista produzioni + dettaglio + ODG builder
│   └── theatres/     # Gestione teatri
├── components/       # Componenti riutilizzabili (UI + dominio)
├── lib/
│   ├── constants.ts  # Dipartimenti, attività
│   └── db.ts         # Prisma singleton
prisma/
├── schema.prisma     # Schema del database
└── dev.db            # Database SQLite locale (non incluso nel repo)
```
