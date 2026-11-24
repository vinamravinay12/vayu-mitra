import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

/**
 * Repository standards enforced as tests, so they are evidence rather than intent.
 * Place at `tests/quality/hygiene.test.ts`. Adapt the constants below to the project.
 */

/** Repository root, two levels above this file. */
export const REPO_ROOT = join(import.meta.dirname, '..', '..');

/** Folders that hold build output or dependencies, never authored code. */
const IGNORED_FOLDERS = new Set([
  'node_modules',
  'dist',
  'dist-tsc',
  'coverage',
  '.git',
  'playwright-report',
  'test-results',
]);

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.mjs', '.js']);

export const MAX_SOURCE_LINES = 250;

export const CLIENT_SOURCE = 'packages/client/src';

export const SERVER_SOURCE = 'packages/server/src';

/** The one module allowed to write to the console: the structured logger. */
export const LOGGER_MODULE = `${SERVER_SOURCE}/logging/log.ts`;

export const REQUIRED_DOCS = [
  'README.md',
  'LICENSE',
  'SECURITY.md',
  'CONTRIBUTING.md',
  '.env.example',
  '.editorconfig',
  'docs/ARCHITECTURE.md',
  'docs/decisions.md',
  'docs/AI.md',
  'EFFICIENCY.md',
  'TESTING.md',
  'ACCESSIBILITY.md',
  'CODE_QUALITY.md',
  'PROBLEM_ALIGNMENT.md',
  'docs/DEPLOYMENT.md',
];

export const README_MUST_MENTION = [
  'npm run dev',
  'npm run verify',
  'npm run e2e',
  'GEMINI_API_KEY',
  'SECURITY.md',
];

/** Key shapes: Google API keys, private key blocks, generic bearer secrets. */
export const KEY_SHAPES = [
  /AIza[0-9A-Za-z_-]{35}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /sk-[A-Za-z0-9]{32,}/,
];

/** Every file below `folder`, skipping build output and dependencies. */
export function listFiles(folder: string): string[] {
  if (!existsSync(folder)) return [];
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(folder, entry.name);
    if (IGNORED_FOLDERS.has(entry.name) || entry.isSymbolicLink()) return [];
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}

/** Repo-relative path, for readable failure messages. */
export function repoPath(absolutePath: string): string {
  return relative(REPO_ROOT, absolutePath);
}

/** True for test and test-helper files, which follow looser rules. */
function isTestFile(path: string): boolean {
  return /\.(test|fixtures)\.tsx?$|\.spec\.ts$|\/test-utils\//.test(path);
}

export const sourceFiles = listFiles(join(REPO_ROOT, 'packages'))
  .concat(listFiles(join(REPO_ROOT, 'scripts')))
  .filter((path) => SOURCE_EXTENSIONS.has(extname(path)));

export const productionFiles = sourceFiles.filter((path) => !isTestFile(path));

/** Production files whose text matches `pattern`, as `path:line` strings. */
export function findInProduction(
  pattern: RegExp,
  files: readonly string[] = productionFiles,
): string[] {
  return files.flatMap((path) =>
    readFileSync(path, 'utf8')
      .split('\n')
      .flatMap((line, index) =>
        pattern.test(line) ? [`${repoPath(path)}:${String(index + 1)}`] : [],
      ),
  );
}

/** Line numbers of top-level functions with no doc comment directly above them. */
export function undocumentedFunctionLines(source: string): number[] {
  const lines = source.split('\n');
  const functionStart =
    /^(export\s+)?(default\s+)?(async\s+)?function\s+\w+|^(export\s+)?const\s+\w+\s*=\s*(async\s*)?\(/;
  return lines.flatMap((line, index) => {
    if (!functionStart.test(line)) return [];
    const previousLine = lines
      .slice(0, index)
      .reverse()
      .find((candidate) => candidate.trim() !== '');
    return previousLine?.trim().endsWith('*/') ? [] : [index + 1];
  });
}
