import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCollection } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

type HistoryDoc = {
  _id?: never;
  userId: string;
  userText: string;
  replyText?: string;
  createdAt: Date;
};

export async function GET() {
  const uid = (await cookies()).get("uid")?.value;
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const col = await getCollection<HistoryDoc>("history");
  const items = await col
    .find({ userId: uid })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const uid = (await cookies()).get("uid")?.value;
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const userText = (body?.userText || "").toString().trim();
  const replyText = (body?.replyText || "").toString().trim();
  if (!userText)
    return NextResponse.json({ error: "userText required" }, { status: 400 });
  const col = await getCollection<HistoryDoc>("history");
  await col.insertOne({
    userId: uid,
    userText,
    replyText,
    createdAt: new Date(),
  });
  return NextResponse.json({ ok: true });
}
