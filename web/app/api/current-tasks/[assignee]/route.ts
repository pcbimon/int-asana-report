import { NextResponse, type NextRequest } from "next/server";
import { getCurrentTasks } from "@/lib/data";

export async function GET(req: NextRequest, context: { params: any }) {
  try {
    const url = new URL(req.url);
    const status = (url.searchParams.get("status") ?? "all").toLowerCase();
    const page = Number(url.searchParams.get("page") ?? 1);
    const pageSize = Number(url.searchParams.get("pageSize") ?? 10);
    const assignee = context.params?.assignee;
    const result = await getCurrentTasks(assignee, { status: status as any, page, pageSize });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
