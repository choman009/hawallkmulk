import { getBrowserClient } from "./supabase/client";
import { initialDemo } from "./demo";
import type { WorkspaceData, Profile, PropertyImage } from "./domain";
import {
  isAuthSessionMissingError,
  type SupabaseClient,
} from "@supabase/supabase-js";
export const DEMO_KEY = "hawall-mulk-demo-v1";
export function readDemo(): WorkspaceData {
  try {
    const saved = localStorage.getItem(DEMO_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      if (
        data.profiles?.length &&
        data.office_settings &&
        data.properties &&
        data.client_requests &&
        data.assignments &&
        data.assignment_updates &&
        data.property_images &&
        data.partner_offices
      )
        return data;
    }
  } catch {}
  return initialDemo();
}
export function storeDemo(data: WorkspaceData) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(data));
}
export async function loadWorkspace({
  allowSignedOut = false,
  client = getBrowserClient(),
}: {
  allowSignedOut?: boolean;
  client?: SupabaseClient | null;
} = {}): Promise<{
  data: WorkspaceData;
  profile: Profile;
} | null> {
  if (!client) throw new Error("sessionError");
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  // A first-time visitor is signed out, not experiencing an expired session.
  if (allowSignedOut && !user && (!error || isAuthSessionMissingError(error)))
    return null;
  if (error || !user) throw new Error("sessionError");
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (profileError || !profile?.active) throw new Error("inactive");
  const tables = [
    "profiles",
    "properties",
    "client_requests",
    "partner_offices",
    "assignments",
    "assignment_updates",
    "property_images",
    "office_settings",
  ] as const;
  const rows = await Promise.all(
    tables.map(async (table) => {
      let result: unknown[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await client
          .from(table)
          .select("*")
          .order(
            table === "office_settings"
              ? "id"
              : table === "profiles"
                ? "name"
                : "created_at",
            { ascending: table === "profiles" },
          )
          .range(offset, offset + 499);
        if (error) throw error;
        result = result.concat(data);
        if (data.length < 500) break;
      }
      return result;
    }),
  );
  const data = Object.fromEntries(
    tables.map((t, i) => [t, t === "office_settings" ? rows[i][0] : rows[i]]),
  ) as WorkspaceData;
  if (profile.role === "freelancer") {
    const { data: sources, error } = await client.rpc("visible_record_sources");
    if (error) throw error;
    data.record_sources = sources;
  }
  return { data, profile };
}
export async function persist(
  table: string,
  values: Record<string, unknown>,
  id?: string | number,
) {
  const client = getBrowserClient();
  if (!client) throw new Error("sessionError");
  const query = id
    ? client.from(table).update(values).eq("id", id)
    : client.from(table).insert(values);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}
export async function photoUrls(images: PropertyImage[]) {
  const client = getBrowserClient();
  if (!client) return [];
  return Promise.all(
    images.map(async (image) => {
      const { data, error } = await client.storage
        .from("property-images")
        .createSignedUrl(image.path, 60);
      if (error) throw error;
      return { ...image, url: data.signedUrl };
    }),
  );
}
export async function uploadPhoto(propertyId: string, file: File) {
  const client = getBrowserClient();
  if (!client) throw new Error("sessionError");
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 5242880
  )
    throw new Error("photoError");
  const extension =
    file.type === "image/jpeg"
      ? "jpg"
      : file.type === "image/png"
        ? "png"
        : "webp";
  const path = `${propertyId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage
    .from("property-images")
    .upload(path, file, { contentType: file.type });
  if (error) throw error;
  try {
    return await persist("property_images", { property_id: propertyId, path });
  } catch (error) {
    await client.storage.from("property-images").remove([path]);
    throw error;
  }
}
