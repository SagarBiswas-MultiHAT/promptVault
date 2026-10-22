# ADR 0003: Last-Write-Wins (LWW) Conflict Resolution with 30-Day Tombstones

| Metadata | Details |
| :--- | :--- |
| **Status** | Accepted / Implemented |
| **Date** | 2026-10-22 |
| **Deciders** | Sagar Biswas (@SagarBiswas-MultiHAT) / MultiHAT (<https://multihat.dev>) |
| **Consulted** | Engineering & Data Sync Team |
| **Informs** | [merge.ts](file:///o:/github/promptVault/src/utils/merge.ts), [useCloudSync.ts](file:///o:/github/promptVault/src/hooks/useCloudSync.ts), [cloud-sync-lifecycle.png](file:///o:/github/promptVault/diagrams/cloud-sync-lifecycle.png) |

---

## Context & Problem Statement

PromptVault supports multi-device synchronization via Supabase. In early versions, the synchronization engine used **monolithic document overwriting**: the client simply upserted the entire local vault document to Supabase whenever changes occurred.

This introduced catastrophic data loss in multi-device workflows:
1. **The Zombie Prompt Problem**: A user deletes a prompt on their laptop. Later, they edit an unrelated prompt on their phone. The phone (unaware of the laptop's deletion) re-uploads its entire library, instantly resurrecting the deleted prompt.
2. **Overwritten Edits**: If two devices make edits offline and sync subsequently, the device that syncs second completely overwrites and destroys the first device's edits.

We required a conflict-free multi-device synchronization and reconciliation algorithm that guarantees:
- Edits made on one device are never clobbered by edits made on another.
- Deletions are reliably propagated across all user devices.
- Deleted records do not accumulate indefinitely and bloat client storage.

---

## Decision Drivers

- **Zero Data Loss**: Edits on distinct prompts must merge cleanly without human intervention.
- **Client-Side Autonomy**: Reconciliations must run locally inside the browser on raw JavaScript objects without requiring heavy database extensions.
- **Lightweight Implementation**: Avoid the computational overhead and payload bloat of full state-based Conflict-Free Replicated Data Types (CRDTs) like Yjs or Automerge.
- **Storage Conservation**: Client storage (`localStorage`) is capped at ~5MB; deleted items must eventually be purged.

---

## Considered Options

1. **Option 1: Monolithic Document Last-Write-Wins (Status Quo)**: Compare the document-level `updated_at` timestamp and let the newest document replace the older one.
   - *Problem*: Guarantees data loss for any concurrent offline editing. Unacceptable for production.
2. **Option 2: Full State-Based CRDT (Yjs / Automerge)**: Model every character and field as a replicated operational tree.
   - *Problem*: High complexity, massive metadata storage overhead (tombstone trees can easily exceed 10x the actual content size), and unnecessary for prompt cards where users rarely edit the same prompt concurrently on two screens.
3. **Option 3: Per-Entity Last-Write-Wins with 30-Day Tombstones (Chosen)**:
   - Break document-level syncing down to **per-entity resolution**.
   - Each `Prompt` and `Category` carries an `updatedAt` timestamp and an optional `deletedAt` tombstone timestamp.
   - Merging iterates through prompts by UUID: the entity with the newer `updatedAt` wins.
   - If an entity was deleted, its tombstone wins over older versions, ensuring deletions propagate across devices.
   - Tombstones older than 30 days are automatically swept and purged.

---

## Decision Outcome

We selected **Option 3: Per-Entity Last-Write-Wins with 30-Day Tombstones**.

### Technical Implementation Details
1. **The Winner Function (`winner(left, right)`)**:
   - Compare timestamps: If `left.updatedAt !== right.updatedAt`, the entity with the higher timestamp is kept.
   - Exact Timestamp Tie-Breaker: If timestamps are identical, the entity with `deletedAt !== null` wins (deletion takes precedence). If neither is deleted, the local copy is retained.
2. **Category Cascade Deletion**:
   - If a category is marked as deleted, all prompts belonging to that category (`prompt.categoryId === category.id`) have their `deletedAt` automatically populated, preventing orphaned prompts.
3. **30-Day Garbage Collection (`sweepTombstones`)**:
   - Tombstones younger than 30 days (`Date.now() - deletedAt < 30 * 86,400,000` ms) are retained to propagate deletions to offline devices.
   - Tombstones older than 30 days are physically purged from the array, reclaiming local storage capacity.
4. **Echo Loop Suppression**:
   - When a cloud pull merges remote data locally, `syncMeta.suppressLocalChange.current` is set to `true`, preventing local state reactivity from immediately re-uploading the merged payload back to Supabase.

---

## Consequences

### Positive
- **No Resurrected Prompts**: Deletions cleanly propagate to all connected devices.
- **Concurrent Edit Safety**: Editing Prompt A on Device 1 while editing Prompt B on Device 2 results in a clean merged library containing both updates.
- **Negligible Overhead**: Requires zero third-party dependencies; implemented in less than 80 lines of clean TypeScript ([merge.ts](file:///o:/github/promptVault/src/utils/merge.ts)).
- **Predictable Storage Bounds**: 30-day tombstone cleanup prevents infinite storage growth.

### Negative / Trade-Offs
- **Last-Write-Wins on Same Prompt**: If the exact same prompt is edited simultaneously on two offline devices, the one saved a fraction of a second later wins. For individual prompt libraries, this edge case is exceedingly rare and considered an acceptable trade-off compared to the extreme complexity of character-by-character CRDTs.
- **Device Inactivity Window**: If a device stays completely powered off and offline for longer than 30 days, its purged tombstones will have expired, creating a minor theoretical risk of an old prompt reappearing. 30 days is a standard industry balance for consumer personal apps.

---