import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildApiUrl, getApiBaseUrl } from '../../src/utils/api.ts';

describe('api utility', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getApiBaseUrl', () => {
    it('returns empty string when VITE_API_BASE_URL is unset', () => {
      vi.stubEnv('VITE_API_BASE_URL', '');
      expect(getApiBaseUrl()).toBe('');
    });

    it('trims and removes trailing slashes', () => {
      vi.stubEnv('VITE_API_BASE_URL', '  https://api.promptvault.dev///  ');
      expect(getApiBaseUrl()).toBe('https://api.promptvault.dev');
    });
  });

  describe('buildApiUrl', () => {
    it('returns same-origin path when VITE_API_BASE_URL is unset', () => {
      vi.stubEnv('VITE_API_BASE_URL', '');
      expect(buildApiUrl('/api/suggest')).toBe('/api/suggest');
    });

    it('ensures leading slash on path when base is unset', () => {
      vi.stubEnv('VITE_API_BASE_URL', '');
      expect(buildApiUrl('api/suggest')).toBe('/api/suggest');
    });

    it('combines base and path correctly with single slash', () => {
      vi.stubEnv('VITE_API_BASE_URL', 'https://api.promptvault.dev/');
      expect(buildApiUrl('/api/suggest')).toBe('https://api.promptvault.dev/api/suggest');
    });

    it('combines base and path when path lacks leading slash', () => {
      vi.stubEnv('VITE_API_BASE_URL', 'https://api.promptvault.dev');
      expect(buildApiUrl('api/suggest')).toBe('https://api.promptvault.dev/api/suggest');
    });
  });
});
