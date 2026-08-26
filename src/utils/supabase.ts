/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cloud sync client.
 *
 * `supabase` is `null` when sync is not configured. It used to be a *live* client
 * built from the placeholder URL `http://localhost/invalid-supabase-url`, which
 * meant any call path that slipped past an `isSupabaseConfigured` check produced
 * an opaque `TypeError: Failed to fetch` — or, worse, a real request to whatever
 * happens to be listening on the developer's localhost. A `null` client turns the
 * same mistake into a type error at the call site, before it ships.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn('[PromptVault] Supabase sync is disabled. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable cloud sync.');
}

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
        },
      })
    : null;
