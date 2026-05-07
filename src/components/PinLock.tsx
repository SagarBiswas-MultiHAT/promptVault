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
}

export function PinLock({ storedHash, onUnlocked, onSetPin }: PinLockProps) {
  const [pin, setPin] = useState('');
  const [isError, setIsError] = useState(false);
  const [mode, setMode] = useState<'LOGIN' | 'SETUP_START' | 'SETUP_CONFIRM'>(storedHash ? 'LOGIN' : 'SETUP_START');
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
      <div className="absolute inset-0 bg-[#0D0D0D] opacity-90 backdrop-blur-2xl" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex flex-col items-center space-y-12"
      >
        {/* Icon Header */}
        <div className="relative">
          <motion.div
            animate={isError ? { x: [-10, 10, -10, 10, 0] } : {}}
            className={`w-20 h-20 rounded-full flex items-center justify-center border-2 transition-colors ${
              isError ? 'border-red-500 text-red-500 bg-red-500/10' : 'border-vault-accent text-vault-accent bg-vault-accent/10'
            }`}
          >
            {isError ? <ShieldAlert size={32} /> : mode === 'LOGIN' ? <Lock size={32} /> : <KeyRound size={32} />}
          </motion.div>
          {isError && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white border-4 border-vault-bg"
            >
              <ShieldAlert size={14} />
            </motion.div>
          )}
        </div>

        {/* Text Container */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-mono font-bold tracking-tight uppercase">
            {mode === 'LOGIN' ? 'Vault Locked' : mode === 'SETUP_START' ? 'Establish PIN' : 'Verify PIN'}
          </h1>
          <p className="text-xs text-vault-text-muted font-mono uppercase tracking-[0.2em]">
            {isError 
                ? (mode === 'LOGIN' ? 'Access Denied' : 'Codes Mismatch') 
                : (mode === 'LOGIN' ? 'Enter credentials' : mode === 'SETUP_START' ? '4-6 digits for privacy' : 'Repeat pattern')}
          </p>
        </div>

        {/* PIN Indicators */}
        <div className="flex gap-4">
          {dots.map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                i < pin.length 
                  ? (isError ? 'bg-red-500 border-red-500' : 'bg-vault-accent border-vault-accent scale-110 shadow-[0_0_15px_rgba(245,158,11,0.5)]') 
                  : 'border-vault-border'
              }`}
            />
          ))}
        </div>

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'back'].map((key) => (
            <button
              key={key}
              onClick={() => {
                if (key === 'back') handleBackspace();
                else if (key !== '') handleCharClick(key.toString());
              }}
              className={`w-16 h-16 rounded-full flex items-center justify-center font-mono text-xl transition-all ${
                key === '' 
                  ? 'invisible' 
                  : 'hover:bg-vault-border active:scale-95 border border-vault-border/50 text-vault-text-muted hover:text-vault-accent hover:border-vault-accent/30'
              }`}
            >
              {key === 'back' ? '←' : key}
            </button>
          ))}
        </div>

        {/* Submit Action */}
        <button
          onClick={handleSubmit}
          disabled={pin.length < (mode === 'LOGIN' ? 4 : 4)}
          className="group flex items-center gap-3 px-12 py-4 bg-vault-accent text-vault-bg rounded-lg font-mono font-bold uppercase tracking-tight text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
        >
          {mode === 'LOGIN' ? 'Decrypt' : 'Secure Vault'}
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </motion.div>
    </div>
  );
}
