import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import type { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email || "").toString().trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const users = await getCollection<{
      _id?: ObjectId;
      email: string;
      createdAt: Date;
    }>("users");

    let user = await users.findOne({ email });
    if (!user) {
      const ins = await users.insertOne({
        email,
        createdAt: new Date(),
      });
      user = { _id: ins.insertedId, email, createdAt: new Date() };
    }

    const res = NextResponse.json({ ok: true, userId: String(user._id) });
    res.cookies.set("uid", String(user._id), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return NextResponse.json({ error: "Login error" }, { status: 500 });
  }
}
