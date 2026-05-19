import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import React from "react";
import {
  Document, Page, Text, View, StyleSheet, renderToBuffer,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, padding: 36, paddingBottom: 48, color: "#222222" },
  headerTheatre: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  headerTitle: { fontSize: 15, fontFamily: "Helvetica-Bold", color: "#C0392B", marginBottom: 2 },
  headerComposer: { fontSize: 9, color: "#777777" },
  headerOdg: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 6, marginBottom: 2 },
  headerDate: { fontSize: 9, color: "#444444" },
  divider: { borderBottomWidth: 1, borderBottomColor: "#DDDDDD", marginBottom: 14 },
  sectionTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#555555", backgroundColor: "#F0F0F0", padding: "3 6", marginBottom: 0, textTransform: "uppercase" },
  subTitle: { fontSize: 7, color: "#777777", backgroundColor: "#F5F5F5", padding: "2 6", marginBottom: 0 },
  tableHeader: { flexDirection: "row", backgroundColor: "#F0F0F0", borderBottomWidth: 1, borderBottomColor: "#DDDDDD" },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#EEEEEE" },
  tableCell: { padding: "3 5", fontSize: 8 },
  tableCellBold: { padding: "3 5", fontSize: 8, fontFamily: "Helvetica-Bold" },
  tableCellItalic: { padding: "3 5", fontSize: 7, color: "#666666", fontFamily: "Helvetica-Oblique" },
  colName: { width: "26%" },
  colTime: { width: "14%", fontFamily: "Courier" },
  colActivity: { width: "24%" },
  colLocation: { width: "18%" },
  colNotes: { width: "18%" },
  deptBlock: { marginBottom: 8, marginTop: 6 },
  sessionRow: { flexDirection: "row", padding: "3 0", borderBottomWidth: 1, borderBottomColor: "#EEEEEE" },
  sessionTime: { width: "22%", fontFamily: "Courier", fontSize: 8, color: "#555555" },
  sessionActivity: { flex: 1, fontSize: 8, fontFamily: "Helvetica-Bold" },
  sessionLocation: { fontSize: 7, color: "#777777", marginLeft: 4 },
  footerBox: { borderTopWidth: 1, borderTopColor: "#DDDDDD", marginTop: 12, paddingTop: 8, fontSize: 7, color: "#555555", textAlign: "center" },
  boxSection: { borderWidth: 1, borderColor: "#DDDDDD", marginTop: 14, padding: 8 },
  boxSectionTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#555555", textAlign: "center", marginBottom: 4 },
  boxSectionText: { fontSize: 8 },
});

type OdgEntryType = {
  id: string;
  startTime: string;
  endTime: string;
  activity: string;
  characterName: string | null;
  notes: string | null;
  member: { department: string; roleTitle: string; characterName: string | null; person: { name: string } | null };
  location: { name: string } | null;
};

