import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, HeadingLevel, AlignmentType, WidthType, BorderStyle,
  ShadingType, convertInchesToTwip, PageOrientation,
} from "docx";
import { DEPT_LABEL, DEPT_COLOR } from "@/lib/constants";

const DEPT_ORDER = ["TEAM_CREATIVO", "CAST", "ORCHESTRA", "MAESTRI_COLLABORATORI", "AREA_TECNICA"];

function hexToDocxColor(hex: string): string {
  return hex.replace("#", "");
}

function lightenHex(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.min(255, r + 80).toString(16).padStart(2, "0");
  const lg = Math.min(255, g + 80).toString(16).padStart(2, "0");
  const lb = Math.min(255, b + 80).toString(16).padStart(2, "0");
  return `${lr}${lg}${lb}`;
}

const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD" };

function headerCell(text: string): TableCell {
  return new TableCell({
    shading: { type: ShadingType.SOLID, color: "F0F0F0" },
    borders: { top: thinBorder, bottom: thinBorder, left: noBorder, right: noBorder },
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, size: 16, color: "555555" })],
    })],
  });
}

function dataCell(text: string, opts?: { bold?: boolean; italic?: boolean; size?: number }): TableCell {
  return new TableCell({
    borders: { top: thinBorder, bottom: thinBorder, left: noBorder, right: noBorder },
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph({
      children: [new TextRun({ text, bold: opts?.bold, italics: opts?.italic, size: opts?.size ?? 18 })],
    })],
  });
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const odg = await prisma.odg.findUnique({
    where: { id },
    include: {
      production: { include: { theatre: true } },
      sessions: { include: { location: true }, orderBy: { sortOrder: "asc" } },
      entries: {
        include: { member: { include: { person: true } }, location: true },
        orderBy: [{ member: { department: "asc" } }, { sortOrder: "asc" }],
      },
    },
  });

  if (!odg) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const dateLabel = new Date(odg.date).toLocaleDateString("it-IT", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const entriesByDept = DEPT_ORDER.reduce<Record<string, typeof odg.entries>>((acc, dept) => {
    acc[dept] = odg.entries.filter((e) => e.member.department === dept);
    return acc;
  }, {});

  const children: (Paragraph | Table)[] = [];

  // ── Header block ──
  children.push(new Paragraph({
    children: [new TextRun({ text: odg.production.theatre.name, bold: true, size: 28 })],
    spacing: { after: 40 },
  }));
  children.push(new Paragraph({
    children: [
      new TextRun({ text: odg.production.title, bold: true, size: 36, color: "C0392B" }),
      ...(odg.production.composer ? [new TextRun({ text: `  —  ${odg.production.composer}`, size: 20, color: "777777" })] : []),
    ],
    spacing: { after: 40 },
  }));
  children.push(new Paragraph({
    children: [
      new TextRun({ text: "Ordine del giorno  ", bold: true, size: 24 }),
      new TextRun({ text: capitalize(dateLabel), size: 22, color: "444444" }),
    ],
    spacing: { after: 240 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD" } },
  }));

  // ── Programma del giorno ──
  if (odg.sessions.length > 0) {
    children.push(new Paragraph({
      children: [new TextRun({ text: "PROGRAMMA DEL GIORNO", bold: true, size: 18, color: "555555" })],
      spacing: { after: 80 },
    }));
    const sessionTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: thinBorder, insideV: noBorder },
      rows: odg.sessions.map((s) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 22, type: WidthType.PERCENTAGE },
              borders: { top: thinBorder, bottom: thinBorder, left: noBorder, right: noBorder },
              margins: { top: 60, bottom: 60, left: 80, right: 80 },
              children: [new Paragraph({ children: [new TextRun({ text: `${s.startTime} – ${s.endTime}`, size: 18, font: "Courier New" })] })],
            }),
            new TableCell({
              width: { size: 78, type: WidthType.PERCENTAGE },
              borders: { top: thinBorder, bottom: thinBorder, left: noBorder, right: noBorder },
              margins: { top: 60, bottom: 60, left: 80, right: 80 },
              children: [new Paragraph({
                children: [
                  new TextRun({ text: s.activity, bold: true, size: 18 }),
                  ...(s.location ? [new TextRun({ text: `  (${s.location.name})`, size: 16, color: "777777" })] : []),
                ],
              })],
            }),
          ],
        })
      ),
    });
    children.push(sessionTable);
    children.push(new Paragraph({ spacing: { after: 240 } }));
  }

  // ── Dept sections ──
  for (const dept of DEPT_ORDER) {
    const entries = entriesByDept[dept];
    if (!entries?.length) continue;
    const bgColor = lightenHex(DEPT_COLOR[dept]);

    // Dept header row
    children.push(new Paragraph({
      children: [new TextRun({ text: DEPT_LABEL[dept].toUpperCase(), bold: true, size: 18 })],
      shading: { type: ShadingType.SOLID, color: bgColor },
      spacing: { before: 160, after: 0 },
      indent: { left: convertInchesToTwip(0.1) },
    }));

    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: thinBorder, insideV: noBorder },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            headerCell("NOMINATIVO"),
            headerCell("ORARIO"),
            headerCell("ATTIVITÀ"),
            headerCell("LUOGO"),
            headerCell("NOTE"),
          ],
        }),
        ...entries.map((entry) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: 26, type: WidthType.PERCENTAGE },
                borders: { top: thinBorder, bottom: thinBorder, left: noBorder, right: noBorder },
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [
                  new Paragraph({ children: [new TextRun({ text: entry.member.person.name, bold: true, size: 18 })] }),
                  new Paragraph({ children: [new TextRun({ text: entry.member.roleTitle, italics: true, size: 15, color: "666666" })] }),
                ],
              }),
              dataCell(`${entry.startTime} – ${entry.endTime}`),
              dataCell(entry.activity),
              dataCell(entry.location?.name ?? "—"),
              dataCell(entry.notes ?? "—"),
            ],
          })
        ),
      ],
    });

    children.push(table);
    children.push(new Paragraph({ spacing: { after: 80 } }));
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="ODG-${odg.production.title}-${odg.date.toString().slice(0, 10)}.docx"`,
    },
  });
}
