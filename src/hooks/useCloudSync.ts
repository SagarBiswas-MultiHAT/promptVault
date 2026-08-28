/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Supabase auth and per-entity cloud sync.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { SYNC_TABLE } from '../constants.ts';
import { VaultData } from '../types.ts';
import { isValidVaultData, withoutSecrets } from '../utils/vault.ts';
import { mergeVaults } from '../utils/merge.ts';
import { useIdleModule } from './useLazyModule.ts';
import type { SyncMetaStore } from './useSyncMeta.ts';

type SupabaseModule = typeof import('../utils/supabase.ts');
// The module exports `null` when sync is unconfigured; the state below tracks
// "not loaded yet" with its own `null`, so strip the module's.
type SupabaseClient = NonNullable<SupabaseModule['supabase']>;

export type SyncStatus = 'idle' | 'syncing' | 'error';

export interface CloudSyncController {
  /** False until the module has loaded, so the UI can say "sync off" honestly. */
  configured: boolean;
  /** False while the session is being restored. */
  ready: boolean;
  session: Session | null;
  status: SyncStatus;
  error: string | null;
  lastSyncedAt: number | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
}

export interface CloudSyncOptions {
  syncMeta: SyncMetaStore;
  dataRef: React.MutableRefObject<VaultData>;
  /** Called with remote data that should replace the local vault. */
  onRemoteData: (next: VaultData) => void;
  /** The local vault, watched only to schedule a push after a change. */
  data: VaultData;
  /** Ciphertext is local-only; do not sync placeholder data while locked. */
  enabled: boolean;
}

