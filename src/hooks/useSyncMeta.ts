/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The bookkeeping that decides which side of a sync is newer.
 *
 * This is its own module because it is the one thing the vault and the sync
 * engine genuinely share. The persistence effect has to record *when* the user
 * last changed something; the sync engine has to record when the server last
 * changed and when the two were last reconciled. Extracting it here is what lets
 * `useVault` and `useCloudSync` stay independent of each other rather than one
 * importing the other and closing a cycle.
 *
 * Everything is a ref rather than state on purpose: these values are read inside
 * effects and async callbacks that must see the latest write immediately, and a
 * re-render on every keystroke's worth of bookkeeping would be pure cost. The one
 * value the UI displays (`lastSyncedAt`) is mirrored into state by `useCloudSync`.
 */

import { useMemo, useRef, type MutableRefObject } from 'react';

import { SYNC_META_KEY } from '../constants.ts';
import { readJson, writeJson } from '../utils/storage.ts';

export interface SyncMeta {
  lastLocalChangeAt: number;
  lastRemoteChangeAt: number;
  lastSyncedAt: number | null;
}

export const readSyncMeta = (): SyncMeta => {
  const parsed = readJson(SYNC_META_KEY, (value): value is Partial<SyncMeta> =>
    typeof value === 'object' && value !== null
  );
  return {
    lastLocalChangeAt: typeof parsed?.lastLocalChangeAt === 'number' ? parsed.lastLocalChangeAt : 0,
    lastRemoteChangeAt: typeof parsed?.lastRemoteChangeAt === 'number' ? parsed.lastRemoteChangeAt : 0,
    lastSyncedAt: typeof parsed?.lastSyncedAt === 'number' ? parsed.lastSyncedAt : null,
  };
};

export const writeSyncMeta = (meta: SyncMeta) => {
  writeJson(SYNC_META_KEY, meta);
};

export interface SyncMetaStore {
  lastLocalChangeAt: MutableRefObject<number>;
  lastRemoteChangeAt: MutableRefObject<number>;
  lastSyncedAt: MutableRefObject<number | null>;
  /** Set when a local edit still needs pushing. Cleared by a successful push. */
  pendingSync: MutableRefObject<boolean>;
  /**
   * Set immediately before applying remote data, so the write it triggers is not
   * mistaken for a local edit and bounced straight back to the server.
   */
  suppressLocalChange: MutableRefObject<boolean>;
  /** Persist the three timestamps as they currently stand. */
  save: () => void;
  /** The values read at mount, for seeding display state. */
  initial: SyncMeta;
}

export function useSyncMeta(): SyncMetaStore {
  const initial = useMemo(() => readSyncMeta(), []);
  const lastLocalChangeAt = useRef(initial.lastLocalChangeAt);
  const lastRemoteChangeAt = useRef(initial.lastRemoteChangeAt);
  const lastSyncedAt = useRef<number | null>(initial.lastSyncedAt);
  const pendingSync = useRef(false);
  const suppressLocalChange = useRef(false);

  // Stable for the life of the component: every field is a ref or a closure over
  // refs, so consumers can list it as a dependency without re-running on writes.
  return useMemo<SyncMetaStore>(() => ({
    lastLocalChangeAt,
    lastRemoteChangeAt,
    lastSyncedAt,
    pendingSync,
    suppressLocalChange,
    save: () => {
      writeSyncMeta({
        lastLocalChangeAt: lastLocalChangeAt.current,
        lastRemoteChangeAt: lastRemoteChangeAt.current,
        lastSyncedAt: lastSyncedAt.current,
      });
    },
    initial,
  }), [initial]);
}
