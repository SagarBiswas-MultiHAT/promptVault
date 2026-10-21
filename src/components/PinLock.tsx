/**
 * @project PromptVault (https://github.com/SagarBiswas-MultiHAT/promptVault)
 * @author Sagar Biswas (@SagarBiswas-MultiHAT) <https://multihat.dev>
 * @copyright Copyright (c) 2026 Sagar Biswas (MultiHAT)
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, type FormEvent } from 'react';
import { KeyRound, Lock, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { SecretMode } from '../utils/crypto.ts';

export interface PinLockProps {
  mode: 'unlock' | 'create' | 'remove';
  secretMode?: SecretMode;
  onSubmit: (secret: string, mode: SecretMode) => Promise<boolean | { recoveryKey: string }>;
  onRecover?: (recoveryKey: string) => Promise<boolean>;
  onCancel?: () => void;
}

export function PinLock({ mode, secretMode = 'pin', onSubmit, onRecover, onCancel }: PinLockProps) {
  const isCreate = mode === 'create';
  const [selectedMode, setSelectedMode] = useState<SecretMode>(isCreate ? 'passphrase' : secretMode);
  const [secret, setSecret] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const label = selectedMode === 'pin' ? 'PIN' : 'Passphrase';
  const minLength = selectedMode === 'pin' ? (isCreate ? 6 : 4) : 15;

  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  const handleModeChange = (nextMode: SecretMode) => {
    setSelectedMode(nextMode);
    setSecret('');
    setConfirmation('');
    setError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (cooldownRemaining > 0) return;
    setError(null);

    if (recovery) {
      if (!onRecover) return;
      setBusy(true);
      const ok = await onRecover(secret.trim());
      setBusy(false);
      if (!ok) setError('That recovery key could not unlock this vault.');
      return;
    }

    if (secret.length < minLength) {
      setError(`${label} must be at least ${minLength} ${selectedMode === 'pin' ? 'digits' : 'characters'}.`);
      return;
    }

    if (selectedMode === 'pin' && !/^\d+$/.test(secret)) {
      setError('PIN must contain only numbers.');
      return;
    }

    if (isCreate && secret !== confirmation) {
      setError('The two entries do not match.');
      return;
    }

    setBusy(true);
    const result = await onSubmit(secret, selectedMode);
    setBusy(false);

    if (typeof result === 'object') {
      setRecoveryKey(result.recoveryKey);
      return;
    }

    if (!result) {
      if (mode === 'unlock') {
        const nextFailures = failedAttempts + 1;
        setFailedAttempts(nextFailures);
        if (nextFailures >= 3) {
          const penalty = nextFailures === 3 ? 2 : nextFailures === 4 ? 5 : nextFailures === 5 ? 10 : 30;
          setCooldownRemaining(penalty);
          setError(`Incorrect ${label.toLowerCase()}. Too many failed attempts. Please wait ${penalty}s before trying again.`);
        } else {
          setError(`Incorrect ${label.toLowerCase()}.`);
        }
      } else {
        setError('We could not update the vault. Please try again.');
      }
    } else {
      setFailedAttempts(0);
      setCooldownRemaining(0);
    }
  };

  const title = recoveryKey
    ? 'Save your recovery key'
    : recovery
      ? 'Recover vault'
      : mode === 'unlock'
        ? 'Vault Locked'
        : mode === 'remove'
          ? 'Remove protection'
          : 'Protect this vault';

  const Icon = error ? ShieldAlert : mode === 'unlock' ? Lock : isCreate ? ShieldCheck : KeyRound;

  if (recoveryKey) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-vault-bg p-4 text-vault-text">
        <section className="w-full max-w-md rounded-3xl border border-vault-border bg-vault-panel p-6 shadow-2xl sm:p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-vault-accent/30 bg-vault-accent/10 p-3 text-vault-accent">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Save your recovery key</h1>
              <p className="mt-2 text-sm text-vault-text-muted">It is shown only once. Anyone with this key can unlock this vault.</p>
            </div>
          </div>
          <code className="mt-6 block break-all rounded-xl border border-vault-border bg-vault-bg p-4 text-sm text-vault-accent">{recoveryKey}</code>
          <button onClick={onCancel} className="btn-primary mt-6 w-full rounded-xl px-5 py-3 text-xs">I saved it securely</button>
        </section>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-vault-bg p-4 text-vault-text">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-vault-border bg-vault-panel p-6 shadow-2xl sm:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-vault-accent/30 bg-vault-accent/10 p-3 text-vault-accent">
            <Icon size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="mt-2 text-sm text-vault-text-muted">
              {recovery
                ? 'Enter the recovery key shown when encryption was enabled.'
                : isCreate
                  ? 'Encrypt the vault on this device. Your secret is never stored.'
                  : `Enter your ${label.toLowerCase()} to continue.`}
            </p>
          </div>
        </div>

        {isCreate && !recovery && (
          <fieldset className="mt-6 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleModeChange('passphrase')}
              className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                selectedMode === 'passphrase'
                  ? 'border-vault-accent bg-vault-accent/10 text-vault-accent'
                  : 'border-vault-border text-vault-text-muted hover:border-vault-accent/40'
              }`}
            >
              Passphrase (Recommended)
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('pin')}
              className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                selectedMode === 'pin'
                  ? 'border-vault-accent bg-vault-accent/10 text-vault-accent'
                  : 'border-vault-border text-vault-text-muted hover:border-vault-accent/40'
              }`}
            >
              Numeric PIN (6+ Digits)
            </button>
          </fieldset>
        )}

        <div className="mt-6 space-y-4">
          <label className="block text-xs font-mono uppercase tracking-widest text-vault-text-muted">
            {recovery ? 'Recovery key' : label}
            <input
              autoFocus
              value={secret}
              onChange={event => setSecret(event.target.value)}
              inputMode={selectedMode === 'pin' && !recovery ? 'numeric' : 'text'}
              pattern={selectedMode === 'pin' && !recovery ? '[0-9]*' : undefined}
              type="password"
              disabled={cooldownRemaining > 0}
              className="mt-2 w-full rounded-xl border border-vault-border bg-vault-bg px-4 py-3 text-sm outline-none focus:border-vault-accent disabled:opacity-50"
            />
          </label>
          {isCreate && !recovery && (
            <label className="block text-xs font-mono uppercase tracking-widest text-vault-text-muted">
              Confirm {label}
              <input
                value={confirmation}
                onChange={event => setConfirmation(event.target.value)}
                inputMode={selectedMode === 'pin' ? 'numeric' : 'text'}
                pattern={selectedMode === 'pin' ? '[0-9]*' : undefined}
                type="password"
                disabled={cooldownRemaining > 0}
                className="mt-2 w-full rounded-xl border border-vault-border bg-vault-bg px-4 py-3 text-sm outline-none focus:border-vault-accent disabled:opacity-50"
              />
            </label>
          )}
        </div>

        {error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}

        {isCreate && !recovery && (
          <p className="mt-4 text-xs leading-relaxed text-vault-text-muted">
            {selectedMode === 'passphrase'
              ? 'Passphrases offer the strongest cryptographic defense against offline brute-force attacks. Save the recovery key shown next; it is the only way to recover a forgotten secret.'
              : 'A PIN is convenient for quick access on trusted devices, but offers less entropy than a passphrase. Minimum 6 digits required. Save the recovery key shown next.'}
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          {onCancel && (
            <button type="button" onClick={onCancel} className="rounded-xl border border-vault-border px-4 py-2 text-xs">
              Cancel
            </button>
          )}
          {mode === 'unlock' && onRecover && (
            <button
              type="button"
              onClick={() => {
                setRecovery(value => !value);
                setSecret('');
                setError(null);
              }}
              className="rounded-xl border border-vault-border px-4 py-2 text-xs"
            >
              {recovery ? 'Use secret' : 'Use recovery key'}
            </button>
          )}
          <button
            disabled={busy || cooldownRemaining > 0}
            className="btn-primary rounded-xl px-5 py-2 text-xs disabled:opacity-50"
          >
            {cooldownRemaining > 0
              ? `Wait ${cooldownRemaining}s…`
              : busy
                ? 'Working…'
                : recovery
                  ? 'Recover'
                  : mode === 'unlock'
                    ? 'Unlock'
                    : mode === 'remove'
                      ? 'Remove protection'
                      : 'Encrypt vault'}
          </button>
        </div>
      </form>
    </div>
  );
}
