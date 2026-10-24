import { describe, expect, it } from 'vitest';
import { isOriginAllowed } from '../../server/middleware/cors.ts';

describe('CORS origin matching', () => {
  it('allows exact web origins', () => {
    const allowed = ['https://promptvault.dev', 'http://localhost:5173'];
    expect(isOriginAllowed('https://promptvault.dev', allowed)).toBe(true);
    expect(isOriginAllowed('http://localhost:5173', allowed)).toBe(true);
    expect(isOriginAllowed('https://evil.com', allowed)).toBe(false);
  });

  it('allows exact extension origins', () => {
    const allowed = ['chrome-extension://abcdefghijklmnop', 'moz-extension://1234-5678'];
    expect(isOriginAllowed('chrome-extension://abcdefghijklmnop', allowed)).toBe(true);
    expect(isOriginAllowed('chrome-extension://other-id', allowed)).toBe(false);
    expect(isOriginAllowed('moz-extension://1234-5678', allowed)).toBe(true);
    expect(isOriginAllowed('moz-extension://other-uuid', allowed)).toBe(false);
  });

  it('allows extension wildcards when explicitly configured', () => {
    const allowed = ['chrome-extension://*', 'moz-extension://*'];
    expect(isOriginAllowed('chrome-extension://any-dev-id-1234', allowed)).toBe(true);
    expect(isOriginAllowed('moz-extension://any-dev-uuid-5678', allowed)).toBe(true);
    expect(isOriginAllowed('https://chrome-extension.fake.com', allowed)).toBe(false);
    expect(isOriginAllowed('https://promptvault.dev', allowed)).toBe(false);
  });

  it('rejects unauthorized origins', () => {
    const allowed = ['https://promptvault.dev'];
    expect(isOriginAllowed('https://promptvault.dev.attacker.com', allowed)).toBe(false);
    expect(isOriginAllowed('http://promptvault.dev', allowed)).toBe(false);
    expect(isOriginAllowed('null', allowed)).toBe(false);
  });

  it('treats extension wildcards separately so production filtering works', () => {
    const configuredOrigins = ['https://promptvault.dev', 'chrome-extension://*'];
    // In production, cors.ts filters out origins ending with ://*
    const prodOrigins = configuredOrigins.filter((o) => !o.endsWith('://*'));
    expect(prodOrigins).toEqual(['https://promptvault.dev']);
    expect(isOriginAllowed('chrome-extension://some-id', prodOrigins)).toBe(false);
  });
});
