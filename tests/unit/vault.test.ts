import { describe, expect, it, vi } from 'vitest';

import { extractVariables, formatTimestamp, substituteVariables } from '../../src/utils/vault.ts';

describe('formatTimestamp', () => {
  it('formats recent sync times relatively', () => {
    vi.setSystemTime(new Date('2026-08-27T12:00:00Z'));
    expect(formatTimestamp(new Date('2026-08-27T11:58:00Z').getTime())).toBe('2 minutes ago');
    expect(formatTimestamp(new Date('2026-08-28T12:00:00Z').getTime())).toBe('tomorrow');
    expect(formatTimestamp(null)).toBe('Never');
    vi.useRealTimers();
  });
});

describe('extractVariables', () => {
  it('extracts trimmed variable names in first-appearance order and deduplicates', () => {
    const body = 'Hello {{ name }}, welcome to {{ role }}! Repeat: {{ name }} and {{  company  }}.';
    expect(extractVariables(body)).toEqual(['name', 'role', 'company']);
  });

  it('accepts hyphens and underscores in variable names', () => {
    const body = '{{ user_name }} has id {{ user-id-123 }}.';
    expect(extractVariables(body)).toEqual(['user_name', 'user-id-123']);
  });

  it('ignores colon-containing object literals like React JSX styles', () => {
    const body = '<div style={{ color: "red", margin: 0 }} className="p-4">{{ content }}</div>';
    expect(extractVariables(body)).toEqual(['content']);
  });

  it('ignores whitespace-only brackets and empty tags', () => {
    const body = 'Empty tags {{   }} and {{}} should not extract.';
    expect(extractVariables(body)).toEqual([]);
  });

  it('leaves dot-notation unextracted per SRS FR-3.1 identifier boundary', () => {
    const body = '{{ user.name }} and {{ user_name }}';
    expect(extractVariables(body)).toEqual(['user_name']);
  });
});

describe('substituteVariables', () => {
  it('replaces all instances of multiple dynamic keys', () => {
    const body = 'Hi {{name}}, your balance is {{amount}}. Thanks {{name}}!';
    const result = substituteVariables(body, { name: 'Alice', amount: '50' });
    expect(result).toBe('Hi Alice, your balance is 50. Thanks Alice!');
  });

  it('handles inner whitespace around variable names', () => {
    const body = 'Subject: {{   topic   }} and {{category}}';
    const result = substituteVariables(body, { topic: 'AI', category: 'Tech' });
    expect(result).toBe('Subject: AI and Tech');
  });

  it('respects identifier boundaries: hyphens and underscores match, dot-notation is unchanged', () => {
    const body = '{{user_name}} / {{user-id}} / {{user.id}}';
    const result = substituteVariables(body, {
      user_name: 'alice_01',
      'user-id': 'id-42',
      'user.id': 'not-matched',
    });
    expect(result).toBe('alice_01 / id-42 / {{user.id}}');
  });

  it('ignores React JSX style objects and inline objects', () => {
    const body = '<div style={{ color: "red" }}>{{label}}</div>';
    const result = substituteVariables(body, { label: 'Click Me' });
    expect(result).toBe('<div style={{ color: "red" }}>Click Me</div>');
  });

  it('ignores whitespace-only brackets', () => {
    const body = 'Keep {{   }} and {{}} untouched.';
    const result = substituteVariables(body, {});
    expect(result).toBe('Keep {{   }} and {{}} untouched.');
  });

  it('falls back to [key] when a variable is omitted from values', () => {
    const body = 'Prompt with {{topic}} and {{style}}.';
    const result = substituteVariables(body, { topic: 'Coding' });
    expect(result).toBe('Prompt with Coding and [style].');
  });

  it('falls back to [key] when a variable value is empty or whitespace-only', () => {
    const body = 'Review {{code}} with {{notes}}.';
    const result = substituteVariables(body, { code: '', notes: '   ' });
    expect(result).toBe('Review [code] with [notes].');
  });

  it('preserves special $ replacement patterns without corruption', () => {
    const body = 'Price: {{cost}}, Group: {{group}}, Total: {{total}}';
    const result = substituteVariables(body, {
      cost: '$100',
      group: '$1 and $&',
      total: '$$50',
    });
    expect(result).toBe('Price: $100, Group: $1 and $&, Total: $$50');
  });
});
