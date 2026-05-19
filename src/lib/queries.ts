import { cache } from "react";
import { prisma } from "./db";

export const getProduction = cache((id: string) =>
  prisma.production.findUnique({
    where: { id },
    include: {
      theatre: { include: { locations: true } },
      members: {
        include: { person: true },
        orderBy: [{ department: "asc" }, { roleTitle: "asc" }],
      },
      odgs: { orderBy: { date: "desc" } },
    },
  })
);

export const getOdg = cache((id: string) =>
  prisma.odg.findUnique({
    where: { id },
    include: {
      production: {
        include: {
          theatre: { include: { locations: true } },
          members: { include: { person: true }, orderBy: [{ department: "asc" }, { roleTitle: "asc" }] },
        },
      },
      sessions: { include: { location: true }, orderBy: { sortOrder: "asc" } },
      entries: {
        include: { member: { include: { person: true } }, location: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  })
);

export const getTheatres = cache(() =>
  prisma.theatre.findMany({
    include: {
      locations: true,
      productions: {
        orderBy: { startDate: "desc" },
        select: { id: true, title: true, composer: true, startDate: true, endDate: true },
      },
      _count: { select: { productions: true } },
    },
    orderBy: { name: "asc" },
  })
);

export const getProductions = cache(() =>
  prisma.production.findMany({
    include: { theatre: true, _count: { select: { members: true, odgs: true } } },
    orderBy: { startDate: "desc" },
  })
);
