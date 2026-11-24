import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * WCAG 2.2 contrast, measured from the colour tokens themselves, so a palette
 * change that fails either theme fails here before any browser runs. axe checks
 * the rendered page too; this covers states axe never sees (hover, every
 * banner tone) in both themes.
 */

export const CLIENT = join(import.meta.dirname, '..', '..', 'packages/client');

export const CSS = readFileSync(join(CLIENT, 'src/index.css'), 'utf8');

export type Theme = 'light' | 'dark';

export const THEMES: readonly Theme[] = ['light', 'dark'];

/** Each `--color-*: light-dark(oklch(…), oklch(…))` token, by name and theme. */
function readTokens(css: string): Map<string, Record<Theme, string>> {
  const tokens = new Map<string, Record<Theme, string>>();
  const pattern = /--color-([\w-]+):\s*light-dark\((oklch\([^)]*\)),\s*(oklch\([^)]*\))\)/g;
  for (const [, name = '', light = '', dark = ''] of css.matchAll(pattern)) {
    tokens.set(name, { light, dark });
  }
  return tokens;
}

export const TOKENS = readTokens(CSS);

/** Linear-light sRGB channels (0–1, gamut-clipped) of an `oklch(L C H)` colour. */
function oklchToLinearSrgb(colour: string): readonly [number, number, number] {
  const [lightness = 0, chroma = 0, hue = 0] = (colour.match(/[\d.]+/g) ?? []).map(Number);
  const radians = (hue * Math.PI) / 180;
  const [a, b] = [chroma * Math.cos(radians), chroma * Math.sin(radians)];
  const long = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const medium = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const short = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clip = (channel: number): number => Math.min(1, Math.max(0, channel));
  return [
    clip(4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short),
    clip(-1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short),
    clip(-0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short),
  ];
}

/** WCAG relative luminance; OKLab converts straight to linear light, so no gamma step. */
export function luminance(colour: string): number {
  const [red, green, blue] = oklchToLinearSrgb(colour);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** The WCAG contrast ratio of two tokens in one theme. */
export function contrast(foreground: string, background: string, theme: Theme): number {
  const [front, back] = [TOKENS.get(foreground), TOKENS.get(background)];
  if (front === undefined || back === undefined) {
    throw new Error(`Unknown token in ${foreground} on ${background}`);
  }
  const [lighter, darker] = [luminance(front[theme]), luminance(back[theme])].sort(
    (first, second) => second - first,
  );
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
}

/** Text on every ground it is drawn on (1.4.3, 4.5:1). */
export const TEXT_PAIRS: readonly (readonly [string, string])[] = [
  ['ink', 'surface'],
  ['ink', 'card'],
  ['ink', 'brand-soft'],
  ['ink-soft', 'surface'],
  ['ink-soft', 'card'],
  ['muted', 'surface'],
  ['muted', 'card'],
  ['muted', 'brand-soft'],
  ['brand', 'surface'],
  ['brand', 'card'],
  ['brand', 'brand-soft'],
  ['on-brand', 'brand'],
  ['on-brand', 'brand-deep'],
  ['ok-fg', 'ok-bg'],
  ['warn-fg', 'warn-bg'],
  ['danger-fg', 'danger-bg'],
  ['info-fg', 'info-bg'],
];

/** Boundaries and the focus ring against what they sit on (1.4.11 and 2.4.13, 3:1). */
export const NON_TEXT_PAIRS: readonly (readonly [string, string])[] = [
  ['edge', 'card'],
  ['edge', 'surface'],
  ['edge', 'brand-soft'],
  ['accent', 'card'],
  ['accent', 'surface'],
];
