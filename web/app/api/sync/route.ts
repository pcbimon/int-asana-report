import { NextResponse } from "next/server";
import { syncFromAsana } from "@/lib/asana";

export async function POST() {
  try {
    const result = await syncFromAsana();
    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
