import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { cookies } from "next/headers";
import type { ObjectId } from "mongodb";
import crypto from "crypto";

export const dynamic = "force-dynamic";

type UserDoc = {
  _id?: ObjectId;
  username: string;
  // Client sends SHA-256(password) as passwordHash
  salt: string; // server-generated random salt
  passwordSaltedHash: string; // sha256(passwordHash + salt)
  createdAt: Date;
};

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = (body?.username || "").toString().trim().toLowerCase();
    const passwordHash = (body?.passwordHash || "").toString();

    if (!username || username.length < 3) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }
    if (!passwordHash || passwordHash.length < 32) {
      return NextResponse.json(
        { error: "Password hash is required" },
        { status: 400 }
      );
    }

    const users = await getCollection<UserDoc>("users");
    let user = await users.findOne({ username });

    if (!user) {
      const salt = crypto.randomBytes(16).toString("hex");
      const passwordSaltedHash = sha256Hex(passwordHash + salt);
      const ins = await users.insertOne({
        username,
        salt,
        passwordSaltedHash,
        createdAt: new Date(),
      });
      user = {
        _id: ins.insertedId,
        username,
        salt,
        passwordSaltedHash,
        createdAt: new Date(),
      };
    } else {
      const candidate = sha256Hex(passwordHash + user.salt);
      if (candidate !== user.passwordSaltedHash) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }
    }

    const res = NextResponse.json({ ok: true, userId: String(user._id), username });
    res.cookies.set("uid", String(user._id), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return res;
  } catch (e) {
    return NextResponse.json({ error: "Login error" }, { status: 500 });
  }
}
