/** Conventions every module follows, read from the repository: an opening comment and documented exports. */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Repository root, two levels above this file. */
const ROOT = join(import.meta.dirname, '..', '..');

/** Folders that hold dependencies or build output. */
const SKIPPED = new Set(['node_modules', 'dist', 'dist-tsc', 'coverage']);

/** Every TypeScript file under a folder, as a repository-relative path. */
function typescriptFiles(folder: string): string[] {
  return readdirSync(join(ROOT, folder), { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) return SKIPPED.has(entry.name) ? [] : typescriptFiles(path);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [path] : [];
  });
}

/** Every TypeScript file (source, tests, helpers, browser tests) and the root configs. */
const FILES = [
  ...['packages', 'e2e', 'tests'].flatMap(typescriptFiles),
  'eslint.config.js',
  'vitest.config.ts',
  'playwright.config.ts',
];

/** The files that export things: everything but the tests themselves. */
const MODULES = FILES.filter((path) => !/\.(test|spec)\.tsx?$/.test(path));

/** True when the file opens with a comment that stands on its own, not one attached to a declaration. */
const opensWithComment = (text: string): boolean => {
  const match = /^\/\*\*[\s\S]*?\*\/\n(.*)/.exec(text);
  const next = match?.[1] ?? 'none';
  return next === '' || next.startsWith('import');
};

/** Exports in a file that have no doc comment directly above them, as "path:line". */
function undocumentedExports(path: string): string[] {
  const lines = readFileSync(join(ROOT, path), 'utf8').split('\n');
  return lines.flatMap((line, index) =>
    /^export (?:default )?(?:async )?(?:function|const|let|interface|type|class|enum) /.test(
      line,
    ) && !(lines[index - 1] ?? '').trim().endsWith('*/')
      ? [`${path}:${String(index + 1)}`]
      : [],
  );
}

describe('module conventions', () => {
  it('finds the modules it judges', () => {
    expect(MODULES.length).toBeGreaterThan(150);
    expect(FILES.length - MODULES.length).toBeGreaterThan(70);
    expect(relative(ROOT, join(ROOT, MODULES[0] ?? ''))).not.toBe('');
  });

  it('opens every file, tests included, with a comment saying what it is for', () => {
    const silent = FILES.filter(
      (path) => !opensWithComment(readFileSync(join(ROOT, path), 'utf8')),
    );
    expect(silent).toEqual([]);
  });

  it('documents every export', () => {
    expect(MODULES.flatMap(undocumentedExports)).toEqual([]);
  });

  it('tells a module comment from one that belongs to the first declaration', () => {
    expect(opensWithComment('/** A module. */\n\nexport const a = 1;\n')).toBe(true);
    expect(opensWithComment('/** A module. */\nimport { b } from "./b.js";\n')).toBe(true);
    expect(opensWithComment('/** The constant. */\nexport const a = 1;\n')).toBe(false);
    expect(opensWithComment('export const a = 1;\n')).toBe(false);
  });
});
