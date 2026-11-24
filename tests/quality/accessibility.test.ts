/** Tests of colour contrast of the design tokens, forced colours and touch and the page shell. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CLIENT,
  CSS,
  THEMES,
  TOKENS,
  luminance,
  contrast,
  TEXT_PAIRS,
  NON_TEXT_PAIRS,
} from './accessibility.fixtures.js';

describe('colour contrast of the design tokens', () => {
  it('reads every token in both themes', () => {
    expect(TOKENS.size).toBeGreaterThanOrEqual(20);
    expect(() => contrast('ink', 'nowhere', 'light')).toThrow('Unknown token');
  });

  it.each(THEMES)('keeps all text at 4.5:1 or more in the %s theme', (theme) => {
    const failing = TEXT_PAIRS.filter(([front, back]) => contrast(front, back, theme) < 4.5);
    expect(failing).toEqual([]);
  });

  it.each(THEMES)('keeps control boundaries and focus at 3:1 or more in the %s theme', (theme) => {
    const failing = NON_TEXT_PAIRS.filter(([front, back]) => contrast(front, back, theme) < 3);
    expect(failing).toEqual([]);
  });

  it('measures on the WCAG scale: white is 1, black is 0, so their ratio is 21:1', () => {
    expect(luminance('oklch(1 0 0)')).toBeCloseTo(1, 3);
    expect(luminance('oklch(0 0 0)')).toBe(0);
  });
});

describe('forced colours and touch', () => {
  it('keeps boundaries and focus visible in a forced palette', () => {
    expect(CSS).toContain('@media (forced-colors: active)');
    expect(CSS).toContain('outline-color: Highlight');
    expect(CSS).toContain('border-color: CanvasText');
  });

  it('gives every button and field a 44 px minimum height', () => {
    for (const component of ['.btn-primary', '.btn-secondary', '.field']) {
      const rule = CSS.slice(CSS.indexOf(`${component} {\n    @apply`)).split('}')[0] ?? '';
      expect(rule, component).toContain('min-h-11');
    }
  });
});

describe('the page shell', () => {
  it('declares the language for screen readers and hyphenation (3.1.1)', () => {
    expect(readFileSync(join(CLIENT, 'index.html'), 'utf8')).toContain('<html lang="en-IN">');
  });

  it('lets the page zoom: no maximum scale and no disabled user scaling (1.4.4)', () => {
    const viewport = /<meta name="viewport" content="([^"]*)"/.exec(
      readFileSync(join(CLIENT, 'index.html'), 'utf8'),
    )?.[1];
    expect(viewport).toContain('width=device-width');
    expect(viewport).not.toMatch(/maximum-scale|user-scalable=no/);
  });
});
