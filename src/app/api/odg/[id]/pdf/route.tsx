import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { DEPT_LABEL, DEPT_COLOR } from "@/lib/constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const hexToRgb = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
};

const lighten = (hex: string): string => {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.min(255, r + 60)}, ${Math.min(255, g + 60)}, ${Math.min(255, b + 60)})`;
};

const DEPT_ORDER = ["TEAM_CREATIVO", "CAST", "ORCHESTRA", "MAESTRI_COLLABORATORI", "AREA_TECNICA"];

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, padding: 30, paddingBottom: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16, borderBottom: "1 solid #ddd", paddingBottom: 10 },
  headerLeft: { flexDirection: "column" },
  theatreName: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  headerRight: { alignItems: "flex-end" },
  productionTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#c0392b" },
  docType: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 2 },
  dateLabel: { fontSize: 9, marginTop: 2, color: "#555" },
  overview: { border: "1 solid #ddd", padding: 8, marginBottom: 12, textAlign: "center" },
  overviewRow: { fontSize: 9, marginBottom: 2 },
  section: { marginBottom: 10 },
  sectionHeader: { padding: "4 6", fontFamily: "Helvetica-Bold", fontSize: 9 },
  tableHeader: { flexDirection: "row", borderBottom: "1 solid #ccc", paddingBottom: 3, paddingTop: 3, paddingHorizontal: 6 },
  tableHeaderCell: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#555" },
  row: { flexDirection: "row", borderBottom: "0.5 solid #eee", paddingVertical: 4, paddingHorizontal: 6, minHeight: 20 },
  nameCol: { width: "28%" },
  nameText: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  roleText: { fontSize: 7, color: "#666", fontFamily: "Helvetica-Oblique" },
  timeCol: { width: "18%", fontSize: 9 },
  activityCol: { width: "32%", fontSize: 9 },
  locationCol: { width: "22%", fontSize: 9, color: "#555" },
  footer: { position: "absolute", bottom: 20, left: 30, right: 30, borderTop: "0.5 solid #ddd", paddingTop: 4, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: "#aaa" },
});

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

  const entriesByDept = DEPT_ORDER.reduce<Record<string, typeof odg.entries>>((acc, dept) => {
    acc[dept] = odg.entries.filter((e) => e.member.department === dept);
    return acc;
  }, {});

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.theatreName}>{odg.production.theatre.name}</Text>
            <Text style={{ fontSize: 8, color: "#777", marginTop: 2 }}>{odg.production.theatre.city}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.productionTitle}>{odg.production.title}</Text>
            {odg.production.composer && (
              <Text style={{ fontSize: 8, color: "#777", marginTop: 2 }}>{odg.production.composer}</Text>
            )}
            <Text style={styles.docType}>Ordine del giorno</Text>
            <Text style={styles.dateLabel}>{dateLabel}</Text>
          </View>
        </View>

        {/* Day overview */}
        {odg.sessions.length > 0 && (
          <View style={styles.overview}>
            {odg.sessions.map((s) => (
              <Text key={s.id} style={styles.overviewRow}>
                {s.startTime} - {s.endTime}  {s.activity}{s.location ? `  (${s.location.name})` : ""}
              </Text>
            ))}
          </View>
        )}

        {/* Dept sections */}
        {DEPT_ORDER.map((dept) => {
          const entries = entriesByDept[dept];
          if (!entries?.length) return null;
          const bg = lighten(DEPT_COLOR[dept]);
          return (
            <View key={dept} style={styles.section}>
              <View style={[styles.sectionHeader, { backgroundColor: bg }]}>
                <Text>{DEPT_LABEL[dept].toUpperCase()}</Text>
              </View>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: "28%" }]}>NOMINATIVO</Text>
                <Text style={[styles.tableHeaderCell, { width: "18%" }]}>ORARIO</Text>
                <Text style={[styles.tableHeaderCell, { width: "32%" }]}>ATTIVITÀ</Text>
                <Text style={[styles.tableHeaderCell, { width: "22%" }]}>LUOGO</Text>
              </View>
              {entries.map((entry) => (
                <View key={entry.id} style={styles.row}>
                  <View style={styles.nameCol}>
                    <Text style={styles.nameText}>{entry.member.person.name}</Text>
                    <Text style={styles.roleText}>{entry.member.roleTitle}</Text>
                  </View>
                  <Text style={styles.timeCol}>{entry.startTime} - {entry.endTime}</Text>
                  <Text style={styles.activityCol}>{entry.activity}</Text>
                  <Text style={styles.locationCol}>{entry.location?.name ?? ""}</Text>
                </View>
              ))}
            </View>
          );
        })}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{odg.production.title} · ODG {dateLabel}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
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
