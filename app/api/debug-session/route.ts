import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  let profile = null;
  let profileError = null;
  if (user) {
    const svc = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data, error } = await svc.from("users").select("id, email, status, role").eq("id", user.id).single();
    profile = data;
    profileError = error;
  }

  return NextResponse.json({
    cookieCount: allCookies.length,
    cookieNames: allCookies.map(c => c.name),
    authUser: user ? { id: user.id, email: user.email } : null,
    authError: authError?.message ?? null,
    profile,
    profileError: profileError?.message ?? null,
  }, { status: 200 });
}
