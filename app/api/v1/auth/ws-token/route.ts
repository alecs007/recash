import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

export async function GET() {
  const cookieStore = await cookies();

  for (const name of SESSION_COOKIE_NAMES) {
    const cookie = cookieStore.get(name);
    if (cookie?.value) {
      return NextResponse.json({ token: cookie.value });
    }
  }

  return NextResponse.json({ token: null }, { status: 401 });
}
