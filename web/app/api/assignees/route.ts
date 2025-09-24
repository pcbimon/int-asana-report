import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { decrypt } from "@/lib/crypto";

export async function GET() {
  const list = await prisma.view_user_assignee.findMany({
    where: { assignee_gid: { not: null } },
    select: { assignee_gid: true, firstname: true, lastname: true },
    orderBy: [{ firstname: "asc" }, { lastname: "asc" }],
  });
  const readable = list.map(l => ({ assignee_gid: l.assignee_gid, firstname: l.firstname ? decrypt(l.firstname) : '', lastname: l.lastname ? decrypt(l.lastname) : '' }));
  return NextResponse.json(readable);
}
