"use server";

import { createClient } from "@/lib/supabase/server";
import {
  defaultSnapshot,
  fetchAvatarSnapshot,
  type AvatarSnapshot,
} from "./service";

export type { AvatarSnapshot } from "./service";

export async function fetchAvatarStateAction(): Promise<AvatarSnapshot> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return defaultSnapshot();
  return fetchAvatarSnapshot(supabase, user.id);
}