export function useCloudSync({ syncMeta, dataRef, onRemoteData, data, enabled }: CloudSyncOptions): CloudSyncController {
  const supabaseModule = useIdleModule<SupabaseModule>(() => import('../utils/supabase.ts'), 1800);
  const supabaseClient: SupabaseClient | null = supabaseModule?.supabase ?? null;
  const configured = supabaseModule?.isSupabaseConfigured ?? false;

  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(syncMeta.initial.lastSyncedAt);

  // Guards re-entry. A pull that arrives mid-push would compare against
  // timestamps the push has not finished writing.
  const inFlight = useRef(false);
  const pushTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!configured) {
      // Nothing to restore, so the UI should stop saying "checking" immediately.
      setReady(true);
      return;
    }

    if (!supabaseClient) return;

    setReady(false);
    let isMounted = true;
    supabaseClient.auth.getSession().then(({ data: sessionData }) => {
      if (!isMounted) return;
      setSession(sessionData.session);
      setReady(true);
    });

    const { data: authListener } = supabaseClient.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabaseClient, configured]);

  const applyRemoteData = useCallback((remoteData: VaultData, remoteUpdatedAt: number) => {
    const merged = mergeVaults(dataRef.current, remoteData);
    // `push()` may run directly after this function; do not make it wait for
    // React's effect to update the ref or it would re-upload the pre-merge vault.
    dataRef.current = merged;
    syncMeta.suppressLocalChange.current = true;
    syncMeta.lastRemoteChangeAt.current = remoteUpdatedAt;
    syncMeta.lastLocalChangeAt.current = remoteUpdatedAt;
    syncMeta.lastSyncedAt.current = Date.now();
    setLastSyncedAt(syncMeta.lastSyncedAt.current);
    syncMeta.save();
    onRemoteData(merged);
    return JSON.stringify(merged) !== JSON.stringify(remoteData);
  }, [dataRef, onRemoteData, syncMeta]);

  const push = useCallback(async () => {
    if (!enabled || !session || !configured || !supabaseClient) return;
    if (inFlight.current) return;

    inFlight.current = true;
    setStatus('syncing');
    setError(null);

    const dataToSync = withoutSecrets(dataRef.current);
    const payload = {
      user_id: session.user.id,
      data: dataToSync,
      schema_version: dataToSync.schemaVersion,
      updated_at: new Date().toISOString(),
    };

    const { data: row, error: pushError } = await supabaseClient
      .from(SYNC_TABLE)
      .upsert(payload, { onConflict: 'user_id' })
      .select('updated_at')
      .single();

    if (pushError) {
      setStatus('error');
      setError(pushError.message);
      inFlight.current = false;
      return;
    }

    const remoteMs = Date.parse(row.updated_at);
    if (Number.isFinite(remoteMs)) {
      syncMeta.lastRemoteChangeAt.current = remoteMs;
    }

    const now = Date.now();
    syncMeta.lastSyncedAt.current = now;
    setLastSyncedAt(now);
    syncMeta.pendingSync.current = false;
    syncMeta.save();
    setStatus('idle');
    inFlight.current = false;
  }, [configured, dataRef, enabled, session, supabaseClient, syncMeta]);

  const bootstrap = useCallback(async () => {
    if (!enabled || !session || !configured || !supabaseClient) return;
    setStatus('syncing');
    setError(null);

    const { data: row, error: pullError } = await supabaseClient
      .from(SYNC_TABLE)
      .select('data, updated_at, schema_version')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (pullError) {
      setStatus('error');
      setError(pullError.message);
      return;
    }

    if (!row) {
      await push();
      return;
    }

    const remoteMs = Date.parse(row.updated_at);
    if (Number.isFinite(remoteMs)) {
      syncMeta.lastRemoteChangeAt.current = remoteMs;
    }

    if (row.data && isValidVaultData(row.data)) {
      const mergedNeedsPush = applyRemoteData(row.data, syncMeta.lastRemoteChangeAt.current);
      if (mergedNeedsPush) await push();
      else setStatus('idle');
      return;
    }

    const now = Date.now();
    syncMeta.lastSyncedAt.current = now;
    setLastSyncedAt(now);
    syncMeta.save();
    setStatus('idle');
  }, [applyRemoteData, configured, enabled, push, session, supabaseClient, syncMeta]);

  const pullIfRemoteNewer = useCallback(async () => {
    if (!enabled || !session || !configured || !supabaseClient) return;
    if (inFlight.current) return;

    const { data: row, error: pullError } = await supabaseClient
      .from(SYNC_TABLE)
      .select('data, updated_at')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (pullError || !row) return;

    const remoteMs = Date.parse(row.updated_at);
    if (!Number.isFinite(remoteMs)) return;
    if (remoteMs <= syncMeta.lastRemoteChangeAt.current || !row.data || !isValidVaultData(row.data)) return;
    const mergedNeedsPush = applyRemoteData(row.data, remoteMs);
    if (mergedNeedsPush) await push();
  }, [applyRemoteData, configured, enabled, push, session, supabaseClient, syncMeta]);

  useEffect(() => {
    if (!enabled || !session?.user.id || !configured || !supabaseClient) return;
    bootstrap();
  }, [bootstrap, session?.user.id, supabaseClient, configured, enabled]);

  // Debounced push. `data` is the trigger: any vault change reruns this, and the
  // `pendingSync` flag set by the persistence effect is what distinguishes a local
  // edit from remote data that has just been applied.
  useEffect(() => {
    if (!enabled || !session?.user.id || !configured || !supabaseClient) return;
    if (!syncMeta.pendingSync.current) return;

    if (pushTimer.current) {
      window.clearTimeout(pushTimer.current);
    }

    pushTimer.current = window.setTimeout(() => {
      push();
    }, 1000);

    return () => {
      if (pushTimer.current) {
        window.clearTimeout(pushTimer.current);
      }
    };
  }, [data, session?.user.id, supabaseClient, configured, enabled, push, syncMeta]);

  useEffect(() => {
    if (!enabled || !session?.user.id || !configured || !supabaseClient) return;
    const interval = window.setInterval(() => {
      pullIfRemoteNewer();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [pullIfRemoteNewer, session?.user.id, supabaseClient, configured, enabled]);

  const signIn = useCallback(async () => {
    if (!configured || !supabaseClient) {
      setStatus('error');
      setError('Supabase is not configured or still initializing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }

    setError(null);
    const { error: authError } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });

    if (authError) {
      setStatus('error');
      setError(authError.message);
    }
  }, [configured, supabaseClient]);

  const signOut = useCallback(async () => {
    setError(null);
    if (!supabaseClient) return;
    const { error: authError } = await supabaseClient.auth.signOut();
    if (authError) {
      setStatus('error');
      setError(authError.message);
    }
  }, [supabaseClient]);

  return {
    configured,
    ready,
    session,
    status,
    error,
    lastSyncedAt,
    signIn,
    signOut,
    syncNow: push,
  };
}
