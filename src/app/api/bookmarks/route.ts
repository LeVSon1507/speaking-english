import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCollection } from "@/lib/mongodb";
import type { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

type BookmarkDoc = {
  _id?: ObjectId;
  userId: string;
  topic: string;
  createdAt: Date;
};

export async function GET() {
  const uid = (await cookies()).get("uid")?.value;
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const col = await getCollection<BookmarkDoc>("bookmarks");
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
  const topic = (body?.topic || "").toString().trim();
  if (!topic)
    return NextResponse.json({ error: "Topic required" }, { status: 400 });
  const col = await getCollection<BookmarkDoc>("bookmarks");
  const exists = await col.findOne({ userId: uid, topic });
  if (!exists) {
    await col.insertOne({ userId: uid, topic, createdAt: new Date() });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const uid = (await cookies()).get("uid")?.value;
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const topic = (body?.topic || "").toString().trim();
  if (!topic)
    return NextResponse.json({ error: "Topic required" }, { status: 400 });
  const col = await getCollection<BookmarkDoc>("bookmarks");
  await col.deleteOne({ userId: uid, topic });
  return NextResponse.json({ ok: true });
}
