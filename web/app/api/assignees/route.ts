import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const list = await prisma.assignees.findMany({
    where: { assignee_gid: { not: null } },
    select: { assignee_gid: true, firstname: true, lastname: true },
    orderBy: [{ firstname: "asc" }, { lastname: "asc" }],
  });
  return NextResponse.json(list);
}
