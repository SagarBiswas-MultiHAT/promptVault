/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Prompt } from '../types.ts';
import { Check, Clipboard, X, Info } from 'lucide-react';

interface VariableFormProps {
  prompt: Prompt;
  variables: string[];
  onCopy: (finalBody: string) => void;
  onCancel: () => void;
}

export function VariableForm({ prompt, variables, onCopy, onCancel }: VariableFormProps) {
  const [values, setValues] = useState<Record<string, string>>(
    variables.reduce((acc, v) => ({ ...acc, [v]: '' }), {})
  );

  const handleCopy = () => {
    let finalBody = prompt.body;
    Object.entries(values).forEach(([key, val]) => {
      // Use regex to replace all occurrences of {{key}}
      const regex = new RegExp(`{{${key}}}`, 'g');
      finalBody = finalBody.replace(regex, (val as string) || `[${key}]`);
    });
    onCopy(finalBody);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 bg-vault-accent/10 border border-vault-accent/20 rounded-xl">
        <Info size={18} className="text-vault-accent shrink-0" />
        <p className="text-xs text-vault-text-muted leading-relaxed">
          This prompt contains <span className="text-vault-accent font-bold">{variables.length} variables</span>. Fill them in below to personalize the text before copying.
        </p>
      </div>

      <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
        {variables.map((v) => (
          <div key={v} className="space-y-2">
            <label className="text-[10px] font-mono text-vault-accent uppercase tracking-widest pl-1 font-bold">
              {v.replace(/_/g, ' ')}
            </label>
            <input
              autoFocus={variables[0] === v}
              type="text"
              value={values[v]}
              onChange={(e) => setValues(prev => ({ ...prev, [v]: e.target.value }))}
              placeholder={`Enter ${v}...`}
              className="w-full bg-vault-bg border border-vault-border rounded-lg px-4 py-3 focus:border-vault-accent outline-none transition-all placeholder:text-vault-text-muted/30"
            />
          </div>
        ))}
      </div>

      <div className="flex gap-4 pt-4 border-t border-vault-border">
        <button
          onClick={onCancel}
          className="flex-1 px-6 py-3 border border-vault-border hover:bg-vault-border rounded-xl font-bold uppercase tracking-widest text-xs transition-all"
        >
          Skip
        </button>
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-vault-accent text-vault-bg hover:bg-vault-accent/90 rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-lg shadow-vault-accent/20"
        >
          <Clipboard size={14} />
          Inject & Copy
        </button>
      </div>
    </div>
  );
}
