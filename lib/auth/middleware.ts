import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  const publicPaths = ["/", "/login", "/register", "/verify-email", "/forgot-password",
    "/how-it-works", "/help", "/risk-warning", "/privacy-policy", "/terms"];
  const isPublic = publicPaths.some(p => path === p || path.startsWith(p + "/"));
  const isApi = path.startsWith("/api/");

  if (!user && !isPublic && !isApi) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && path.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return supabaseResponse;
}
