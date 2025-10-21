import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCollection } from "@/lib/mongodb";
import type { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

type SavedDoc = {
  _id?: ObjectId;
  userId: string;
  kind?: string; // "topic" | "phrase" | "custom"
  value: string;
  createdAt: Date;
};

export async function GET() {
  const uid = (await cookies()).get("uid")?.value;
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const col = await getCollection<SavedDoc>("saved");
  const items = await col
    .find({ userId: uid })
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const uid = (await cookies()).get("uid")?.value;
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const value = (body?.value || "").toString().trim();
  const kind = (body?.kind || "custom").toString();
  if (!value)
    return NextResponse.json({ error: "value required" }, { status: 400 });
  const col = await getCollection<SavedDoc>("saved");
  await col.insertOne({ userId: uid, value, kind, createdAt: new Date() });
  return NextResponse.json({ ok: true });
}
