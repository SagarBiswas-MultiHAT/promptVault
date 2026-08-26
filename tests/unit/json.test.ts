import { describe, expect, it } from 'vitest';
import { extractJson } from '../../server/json.ts';

/**
 * `extractJson` is the last line of defence between a model's free-form text and
 * the client. Provider-side JSON mode makes malformed output rare, not
 * impossible, so every shape a model has plausibly emitted is pinned here.
 */
describe('extractJson', () => {
  it('parses a bare JSON object', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('parses a ```json fenced block', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('parses an unlabelled fenced block', () => {
    expect(extractJson('```\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('ignores prose wrapped around the object', () => {
    expect(extractJson('Sure! Here is the result:\n{"a":1}\nHope that helps.')).toEqual({ a: 1 });
  });

  it('keeps nested braces intact by scanning to the LAST closing brace', () => {
    expect(extractJson('noise {"a":{"b":2}} noise')).toEqual({ a: { b: 2 } });
  });

  it('falls through to the brace scan when the fence contains unparsable text', () => {
    // A model that opens a fence, apologises inside it, then emits the real
    // object afterwards used to fail outright even though the JSON was right
    // there. The fence is tried first, then abandoned.
    expect(extractJson('```\nlet me try again\n```\n{"a":1}')).toEqual({ a: 1 });
  });

  it('throws when there is no object at all', () => {
    expect(() => extractJson('I cannot help with that.')).toThrow(/No JSON object found/);
  });

  it('throws on truncated JSON rather than returning something partial', () => {
    // The repair retry in suggest.ts depends on this throwing.
    expect(() => extractJson('{"improvedPrompt":"half a resp')).toThrow();
  });

  it('throws when the braces are in the wrong order', () => {
    expect(() => extractJson('} then {')).toThrow(/No JSON object found/);
  });
});
