// middleware.ts
import { NextRequest, NextResponse } from "next/server";

// ── Protected page routes ────────────────────────────────────────────────────
// Any pathname that starts with one of these requires an active session.
const PROTECTED_PAGE_PREFIXES = [
  "/profil",
  "/post",
  "/mesaje",
  "/notificari",
  "/setari",
];

const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION ?? "v1";
const PROTECTED_API_PREFIXES = [
  `/api/${API_VERSION}/profile`,
  `/api/${API_VERSION}/posts`,
  `/api/${API_VERSION}/transactions`,
  `/api/${API_VERSION}/notifications`,
];

const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAuthenticated = SESSION_COOKIE_NAMES.some(
    (name) => !!req.cookies.get(name),
  );

  const isProtectedPage = PROTECTED_PAGE_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
  const isProtectedApi = PROTECTED_API_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (!isAuthenticated) {
    if (isProtectedPage) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("auth", "1");
      return NextResponse.redirect(url);
    }

    if (isProtectedApi) {
      return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js)).*)",
  ],
};
