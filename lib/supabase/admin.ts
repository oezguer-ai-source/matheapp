// SERVER-ONLY FILE — NEVER import this in a "use client" component.
// This file reads SUPABASE_SERVICE_ROLE_KEY. Leaking the service-role key to
// the browser bypasses ALL Row Level Security. See RESEARCH.md Pattern 5.
import 'server-only';

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { requireEnv } from "@/lib/utils/env";

export function createAdminClient() {
  return createSupabaseClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
