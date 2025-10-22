import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCollection } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

type UserDoc = {
  _id: ObjectId;
  username?: string;
  email?: string;
  createdAt: Date;
};

export async function GET() {
  const uid = (await cookies()).get("uid")?.value;
  if (!uid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const users = await getCollection<UserDoc>("users");
    const user = await users.findOne({ _id: new ObjectId(uid) });
    if (!user)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      userId: String(user._id),
      username: user.username || user.email || "",
      createdAt: user.createdAt,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
