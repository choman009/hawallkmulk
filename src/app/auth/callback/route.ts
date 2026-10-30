import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const url = new URL(request.url),
    code = url.searchParams.get("code");
  const next =
    url.searchParams.get("next") === "/auth/update-password"
      ? "/auth/update-password"
      : "/";
  if (code) {
    const client = await getServerClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/?auth_error=1", url.origin));
}
