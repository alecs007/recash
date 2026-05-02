import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PAGE_PREFIXES = [
  "/profil",
  "/post",
  "/mesaje",
  "/notificari",
  "/setari",
];

const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION ?? "v1";

const ALWAYS_PROTECTED_API_PREFIXES = [
  `/api/${API_VERSION}/profile`,
  `/api/${API_VERSION}/transactions`,
  `/api/${API_VERSION}/notifications`,
];

const WRITE_PROTECTED_API_PREFIXES = [`/api/${API_VERSION}/posts`];
const WRITE_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

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
  const isAlwaysProtectedApi = ALWAYS_PROTECTED_API_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
  const isWriteProtectedApi =
    WRITE_PROTECTED_API_PREFIXES.some((prefix) =>
      pathname.startsWith(prefix),
    ) && WRITE_METHODS.has(req.method);

  if (!isAuthenticated) {
    if (isProtectedPage) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("auth", "1");
      return NextResponse.redirect(url);
    }

    if (isAlwaysProtectedApi || isWriteProtectedApi) {
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
