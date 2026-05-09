/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Lock, Unlock, KeyRound, ArrowRight, ShieldCheck, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

  const dots = Array.from({ length: mode === 'LOGIN' ? 6 : Math.max(pin.length, 4) }, (_, i) => i);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-vault-bg font-sans">
      {/* Ambient mesh background — prominent on lock screen */}
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
        className="relative flex flex-col items-center space-y-10"
      >
        {/* Icon Header */}
        <div className="relative">
          <motion.div
            animate={isError ? { x: [-12, 12, -12, 12, 0] } : {}}
            transition={{ duration: 0.4 }}
            className={`w-24 h-24 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
              isError 
                ? 'border-red-500 text-red-500 bg-red-500/10 shadow-[0_0_40px_rgba(239,68,68,0.15)]' 
                : 'border-vault-accent/50 text-vault-accent bg-vault-accent/8 shadow-[0_0_40px_rgba(245,158,11,0.1)]'
            }`}
          >
            {isError ? <ShieldAlert size={36} /> : mode === 'LOGIN' ? <Lock size={36} /> : <KeyRound size={36} />}
          </motion.div>
          {isError && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white border-4 border-[#08090A]"
            >
              <ShieldAlert size={14} />
            </motion.div>
          )}
        </div>

        {/* Text Container */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === 'LOGIN' ? 'Vault Locked' : mode === 'SETUP_START' ? 'Create PIN' : mode === 'REMOVE_LOCK' ? 'Remove Lock' : 'Confirm PIN'}
          </h1>
          <p className="text-sm text-vault-text-muted leading-relaxed">
            {isError 
                ? (mode === 'LOGIN' || mode === 'REMOVE_LOCK' ? 'Incorrect PIN. Please try again.' : 'PINs did not match. Start over.') 
                : (mode === 'LOGIN' ? 'Enter your PIN to unlock the vault' : mode === 'REMOVE_LOCK' ? 'Enter your PIN to disable the lock' : mode === 'SETUP_START' ? 'Choose a 4-6 digit PIN for privacy' : 'Enter the same PIN again to confirm')}
          </p>
        </div>

        {/* PIN Indicators */}
        <div className="flex gap-4">
          {dots.map((_, i) => (
            <motion.div
              key={i}
              animate={i < pin.length ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.2 }}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                i < pin.length 
                  ? (isError ? 'bg-red-500 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]' : 'bg-vault-accent border-vault-accent shadow-[0_0_12px_rgba(245,158,11,0.4)]') 
                  : 'border-vault-border bg-vault-bg/50'
              }`}
            />
          ))}
        </div>

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'back'].map((key) => (
            <button
              key={key}
              onClick={() => {
                if (key === 'back') handleBackspace();
                else if (key !== '') handleCharClick(key.toString());
              }}
              className={`w-[72px] h-[72px] rounded-2xl flex items-center justify-center font-mono text-xl transition-all ${
                key === '' 
                  ? 'invisible' 
                  : 'hover:bg-vault-panel-bright active:scale-95 border border-vault-border/40 text-vault-text hover:text-vault-accent hover:border-vault-accent/20 bg-vault-panel/50'
              }`}
            >
              {key === 'back' ? '←' : key}
            </button>
          ))}
        </div>

        {/* Submit Action */}
        <div className="flex gap-4 items-center">
          {mode === 'REMOVE_LOCK' && (
            <button
              onClick={onCancelRemove}
              className="px-8 py-4 border border-vault-border text-vault-text-muted rounded-xl font-bold uppercase tracking-wider text-sm hover:border-vault-accent/30 hover:text-vault-text transition-all"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={pin.length < (mode === 'LOGIN' || mode === 'REMOVE_LOCK' ? 4 : 4)}
            className="btn-primary group flex items-center gap-3 !px-12 !py-4 !text-sm !rounded-xl disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
          >
            {mode === 'LOGIN' ? 'Unlock' : mode === 'REMOVE_LOCK' ? 'Remove Lock' : 'Continue'}
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Brand Watermark */}
        <div className="pt-4 flex items-center gap-2 opacity-30">
          <div className="w-3 h-3 rounded-sm" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }} />
          <span className="text-[10px] font-mono text-vault-text-muted uppercase tracking-[0.15em]">PromptVault</span>
        </div>
      </motion.div>
    </div>
  );
}
