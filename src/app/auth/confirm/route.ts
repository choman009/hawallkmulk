import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const url = new URL(request.url),
    token_hash = url.searchParams.get("token_hash"),
    type = url.searchParams.get("type");
  if (token_hash && (type === "invite" || type === "recovery")) {
    const client = await getServerClient();
    const { error } = await client.auth.verifyOtp({ token_hash, type });
    if (!error)
      return NextResponse.redirect(
        new URL("/auth/update-password", url.origin),
      );
  }
  return NextResponse.redirect(new URL("/?auth_error=1", url.origin));
}
