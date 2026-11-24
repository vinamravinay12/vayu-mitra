/**
 * The layering in docs/ARCHITECTURE.md, enforced: the engine is pure, the
 * browser and the server meet only through the engine, vendor SDKs sit behind
 * one adapter each, HTTP stays at the edge, and no module imports itself back.
 */
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(import.meta.dirname, '..', '..');

/** Production source files (no tests, no test helpers) under a package's `src`. */
function sourcesOf(packageName: string): string[] {
  const walk = (folder: string): string[] =>
    readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
      const path = join(folder, entry.name);
      if (entry.isDirectory()) return entry.name === 'test-utils' ? [] : walk(path);
      return /\.tsx?$/.test(entry.name) && !/\.(test|fixtures)\.tsx?$/.test(entry.name)
        ? [path]
        : [];
    });
  return walk(join(REPO_ROOT, 'packages', packageName, 'src'));
}

/** Every module specifier a file imports or re-exports. */
function importsOf(file: string): string[] {
  const text = readFileSync(file, 'utf8');
  return [...text.matchAll(/(?:import|export)[^'";]*?from\s+'([^']+)'|import\s+'([^']+)'/g)].map(
    ([, from, bare]) => from ?? bare ?? '',
  );
}

/** Files (repo-relative) whose imports match the pattern, with the offending specifier. */
function importing(files: readonly string[], pattern: RegExp): string[] {
  return files.flatMap((file) =>
    importsOf(file)
      .filter((specifier) => pattern.test(specifier))
      .map((specifier) => `${relative(REPO_ROOT, file)} → ${specifier}`),
  );
}

/** The source file a relative `./x.js` specifier points at, or null for a package. */
function resolveLocal(from: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) return null;
  const base = resolve(dirname(from), specifier).replace(/\.js$/, '');
  return ['.ts', '.tsx'].map((extension) => base + extension).find(existsSync) ?? null;
}

/** The first import cycle among the files, as a path of repo-relative names; null if none. */
function findCycle(files: readonly string[]): string[] | null {
  const state = new Map<string, 'open' | 'done'>();
  const visit = (file: string, trail: string[]): string[] | null => {
    if (state.get(file) === 'done') return null;
    if (state.get(file) === 'open') return [...trail.slice(trail.indexOf(file)), file];
    state.set(file, 'open');
    for (const next of importsOf(file).map((specifier) => resolveLocal(file, specifier))) {
      const cycle = next === null ? null : visit(next, [...trail, file]);
      if (cycle !== null) return cycle;
    }
    state.set(file, 'done');
    return null;
  };
  for (const file of files) {
    const cycle = visit(file, []);
    if (cycle !== null) return cycle.map((path) => relative(REPO_ROOT, path));
  }
  return null;
}

const CORE = sourcesOf('core');
const SERVER = sourcesOf('server');
const CLIENT = sourcesOf('client');

/** Server modules allowed to touch HTTP: the app, its routes, middleware and static serving. */
const HTTP_EDGE = /\/server\/src\/(app\.ts|routes\/|security\/|static\/|auth\/require-user\.ts)/;
/** The composition root and the one adapter per vendor SDK. */
const SDK_ADAPTERS = /\/server\/src\/(index\.ts|gcp\/bindings\.ts|llm\/gemini-client\.ts)$/;

describe('architecture', () => {
  it('finds the source it judges', () => {
    expect([CORE.length, SERVER.length, CLIENT.length].every((count) => count > 10)).toBe(true);
  });
  it('keeps the engine pure: Zod only, no Node, no I/O, no clock, no randomness', () => {
    expect(importing(CORE, /^(?!zod$|\.)/)).toEqual([]);
    const impure = /\bfetch\(|\bprocess\.|Date\.now\(|new Date\(\)|Math\.random\(|console\./;
    const offenders = CORE.filter((file) => impure.test(readFileSync(file, 'utf8')));
    expect(offenders.map((file) => relative(REPO_ROOT, file))).toEqual([]);
  });
  it('lets the browser and the server meet only through the engine', () => {
    expect(importing(CLIENT, /server|^node:|^express|^@google/)).toEqual([]);
    expect(importing(CLIENT, /^(?!\.|react$|react-dom\/client$|zod$|@vayu\/core$)/)).toEqual([]);
    expect(importing(SERVER, /packages\/client|@vayu\/client|^react/)).toEqual([]);
    expect(importing([...CLIENT, ...SERVER], /^@vayu\/core\/|packages\/core/)).toEqual([]);
  });
  it('keeps each vendor SDK behind one adapter', () => {
    const outside = SERVER.filter((file) => !SDK_ADAPTERS.test(file));
    expect(
      importing(outside, /^(@google-cloud\/|@google\/genai|google-auth-library|web-push)/),
    ).toEqual([]);
  });
  it('keeps HTTP at the edge: the domain never sees Express, and only the app mounts routes', () => {
    const domain = SERVER.filter((file) => !HTTP_EDGE.test(file));
    expect(importing(domain, /^express$|^compression$/)).toEqual([]);
    const mounting = SERVER.filter((file) => !file.endsWith('/server/src/app.ts'));
    expect(importing(mounting, /\/routes\//)).toEqual([]);
  });
});

describe('architecture', () => {
  it('has no import cycles in any package', () => {
    for (const files of [CORE, SERVER, CLIENT]) {
      expect(findCycle(files)).toBeNull();
    }
  });
  it('would notice a cycle', () => {
    const folder = mkdtempSync(join(tmpdir(), 'cycle-'));
    writeFileSync(join(folder, 'a.ts'), "import { b } from './b.js';\nexport const a = b;\n");
    writeFileSync(join(folder, 'b.ts'), "import { a } from './a.js';\nexport const b = a;\n");
    writeFileSync(join(folder, 'c.ts'), "import { z } from 'zod';\nexport const c = z;\n");
    try {
      expect(findCycle([join(folder, 'c.ts')])).toBeNull();
      expect(findCycle([join(folder, 'a.ts')])?.map((path) => basename(path))).toEqual([
        'a.ts',
        'b.ts',
        'a.ts',
      ]);
    } finally {
      rmSync(folder, { recursive: true });
    }
  });
});
