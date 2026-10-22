# ADR 0001: Zero-Knowledge Envelope Encryption with Dual KEKs

| Metadata | Details |
| :--- | :--- |
| **Status** | Accepted / Implemented |
| **Date** | 2026-10-22 |
| **Deciders** | Sagar Biswas (@SagarBiswas-MultiHAT) / MultiHAT (<https://multihat.dev>) |
| **Consulted** | Engineering & Cryptography Team |
| **Informs** | [crypto.ts](file:///o:/github/promptVault/src/utils/crypto.ts), [useVault.ts](file:///o:/github/promptVault/src/hooks/useVault.ts), [encryption-workflow.png](file:///o:/github/promptVault/diagrams/encryption-workflow.png) |

---

## Context & Problem Statement

In early versions of PromptVault (v1.x), the vault data was stored in browser `localStorage` as unencrypted plaintext JSON. The locking mechanism simply computed an unsalted SHA-256 hash of a 4-digit PIN. Because a 4-digit numeric PIN has only 10,000 possible combinations (10^4), an attacker with physical or malware access to the user's computer could brute-force the PIN in less than 50 milliseconds using basic hardware and read every prompt.

We required a military-grade, zero-knowledge encryption architecture that:
1. Encrypts all prompts, categories, tags, and settings at rest on the client device.
2. Prevents offline brute-force attacks against short numeric PINs or passphrases.
3. Provides a reliable recovery mechanism if the user forgets their PIN without introducing an unencrypted backdoor or central reset server.

---

## Decision Drivers

- **Zero-Knowledge Principle**: The user alone holds the key. No master key, plaintext prompt, or PIN hash should ever touch disk or leave the device.
- **Hardware Acceleration**: Must execute using native, hardware-accelerated CPU instructions (AES-NI) inside the browser without third-party external dependencies.
- **Brute-Force Resistance**: Computing a single guess must require substantial computational work to make offline cracking economically infeasible.
- **Recovery Without Server Trust**: Users frequently forget PINs; a recovery mechanism must exist entirely on the client.

---

## Considered Options

1. **Option 1: Direct Passphrase-Derived Key (No Envelope)**: Derive an AES key directly from the user's PIN via PBKDF2 and use it directly to encrypt the vault JSON.
   - *Problem*: Changing the PIN requires re-encrypting the entire vault. If the user forgets their PIN, recovery is mathematically impossible unless a plaintext escrow server is used.
2. **Option 2: Asymmetric RSA / WebAuthn Keys**: Generate an RSA-OAEP public/private key pair or rely strictly on hardware WebAuthn biometrics.
   - *Problem*: Inconsistent cross-browser support for raw private key export and recovery; complex backup file portability.
3. **Option 3: Symmetric Envelope Encryption with Dual Key Encryption Keys (Chosen)**:
   - Generate a single high-entropy random 32-byte (256-bit) Master Vault Key (Data Encryption Key or DEK) via `crypto.getRandomValues`.
   - The DEK encrypts the vault payload using AES-256-GCM.
   - The DEK is then wrapped independently into two separate cryptographic envelopes:
     - `primary`: Wrapped using a KEK derived from the user's PIN/Passphrase via PBKDF2-SHA-256 with 600,000 rounds.
     - `recovery`: Wrapped using a second KEK derived from a randomly generated 64-character hex Emergency Recovery Key.

---

## Decision Outcome

We selected **Option 3: Symmetric Envelope Encryption with Dual KEKs**.

### Technical Implementation Details
1. **PBKDF2-SHA-256 with 600,000 Rounds**: Adheres to modern OWASP recommendations. Computing 600,000 rounds of HMAC-SHA-256 takes approximately 1.5 seconds on modern desktop hardware, effectively neutralizing brute-force dictionary attacks. Furthermore, new vaults enforce a 6-digit minimum PIN (1,000,000 combinations) and default to Passphrase setup (>= 15 characters), while the client interface enforces progressive cooldown delays against repeated unlock failures.
2. **AES-256-GCM Authenticated Encryption**: Guarantees confidentiality and cryptographic authenticity. If the user enters the wrong PIN, GCM authentication tag verification fails with an `OperationError`, leaving the vault safely locked without decrypting corrupted data.
3. **Non-Extractable In-Memory DEK & State Zeroing**: Once unlocked, the DEK is imported as an unextractable `CryptoKey` in browser RAM (`keyRef.current`). When the user clicks "Lock", the key reference is set to `null` synchronously, and decrypted prompt arrays in React state and `dataRef` are immediately replaced with an empty vault to guarantee complete memory hygiene.
4. **Emergency Recovery Key**: Generated as 32 random bytes (64-character lowercase hex) and shown to the user once. If the PIN is forgotten, this key unwraps the recovery wrapper and restores the vault immediately.

---

## Consequences

### Positive
- **Rock-Solid Security**: Zero plaintext prompt titles, bodies, tags, or PIN hashes exist at rest in `localStorage`.
- **Zero Central Backdoors**: Even the creators of PromptVault cannot decrypt a user's vault.
- **Instant Secret Changes**: Changing a PIN or passphrase only requires re-wrapping the 32-byte DEK, not re-encrypting a multi-megabyte prompt library.
- **No Third-Party Bloat**: Built entirely on the standard W3C Web Crypto API (`window.crypto.subtle`), keeping the production bundle lightweight.

### Negative / Trade-Offs
- **CPU Work on Unlock**: Computing 600,000 PBKDF2 rounds causes a 1.5s to 3.0s delay when unlocking on older mobile devices (intentionally designed to stop attackers).
- **Permanent Data Loss if Both Keys are Lost**: Because there is no central password reset server, losing both the PIN and the emergency recovery key results in permanent loss of access. This trade-off is clearly communicated in the UI.

---