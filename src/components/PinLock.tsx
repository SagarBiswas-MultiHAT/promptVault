/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Lock, Unlock, KeyRound, ArrowRight, ShieldCheck, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { validatePin, hashPin } from '../utils/crypto.ts';

interface PinLockProps {
  storedHash: string | null;
  onUnlocked: () => void;
  onSetPin: (hash: string) => void;
  isRemovingLock?: boolean;
  onRemoveLock?: () => void;
  onCancelRemove?: () => void;
}

export function PinLock({ storedHash, onUnlocked, onSetPin, isRemovingLock = false, onRemoveLock, onCancelRemove }: PinLockProps) {
  const [pin, setPin] = useState('');
  const [isError, setIsError] = useState(false);
  const [mode, setMode] = useState<'LOGIN' | 'SETUP_START' | 'SETUP_CONFIRM' | 'REMOVE_LOCK'>(isRemovingLock ? 'REMOVE_LOCK' : (storedHash ? 'LOGIN' : 'SETUP_START'));
  const [firstPin, setFirstPin] = useState('');

  const handleCharClick = (char: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + char);
      setIsError(false);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setIsError(false);
  };

  const handleSubmit = async () => {
    if (mode === 'LOGIN' && storedHash) {
      const isValid = await validatePin(pin, storedHash);
      if (isValid) {
        onUnlocked();
      } else {
        setIsError(true);
        setPin('');
      }
    } else if (mode === 'REMOVE_LOCK' && storedHash) {
      const isValid = await validatePin(pin, storedHash);
      if (isValid) {
        onRemoveLock?.();
      } else {
        setIsError(true);
        setPin('');
      }
    } else if (mode === 'SETUP_START') {
      if (pin.length < 4) {
        setIsError(true);
        return;
      }
      setFirstPin(pin);
      setPin('');
      setMode('SETUP_CONFIRM');
    } else if (mode === 'SETUP_CONFIRM') {
      if (pin === firstPin) {
        const hash = await hashPin(pin);
        onSetPin(hash);
        onUnlocked();
      } else {
        setIsError(true);
        setPin('');
        setMode('SETUP_START');
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleCharClick(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, mode]);

  const isSetup = mode === 'SETUP_START' || mode === 'SETUP_CONFIRM';
  const isConfirm = mode === 'SETUP_CONFIRM';
  const isRemove = mode === 'REMOVE_LOCK';
  const isLogin = mode === 'LOGIN';

  const title = isLogin ? 'Vault Locked' : isRemove ? 'Remove Lock' : isConfirm ? 'Confirm PIN' : 'Create PIN';
  const description = isError
    ? (isLogin || isRemove ? 'Incorrect PIN. Please try again.' : 'PINs did not match. Start over.')
    : (isLogin
      ? 'Enter your PIN to unlock the vault'
      : isRemove
        ? 'Enter your PIN to remove the lock'
        : isConfirm
          ? 'Re-enter your PIN to confirm'
          : 'Choose a 4-6 digit PIN for privacy');
  const primaryLabel = isLogin ? 'Unlock' : isRemove ? 'Remove Lock' : isConfirm ? 'Confirm' : 'Continue';
  const HeaderIcon = isError ? ShieldAlert : isRemove ? Unlock : isConfirm ? ShieldCheck : isLogin ? Lock : KeyRound;

  const iconTone = isError
    ? 'border-red-500 text-red-500 bg-red-500/10 shadow-[0_0_40px_rgba(239,68,68,0.2)]'
    : isRemove
      ? 'border-vault-accent-red/40 text-vault-accent-red bg-vault-accent-red/10 shadow-[0_0_40px_rgba(239,68,68,0.15)]'
      : isConfirm
        ? 'border-vault-accent-emerald/40 text-vault-accent-emerald bg-vault-accent-emerald/10 shadow-[0_0_40px_rgba(16,185,129,0.18)]'
        : 'border-vault-accent/40 text-vault-accent bg-vault-accent/10 shadow-[0_0_40px_rgba(245,158,11,0.12)]';

  const activeDotClass = isError
    ? 'bg-red-500 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
    : isRemove
      ? 'bg-vault-accent-red border-vault-accent-red shadow-[0_0_12px_rgba(239,68,68,0.35)]'
      : isConfirm
        ? 'bg-vault-accent-emerald border-vault-accent-emerald shadow-[0_0_12px_rgba(16,185,129,0.35)]'
        : 'bg-vault-accent border-vault-accent shadow-[0_0_12px_rgba(245,158,11,0.35)]';

  const keypadAccent = isRemove
    ? 'hover:text-vault-accent-red hover:border-vault-accent-red/40'
    : 'hover:text-vault-accent hover:border-vault-accent/40';

  const primaryButtonClass = isRemove
    ? 'group flex items-center gap-3 rounded-xl px-12 py-4 text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed bg-gradient-to-br from-red-500 to-red-600 shadow-[0_8px_24px_rgba(239,68,68,0.25)] hover:shadow-[0_12px_32px_rgba(239,68,68,0.35)]'
    : 'btn-primary group flex items-center gap-3 !px-12 !py-4 !text-[11px] !rounded-xl disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed';

  const dots = Array.from({ length: isLogin ? 6 : Math.max(pin.length, 4) }, (_, i) => i);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-vault-bg font-sans">
      {/* Ambient mesh background, prominent on lock screen */}
      <div className="absolute inset-0 opacity-100"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 20% 30%, rgba(245, 158, 11, 0.06) 0%, transparent 60%),
            radial-gradient(ellipse 60% 80% at 80% 70%, rgba(99, 102, 241, 0.05) 0%, transparent 60%),
            radial-gradient(ellipse 70% 50% at 50% 50%, rgba(16, 185, 129, 0.03) 0%, transparent 60%)
          `
        }}
      />
      <div className="absolute inset-0 bg-[#08090A]/90 backdrop-blur-2xl" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex min-h-full w-full items-start justify-center px-4 py-4 sm:items-center sm:px-6 sm:py-6"
      >
        <div className="glass-panel card-accent-stripe relative flex w-full max-w-lg max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-3xl px-5 py-6 sm:max-h-[calc(100vh-3rem)] sm:px-8 sm:py-8">
          <div className="flex-1 overflow-y-auto pr-1 sm:pr-2">
            <div className="flex items-start gap-4 sm:gap-5">
            <div className="relative">
              <motion.div
                animate={isError ? { x: [-12, 12, -12, 12, 0] } : {}}
                transition={{ duration: 0.4 }}
                className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 ${iconTone}`}
              >
                <HeaderIcon size={30} />
              </motion.div>
              {isError && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-red-500 flex items-center justify-center text-white border-4 border-[#08090A]"
                >
                  <ShieldAlert size={12} />
                </motion.div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {isRemove ? (
                  <span className="badge badge-red">Lock removal</span>
                ) : isSetup ? (
                  <span className={`badge ${isConfirm ? 'badge-emerald' : 'badge-amber'}`}>
                    {isConfirm ? 'Step 2 of 2' : 'Step 1 of 2'}
                  </span>
                ) : (
                  <span className="badge badge-amber">Secure vault</span>
                )}
              </div>
              <h1
                className={`mt-2 text-2xl font-bold tracking-tight ${
                  isRemove
                    ? 'text-vault-accent-red'
                    : isConfirm
                      ? 'text-vault-accent-emerald'
                      : isSetup
                        ? 'text-gradient'
                        : 'text-vault-text'
                }`}
              >
                {title}
              </h1>
              <p className={`mt-2 text-sm leading-relaxed ${isError ? 'text-red-400' : 'text-vault-text-muted'}`}>
                {description}
              </p>
            </div>
          </div>

          {isSetup && (
            <div className="mt-5">
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 rounded-full bg-vault-border/60 overflow-hidden">
                  <div
                    className={`${isConfirm ? 'w-full bg-vault-accent-emerald' : 'w-1/2 bg-vault-accent'} h-full rounded-full transition-all duration-300`}
                  />
                </div>
                <span className="text-[11px] font-mono text-vault-text-muted">{isConfirm ? '2/2' : '1/2'}</span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-3">
                <div className="surface-sunken rounded-lg px-3 py-2">
                  <div className="text-vault-text">Local only</div>
                  <div className="text-vault-text-muted">Stored on this device</div>
                </div>
                <div className="surface-sunken rounded-lg px-3 py-2">
                  <div className="text-vault-text">4 to 6 digits</div>
                  <div className="text-vault-text-muted">Numbers only</div>
                </div>
                <div className="surface-sunken rounded-lg px-3 py-2">
                  <div className="text-vault-text">Easy to change</div>
                  <div className="text-vault-text-muted">Remove and set a new PIN</div>
                </div>
              </div>
            </div>
          )}

          {isRemove && (
            <div className="mt-5 rounded-xl border border-vault-accent-red/30 bg-vault-accent-red/10 px-4 py-3 text-xs">
              <div className="flex items-start gap-3">
                <ShieldAlert size={16} className="text-vault-accent-red mt-0.5" />
                <div>
                  <p className="text-vault-text font-semibold">Lock removal affects this device</p>
                  <p className="text-vault-text-muted mt-1">
                    Removing the lock disables the privacy screen until you set a new PIN.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-7 flex flex-col items-center">
            <div className="text-[10px] font-mono text-vault-text-muted uppercase tracking-[0.3em]">PIN</div>

            <div className="mt-3 flex gap-3">
              {dots.map((_, i) => (
                <motion.div
                  key={i}
                  animate={i < pin.length ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.2 }}
                  className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${
                    i < pin.length
                      ? activeDotClass
                      : 'border-vault-border bg-vault-bg/50'
                  }`}
                />
              ))}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 sm:mt-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'back'].map((key, index) => (
                <button
                  key={key === '' ? `empty-${index}` : key}
                  type="button"
                  onClick={() => {
                    if (key === 'back') handleBackspace();
                    else if (key !== '') handleCharClick(key.toString());
                  }}
                  className={`w-16 h-16 sm:w-18 sm:h-18 rounded-2xl flex items-center justify-center font-mono text-xl transition-all ${
                    key === ''
                      ? 'invisible'
                      : `hover:bg-vault-panel-bright active:scale-95 border border-vault-border/40 text-vault-text ${keypadAccent} bg-vault-panel/60`
                  }`}
                  aria-label={key === 'back' ? 'Delete digit' : key === '' ? '' : `Digit ${key}`}
                >
                  {key === 'back' ? 'DEL' : key}
                </button>
              ))}
            </div>
          </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:mt-6">
            {isRemove && (
              <button
                onClick={onCancelRemove}
                className="px-8 py-3 border border-vault-border text-vault-text-muted rounded-xl font-bold uppercase tracking-[0.15em] text-[11px] hover:border-vault-accent-red/40 hover:text-vault-text transition-all"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={pin.length < 4}
              className={primaryButtonClass}
            >
              {primaryLabel}
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="pt-4 flex items-center justify-center gap-2 opacity-40 sm:pt-5">
            <div className="w-3 h-3 rounded-sm" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }} />
            <span className="text-[10px] font-mono text-vault-text-muted uppercase tracking-[0.15em]">PromptVault</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
