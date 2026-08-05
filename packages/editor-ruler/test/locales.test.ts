import { afterEach, describe, expect, it } from 'vitest';
import { detectLanguage, resolveRulerLabels } from '../src/locales';

afterEach(() => {
  document.documentElement.lang = '';
});

describe('detectLanguage', () => {
  it('prefers the explicit code and strips region subtags', () => {
    expect(detectLanguage('ko-KR')).toBe('ko');
    expect(detectLanguage('EN')).toBe('en');
  });

  it('falls back to <html lang>, then browser language', () => {
    document.documentElement.lang = 'ko';
    expect(detectLanguage(undefined, document)).toBe('ko');
    document.documentElement.lang = '';
    // jsdom navigator.language is en-US
    expect(detectLanguage(undefined, document)).toBe('en');
  });
});

describe('resolveRulerLabels', () => {
  it('returns Korean labels for ko and English otherwise', () => {
    expect(resolveRulerLabels('ko').leftMargin).toBe('왼쪽 여백');
    expect(resolveRulerLabels('en').leftMargin).toBe('Left margin');
    expect(resolveRulerLabels('fr').leftMargin).toBe('Left margin'); // fallback
  });
});
