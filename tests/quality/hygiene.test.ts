import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Repository standards enforced as tests, so they are evidence rather than intent.
 * Place at `tests/quality/hygiene.test.ts`. Adapt the constants below to the project.
 */

/** Repository root, two levels above this file. */
const REPO_ROOT = join(import.meta.dirname, '..', '..');
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
const MAX_SOURCE_LINES = 250;
const CLIENT_SOURCE = 'packages/client/src';
const SERVER_SOURCE = 'packages/server/src';
/** The one module allowed to write to the console: the structured logger. */
const LOGGER_MODULE = `${SERVER_SOURCE}/logging/log.ts`;
const REQUIRED_DOCS = [
  'README.md',
  'LICENSE',
  'SECURITY.md',
  'CONTRIBUTING.md',
  '.env.example',
  '.editorconfig',
  'docs/ARCHITECTURE.md',
  'docs/decisions.md',
  'docs/AI.md',
  'docs/SECURITY.md',
  'docs/EFFICIENCY.md',
  'docs/TESTING.md',
  'docs/ACCESSIBILITY.md',
  'docs/CODE_QUALITY.md',
  'docs/DEPLOYMENT.md',
];
const README_MUST_MENTION = [
  'npm run dev',
  'npm run verify',
  'npm run e2e',
  'GEMINI_API_KEY',
  'SECURITY.md',
];
/** Key shapes: Google API keys, private key blocks, generic bearer secrets. */
const KEY_SHAPES = [
  /AIza[0-9A-Za-z_-]{35}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /sk-[A-Za-z0-9]{32,}/,
];

/** Every file below `folder`, skipping build output and dependencies. */
function listFiles(folder: string): string[] {
  if (!existsSync(folder)) return [];
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(folder, entry.name);
    if (IGNORED_FOLDERS.has(entry.name) || entry.isSymbolicLink()) return [];
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}

/** Repo-relative path, for readable failure messages. */
function repoPath(absolutePath: string): string {
  return relative(REPO_ROOT, absolutePath);
}

/** True for test and test-helper files, which follow looser rules. */
function isTestFile(path: string): boolean {
  return /\.test\.tsx?$|\.spec\.ts$|\/test-utils\//.test(path);
}

const sourceFiles = listFiles(join(REPO_ROOT, 'packages'))
  .concat(listFiles(join(REPO_ROOT, 'scripts')))
  .filter((path) => SOURCE_EXTENSIONS.has(extname(path)));
const productionFiles = sourceFiles.filter((path) => !isTestFile(path));

/** Production files whose text matches `pattern`, as `path:line` strings. */
function findInProduction(pattern: RegExp, files: readonly string[] = productionFiles): string[] {
  return files.flatMap((path) =>
    readFileSync(path, 'utf8')
      .split('\n')
      .flatMap((line, index) =>
        pattern.test(line) ? [`${repoPath(path)}:${String(index + 1)}`] : [],
      ),
  );
}

/** Line numbers of top-level functions with no doc comment directly above them. */
function undocumentedFunctionLines(source: string): number[] {
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

describe('repository hygiene', () => {
  it('keeps every production file under the line ceiling', () => {
    const oversized = productionFiles.filter(
      (path) => readFileSync(path, 'utf8').split('\n').length > MAX_SOURCE_LINES,
    );
    expect(oversized.map(repoPath)).toEqual([]);
  });

  it('uses no `any`, `@ts-ignore` or `@ts-nocheck`', () => {
    expect(findInProduction(/:\s*any\b|\bas any\b|<any>/)).toEqual([]);
    expect(findInProduction(/@ts-(ignore|nocheck)/, sourceFiles)).toEqual([]);
  });

  it('never builds HTML or code from strings', () => {
    expect(
      findInProduction(/\.innerHTML\s*=|dangerouslySetInnerHTML|\beval\(|new Function\(/),
    ).toEqual([]);
  });

  it('writes to the console only through the structured logger', () => {
    const outsideLogger = productionFiles.filter(
      (path) => !path.endsWith(LOGGER_MODULE) && !path.includes('/scripts/'),
    );
    expect(findInProduction(/\bconsole\.(log|info|warn|error|debug)\(/, outsideLogger)).toEqual([]);
  });

  it('never logs request bodies or user text', () => {
    const serverFiles = productionFiles.filter((path) => path.includes(SERVER_SOURCE));
    expect(findInProduction(/logEvent\(.*\b(request|req)\.(body|query)/, serverFiles)).toEqual([]);
  });

  it('carries no key-shaped strings anywhere', () => {
    const everyFile = listFiles(REPO_ROOT).filter((path) => !path.endsWith('package-lock.json'));
    const leaks = everyFile.filter((path) =>
      KEY_SHAPES.some((shape) => shape.test(readFileSync(path, 'utf8'))),
    );
    expect(leaks.map(repoPath)).toEqual([]);
  });

  it('documents every top-level function', () => {
    const missing = productionFiles.flatMap((path) =>
      undocumentedFunctionLines(readFileSync(path, 'utf8')).map(
        (line) => `${repoPath(path)}:${String(line)}`,
      ),
    );
    expect(missing).toEqual([]);
  });

  it('avoids generic names', () => {
    expect(
      findInProduction(/\b(const|let)\s+(data|result|tmp|temp|res|obj|val|foo|stuff)\b/),
    ).toEqual([]);
    expect(findInProduction(/\(\s*a\s*,\s*b\s*\)\s*=>/)).toEqual([]);
  });

  it('gives every lint suppression a reason', () => {
    expect(findInProduction(/eslint-disable(?!.*\s--\s)/, sourceFiles)).toEqual([]);
  });

  it('leaves no TODO, FIXME or placeholder text in code', () => {
    expect(findInProduction(/(\/\/|\/\*|^\s*\*)\s*(TODO|FIXME|XXX|HACK)\b/)).toEqual([]);
    expect(findInProduction(/DEPLOYED-URL-HERE|lorem ipsum/i)).toEqual([]);
  });

  it('ships the required root files and docs', () => {
    const missing = REQUIRED_DOCS.filter((path) => !existsSync(join(REPO_ROOT, path)));
    expect(missing).toEqual([]);
  });

  it('documents how to run, verify and configure the project in the README', () => {
    const readme = readFileSync(join(REPO_ROOT, 'README.md'), 'utf8');
    expect(README_MUST_MENTION.filter((phrase) => !readme.includes(phrase))).toEqual([]);
    expect(readme).not.toMatch(/DEPLOYED-URL-HERE|\*\*DEPLOYED_URL\*\*/);
  });

  it('keeps environment files out of git', () => {
    expect(readFileSync(join(REPO_ROOT, '.gitignore'), 'utf8')).toMatch(/^\.env$/m);
  });

  it('keeps browser code free of server-only modules', () => {
    const clientFiles = productionFiles.filter((path) => path.includes(CLIENT_SOURCE));
    expect(findInProduction(/from ['"](node:|@google\/genai|express)/, clientFiles)).toEqual([]);
  });
});
