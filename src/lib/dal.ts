/**
 * Data Access Layer — auth helpers for Server Components.
 *
 * All auth checks go through this file so that:
 *  1. React.cache() deduplicates the Supabase getUser() call across the entire
 *     render pass.  The layout, the page, and any nested server components that
 *     call requireAuthUser() share ONE result, preventing the
 *     concurrent-token-refresh race that produces "refresh_token_not_found".
 *  2. Auth logic is centralised in a single place.
 */
import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

/**
 * Returns the current Supabase user for the request, or null if there is no
 * valid session.  Memoised via React.cache() so the Supabase API is only hit
 * once per render pass regardless of how many Server Components call this.
 */
export const getAuthUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
});

/**
 * Like getAuthUser() but redirects to /login when there is no valid session.
 * Use this in every layout / page that requires authentication.
 */
export const requireAuthUser = cache(async (): Promise<User> => {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  return user;
});
