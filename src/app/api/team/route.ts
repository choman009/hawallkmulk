import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerClient } from "@/lib/supabase/server";
import { parseInvitation } from "@/lib/invitation";
export async function POST(request: Request) {
  if (new URL(request.url).origin !== request.headers.get("origin"))
    return NextResponse.json({ error: "permissionDenied" }, { status: 403 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json({ error: "genericError" }, { status: 503 });
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "sessionError" }, { status: 401 });
  const { data: profile } = await client
    .from("profiles")
    .select("role,active")
    .eq("id", user.id)
    .single();
  if (!profile?.active || !["owner", "admin"].includes(profile.role))
    return NextResponse.json({ error: "permissionDenied" }, { status: 403 });
  const body = parseInvitation(await request.json().catch(() => null), profile);
  if (!body)
    return NextResponse.json({ error: "validationError" }, { status: 400 });
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await admin.auth.admin.inviteUserByEmail(body.email, {
    data: { name: body.name.trim() },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin}/auth/callback?next=/auth/update-password`,
  });
  if (error || !data.user)
    return NextResponse.json({ error: "genericError" }, { status: 400 });
  const { error: updateError } = await admin
    .from("profiles")
    .update({
      name: body.name,
      phone: body.phone,
      role: body.role,
      active: true,
    })
    .eq("id", data.user.id);
  if (updateError)
    return NextResponse.json({ error: "genericError" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
