// @vitest-environment jsdom
import {afterEach, describe, expect, it, vi} from 'vitest';

import {readJson, readRaw, removeKey, writeJson} from '../../src/utils/storage.ts';

const KEY = 'storage-test';

/**
 * Replace `window.localStorage` for one test.
 *
 * Assigning to the property is the only way to simulate the failure modes that
 * matter here: jsdom's real implementation never throws `QuotaExceededError`, and
 * the "reading the property itself throws" case (Safari private browsing) cannot
 * be produced any other way.
 */
function stubStorage(descriptor: PropertyDescriptor) {
  Object.defineProperty(window, 'localStorage', {configurable: true, ...descriptor});
}

const realStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');

afterEach(() => {
  if (realStorage) Object.defineProperty(window, 'localStorage', realStorage);
  window.localStorage.clear();
});

describe('writeJson', () => {
  it('round-trips through readJson', () => {
    expect(writeJson(KEY, {a: 1})).toEqual({ok: true});
    expect(readJson(KEY, (_v): _v is {a: number} => true)).toEqual({a: 1});
  });

  it('reports quota exhaustion distinctly', () => {
    stubStorage({
      value: {
        setItem: () => {
          throw new DOMException('full', 'QuotaExceededError');
        },
      },
    });

    const result = writeJson(KEY, {a: 1});
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe('quota');
  });

  it('treats the Firefox quota name as a quota failure', () => {
    stubStorage({
      value: {
        setItem: () => {
          throw new DOMException('full', 'NS_ERROR_DOM_QUOTA_REACHED');
        },
      },
    });
    const result = writeJson(KEY, {});
    expect(result.ok === false && result.reason).toBe('quota');
  });

  it('treats a legacy numeric quota code as a quota failure', () => {
    // Some engines report only `code` (22 standard, 1014 Firefox) with a name this
    // check would not recognise. `DOMException.code` is derived from the name and
    // read-only, so the only way to reach that branch is to override it.
    const legacy = new DOMException('full', 'SomeOtherError');
    Object.defineProperty(legacy, 'code', {value: 1014});

    stubStorage({
      value: {
        setItem: () => {
          throw legacy;
        },
      },
    });
    const result = writeJson(KEY, {});
    expect(result.ok === false && result.reason).toBe('quota');
  });

  it('reports any other write rejection as unavailable', () => {
    stubStorage({
      value: {
        setItem: () => {
          throw new DOMException('denied', 'SecurityError');
        },
      },
    });
    const result = writeJson(KEY, {});
    expect(result.ok === false && result.reason).toBe('unavailable');
  });

  it('reports unavailable when the API itself is unreachable', () => {
    // Safari private browsing throws on *property access*, before any method call,
    // so a try/catch around setItem alone would not catch this.
    stubStorage({
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });

    const result = writeJson(KEY, {});
    expect(result.ok === false && result.reason).toBe('unavailable');
    expect(readRaw(KEY)).toBeNull();
    expect(() => removeKey(KEY)).not.toThrow();
  });

  it('does not re-resolve a cached failed store', () => {
    // The store is looked up per call on purpose: a user can grant storage
    // permission mid-session, and caching `null` would keep the vault
    // non-persistent for the rest of the page's life.
    let blocked = true;
    const inner = window.localStorage;
    stubStorage({
      get() {
        if (blocked) throw new DOMException('blocked', 'SecurityError');
        return inner;
      },
    });

    expect(writeJson(KEY, {a: 1}).ok).toBe(false);
    blocked = false;
    expect(writeJson(KEY, {a: 1}).ok).toBe(true);
  });
});

describe('readJson', () => {
  it('returns null for absent keys', () => {
    expect(readJson('nope', (_v): _v is unknown => true)).toBeNull();
  });

  it('returns null rather than throwing on unparsable JSON', () => {
    window.localStorage.setItem(KEY, '{not json');
    expect(readJson(KEY, (_v): _v is unknown => true)).toBeNull();
  });

  it('rejects values the validator refuses', () => {
    window.localStorage.setItem(KEY, JSON.stringify({shape: 'wrong'}));
    const isNumber = (v: unknown): v is number => typeof v === 'number';
    expect(readJson(KEY, isNumber)).toBeNull();
  });

  it('swallows a getItem that throws', () => {
    stubStorage({
      value: {
        getItem: () => {
          throw new Error('boom');
        },
      },
    });
    expect(readRaw(KEY)).toBeNull();
  });
});

describe('removeKey', () => {
  it('deletes the key', () => {
    window.localStorage.setItem(KEY, '1');
    removeKey(KEY);
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('ignores a removeItem that throws', () => {
    const spy = vi.fn(() => {
      throw new Error('boom');
    });
    stubStorage({value: {removeItem: spy}});
    expect(() => removeKey(KEY)).not.toThrow();
    expect(spy).toHaveBeenCalled();
  });
});
