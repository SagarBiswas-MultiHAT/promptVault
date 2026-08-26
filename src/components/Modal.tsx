/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode, useEffect, useId, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

const MODAL_STACK_CHANGED = 'promptvault:modal-stack-changed';
const modalStack: string[] = [];

function emitStackChange() {
  window.dispatchEvent(new Event(MODAL_STACK_CHANGED));
}

export function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const stackId = useId();
  const [isTopmost, setIsTopmost] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const refreshTopmost = () => setIsTopmost(modalStack.at(-1) === stackId);
    modalStack.push(stackId);
    refreshTopmost();
    emitStackChange();

    window.addEventListener(MODAL_STACK_CHANGED, refreshTopmost);
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const timer = window.setTimeout(() => {
      const focusable = dialogRef.current?.querySelector<HTMLElement>('[autofocus], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])');
      (focusable ?? dialogRef.current)?.focus();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(MODAL_STACK_CHANGED, refreshTopmost);
      const index = modalStack.lastIndexOf(stackId);
      if (index >= 0) modalStack.splice(index, 1);
      setIsTopmost(false);
      emitStackChange();
      openerRef.current?.focus();
    };
  }, [isOpen, stackId]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isTopmost) return;
    if (event.key === 'Escape') { event.stopPropagation(); onClose(); return; }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
    if (focusable.length === 0) { event.preventDefault(); dialogRef.current.focus(); return; }
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => { if (isTopmost) onClose(); }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal={isTopmost ? 'true' : undefined}
            aria-labelledby={titleId}
            ref={dialogRef}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            className="relative w-full max-w-2xl overflow-hidden glass-panel rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Top accent line */}
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-vault-accent/40 to-transparent" />
            
            <div className="flex items-center justify-between px-6 py-5">
              <div>
                <h2 id={titleId} className="text-lg font-bold text-vault-text tracking-tight">{title}</h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-vault-border/50 text-vault-text-muted hover:text-vault-text transition-all"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {children}
            </div>
            
            {footer && (
              <div className="px-6 py-4 border-t border-vault-border/50 bg-vault-bg/30">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
