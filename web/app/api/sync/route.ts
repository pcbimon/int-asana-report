import { NextResponse } from "next/server";
import { syncFromAsana } from "@/lib/asana";

export async function POST() {
  try {
    const result = await syncFromAsana();
    return NextResponse.json({ ok: true, result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
