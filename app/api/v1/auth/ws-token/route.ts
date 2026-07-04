import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { redis } from "@/lib/redis";
import { rateLimit, RL } from "@/lib/rate-limit";
import { randomBytes } from "crypto";

const WS_TOKEN_TTL_SEC = 60;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ token: null }, { status: 401 });
  }

  const rl = await rateLimit(session.user.id, RL.read);
  if (!rl.ok) return rl.response;

  const token = randomBytes(32).toString("hex");

  try {
    await redis.set(
      `ws-token:${token}`,
      session.user.id,
      "EX",
      WS_TOKEN_TTL_SEC,
    );
  } catch (err) {
    console.error("[ws-token] Redis write error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ token });
}
