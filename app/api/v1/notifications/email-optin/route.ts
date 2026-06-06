import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rateLimit, RL } from "@/lib/rate-limit";
import { redis } from "@/lib/redis";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  const rl = await rateLimit(session.user.id, RL.write);
  if (!rl.ok) return rl.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cerere invalidă" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Cerere invalidă" }, { status: 400 });
  }

  const { optIn, context, postId } = body as Record<string, unknown>;

  if (typeof optIn !== "boolean") {
    return NextResponse.json(
      { error: "optIn trebuie să fie boolean" },
      { status: 400 },
    );
  }
  if (context !== "author" && context !== "collector") {
    return NextResponse.json({ error: "context invalid" }, { status: 400 });
  }
  if (
    typeof postId !== "string" ||
    postId.length === 0 ||
    postId.length > 100
  ) {
    return NextResponse.json({ error: "postId invalid" }, { status: 400 });
  }

  try {
    const answeredKey = `email-optin:${session.user.id}:${postId}:${context}`;
    await redis.set(answeredKey, optIn ? "1" : "0", "EX", 30 * 24 * 3600);

    if (optIn) {
      await redis.set(
        `email-optin:email:${session.user.id}`,
        session.user.email ?? "",
        "EX",
        365 * 24 * 3600,
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/v1/notifications/email-optin]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ answered: false, optedIn: false });
  }

  const { searchParams } = new URL(req.url);
  const context = searchParams.get("context");
  const postId = searchParams.get("postId");

  if (context !== "author" && context !== "collector") {
    return NextResponse.json({ error: "context invalid" }, { status: 400 });
  }
  if (!postId || postId.length > 100) {
    return NextResponse.json({ error: "postId invalid" }, { status: 400 });
  }

  try {
    const answeredKey = `email-optin:${session.user.id}:${postId}:${context}`;
    const val = await redis.get(answeredKey);

    return NextResponse.json({
      answered: val !== null,
      optedIn: val === "1",
    });
  } catch {
    return NextResponse.json({ answered: false, optedIn: false });
  }
}
