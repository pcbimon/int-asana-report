import { NextResponse, type NextRequest } from "next/server";
import { getCurrentTasks } from "@/lib/data";

export async function GET(req: NextRequest, context: { params: any }) {
  try {
    const url = new URL(req.url);
    const status = (url.searchParams.get("status") ?? "all").toLowerCase();
    const page = Number(url.searchParams.get("page") ?? 1);
    const pageSize = Number(url.searchParams.get("pageSize") ?? 10);
    // Read assignee from query/search params like the other parameters.
    // This avoids accessing `context.params` synchronously.
    const assignee = url.searchParams.get("assignee");
    if (!assignee) {
      return NextResponse.json({ ok: false, error: "missing required query param 'assignee'" }, { status: 400 });
    }

    const result = await getCurrentTasks(assignee, { status: status as any, page, pageSize });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
