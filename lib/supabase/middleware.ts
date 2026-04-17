import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // CRITICAL: no code between createServerClient and getClaims().
  // Per RESEARCH.md Anti-Patterns: anything else here can randomly log users out.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  const pathname = request.nextUrl.pathname;
  const isPublicPath =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/registrieren");

  if (!claims && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (claims) {
    const role = (claims as { app_metadata?: { role?: "child" | "teacher" } })
      .app_metadata?.role;

    if (role === "child" && pathname.startsWith("/lehrer")) {
      const url = request.nextUrl.clone();
      url.pathname = "/kind/dashboard";
      return NextResponse.redirect(url);
    }
    if (role === "teacher" && pathname.startsWith("/kind")) {
      const url = request.nextUrl.clone();
      url.pathname = "/lehrer/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // MUST return supabaseResponse to preserve cookies.
  return supabaseResponse;
}
