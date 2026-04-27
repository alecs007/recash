import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Routes that require authentication
const PROTECTED_ROUTES = [
  "/profil",
  "/post",
  "/mesaje",
  "/notificari",
  "/setari",
];

// API routes that require authentication
const PROTECTED_API_ROUTES = [
  `/api/${process.env.NEXT_PUBLIC_API_VERSION}/posts`,
  `/api/${process.env.NEXT_PUBLIC_API_VERSION}/transactions`,
  `/api/${process.env.NEXT_PUBLIC_API_VERSION}/user`,
  `/api/${process.env.NEXT_PUBLIC_API_VERSION}/notifications`,
];

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isAuthenticated = !!session?.user;

  const isProtectedPage = PROTECTED_ROUTES.some((route) =>
    nextUrl.pathname.startsWith(route),
  );
  const isProtectedApi = PROTECTED_API_ROUTES.some((route) =>
    nextUrl.pathname.startsWith(route),
  );

  // Unauthenticated user hitting a protected page → redirect home
  // The header will open the auth modal via state
  if (isProtectedPage && !isAuthenticated) {
    const url = nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("auth", "1"); // signal to open modal
    return NextResponse.redirect(url);
  }

  // Unauthenticated API call → 401
  if (isProtectedApi && !isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js)).*)",
  ],
};