function EntryTableRows({ entries, isExtras }: { entries: OdgEntryType[]; isExtras: boolean }) {
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(View, { style: styles.tableHeader },
      React.createElement(Text, { style: [styles.tableCell, styles.colName] }, isExtras ? "TIPO" : "NOMINATIVO"),
      React.createElement(Text, { style: [styles.tableCell, styles.colTime] }, "ORARIO"),
      React.createElement(Text, { style: [styles.tableCell, styles.colActivity] }, "ATTIVITÀ"),
      React.createElement(Text, { style: [styles.tableCell, styles.colLocation] }, "LUOGO"),
      React.createElement(Text, { style: [styles.tableCell, styles.colNotes] }, isExtras ? "—" : "NOTE"),
    ),
    ...entries.map((entry) =>
      React.createElement(View, { key: entry.id, style: styles.tableRow },
        React.createElement(View, { style: [styles.colName, { padding: "3 5" }] },
          isExtras
            ? React.createElement(React.Fragment, null,
                React.createElement(Text, { style: { fontSize: 8, fontFamily: "Helvetica-Bold" } }, entry.member.roleTitle),
                entry.characterName ? React.createElement(Text, { style: { fontSize: 7, color: "#666666", fontFamily: "Helvetica-Oblique" } }, `× ${entry.characterName}`) : null,
              )
            : React.createElement(React.Fragment, null,
                React.createElement(Text, { style: { fontSize: 8, fontFamily: "Helvetica-Bold" } }, entry.member.person?.name ?? "—"),
                React.createElement(Text, { style: { fontSize: 7, color: "#666666", fontFamily: "Helvetica-Oblique" } },
                  entry.member.department === "CAST"
                    ? (entry.characterName ?? entry.member.characterName ?? "")
                    : entry.member.roleTitle
                ),
              ),
        ),
        React.createElement(Text, { style: [styles.tableCell, styles.colTime, { fontFamily: "Courier" }] }, `${entry.startTime}–${entry.endTime}`),
        React.createElement(Text, { style: [styles.tableCell, styles.colActivity] }, entry.activity),
        React.createElement(Text, { style: [styles.tableCell, styles.colLocation] }, entry.location?.name ?? "—"),
        React.createElement(Text, { style: [styles.tableCell, styles.colNotes] }, isExtras ? "—" : (entry.notes ?? "—")),
      )
    ),
  );
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

  const departments = await prisma.department.findMany({ orderBy: { sortOrder: "asc" } });
  const deptOrder = departments.map((d) => d.value);
  const deptLabel: Record<string, string> = Object.fromEntries(departments.map((d) => [d.value, d.label]));
  const deptColor: Record<string, string> = Object.fromEntries(departments.map((d) => [d.value, d.color]));
  const linkedByParent = departments.reduce<Record<string, typeof departments>>((acc, d) => {
    if (d.linkedToDept) { (acc[d.linkedToDept] ??= []).push(d); }
    return acc;
  }, {});

  const dateLabel = new Date(odg.date).toLocaleDateString("it-IT", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const customDepts = [...new Set(
    odg.entries.map((e) => e.member.department).filter((d) => !deptOrder.includes(d))
  )];
  const fullDeptOrder = [...deptOrder, ...customDepts];
  const entriesByDept = fullDeptOrder.reduce<Record<string, typeof odg.entries>>((acc, dept) => {
    acc[dept] = odg.entries.filter((e) => e.member.department === dept);
    return acc;
  }, {});

  const { stageManagerName, stageManagerEmail, stageManagerPhone, asstStageManagerName, asstStageManagerEmail, asstStageManagerPhone } = odg.production;

  function lightenHex(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `#${Math.min(255, r + 80).toString(16).padStart(2, "0")}${Math.min(255, g + 80).toString(16).padStart(2, "0")}${Math.min(255, b + 80).toString(16).padStart(2, "0")}`;
  }

  const doc = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", orientation: "landscape", style: styles.page },

      // ── Header ──
      React.createElement(Text, { style: styles.headerTheatre }, odg.production.theatre.name),
      React.createElement(View, { style: { flexDirection: "row", alignItems: "baseline", marginBottom: 2 } },
        React.createElement(Text, { style: styles.headerTitle }, odg.production.title),
        odg.production.composer
          ? React.createElement(Text, { style: [styles.headerComposer, { marginLeft: 6 }] }, `— ${odg.production.composer}`)
          : null,
      ),
      React.createElement(View, { style: { flexDirection: "row", alignItems: "baseline", marginBottom: 10 } },
        React.createElement(Text, { style: styles.headerOdg }, "Ordine del giorno  "),
        React.createElement(Text, { style: styles.headerDate }, capitalize(dateLabel)),
      ),
      React.createElement(View, { style: styles.divider }),

      // ── Programma del giorno ──
      odg.sessions.length > 0
        ? React.createElement(View, { style: { marginBottom: 14 } },
            React.createElement(Text, { style: styles.sectionTitle }, "Programma del giorno"),
            ...odg.sessions.map((s) =>
              React.createElement(View, { key: s.id, style: styles.sessionRow },
                React.createElement(Text, { style: styles.sessionTime }, `${s.startTime} – ${s.endTime}`),
                React.createElement(Text, { style: styles.sessionActivity }, s.activity),
                s.location ? React.createElement(Text, { style: styles.sessionLocation }, `(${s.location.name})`) : null,
              )
            ),
          )
        : null,

      // ── Dept sections ──
      ...fullDeptOrder.flatMap((dept) => {
        if (dept === "CAST_EXTRAS") return [];
        const entries = entriesByDept[dept] ?? [];
        const extrasEntries = dept === "CAST" ? (entriesByDept["CAST_EXTRAS"] ?? []) : [];
        const linked = linkedByParent[dept] ?? [];
        const linkedEntries = linked.flatMap((ld) => entriesByDept[ld.value] ?? []);
        if (!entries.length && !extrasEntries.length && !linkedEntries.length) return [];

        const bgColor = lightenHex(deptColor[dept] ?? "#cccccc");
        const deptSectionLabel = dept === "CAST" ? "Compagnia" : (deptLabel[dept] ?? dept);

        return [
          React.createElement(View, { key: dept, style: styles.deptBlock },
            React.createElement(Text, { style: [styles.sectionTitle, { backgroundColor: bgColor }] }, deptSectionLabel.toUpperCase()),

            entries.length > 0 ? React.createElement(View, null,
              extrasEntries.length > 0 ? React.createElement(Text, { style: styles.subTitle }, "SOLISTI") : null,
              React.createElement(EntryTableRows, { entries, isExtras: false }),
            ) : null,

            extrasEntries.length > 0 ? React.createElement(View, null,
              React.createElement(Text, { style: styles.subTitle }, "EXTRAS"),
              React.createElement(EntryTableRows, { entries: extrasEntries, isExtras: true }),
            ) : null,

            ...linked.map((ld) => {
              const ldEntries = entriesByDept[ld.value] ?? [];
              if (!ldEntries.length) return null;
              return React.createElement(View, { key: ld.value },
                React.createElement(Text, { style: styles.subTitle }, ld.label.toUpperCase()),
                React.createElement(EntryTableRows, { entries: ldEntries, isExtras: false }),
              );
            }),
          ),
        ];
      }),

      // ── Extra events ──
      odg.extraEvents ? React.createElement(View, { style: styles.boxSection },
        React.createElement(Text, { style: styles.boxSectionTitle }, "EVENTI COLLATERALI / EXTRAS"),
        React.createElement(Text, { style: styles.boxSectionText }, odg.extraEvents),
      ) : null,

      // ── Note ──
      odg.notes ? React.createElement(View, { style: styles.boxSection },
        React.createElement(Text, { style: styles.boxSectionTitle }, "NOTE / NOTES"),
        React.createElement(Text, { style: styles.boxSectionText }, odg.notes),
      ) : null,

      // ── Stage manager footer ──
      stageManagerName || asstStageManagerName ? React.createElement(View, { style: styles.footerBox },
        stageManagerName ? React.createElement(Text, null,
          `Direzione di scena: ${stageManagerName}${stageManagerEmail ? ` | ${stageManagerEmail}` : ""}${stageManagerPhone ? ` | ${stageManagerPhone}` : ""}`
        ) : null,
        asstStageManagerName ? React.createElement(Text, null,
          `Assistente: ${asstStageManagerName}${asstStageManagerEmail ? ` | ${asstStageManagerEmail}` : ""}${asstStageManagerPhone ? ` | ${asstStageManagerPhone}` : ""}`
        ) : null,
      ) : null,
    ),
  );

  const buffer = await renderToBuffer(doc);
  const uint8 = new Uint8Array(buffer);

  return new NextResponse(uint8, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="ODG-${odg.production.title}-${odg.date.toString().slice(0, 10)}.pdf"`,
    },
  });
}
