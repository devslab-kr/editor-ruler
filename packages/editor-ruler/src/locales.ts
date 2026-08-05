import type { RulerLabels } from './ruler';

/** Built-in accessible-label translations for the ruler handles. */
export const RULER_LABEL_LOCALES: Record<string, RulerLabels> = {
  en: {
    leftMargin: 'Left margin',
    rightMargin: 'Right margin',
    firstLineIndent: 'First-line indent',
    columnBoundary: 'Column boundary',
  },
  ko: {
    leftMargin: '왼쪽 여백',
    rightMargin: '오른쪽 여백',
    firstLineIndent: '첫 줄 들여쓰기',
    columnBoundary: '컬럼 경계',
  },
};

/**
 * Picks the language to use for built-in strings: an explicit code wins, then
 * the document's `<html lang>`, then the browser language, then English.
 * Region subtags are ignored ('ko-KR' → 'ko').
 */
export function detectLanguage(explicit?: string, doc?: Document): string {
  const raw =
    explicit ||
    doc?.documentElement?.lang ||
    doc?.defaultView?.navigator?.language ||
    (typeof navigator !== 'undefined' ? navigator.language : '') ||
    'en';
  return raw.toLowerCase().split('-')[0] || 'en';
}

/** Resolves handle labels for a language, falling back to English. */
export function resolveRulerLabels(language?: string, doc?: Document): RulerLabels {
  return RULER_LABEL_LOCALES[detectLanguage(language, doc)] ?? RULER_LABEL_LOCALES.en!;
}
