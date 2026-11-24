/** Tests of repository hygiene. */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  REPO_ROOT,
  MAX_SOURCE_LINES,
  CLIENT_SOURCE,
  SERVER_SOURCE,
  LOGGER_MODULE,
  REQUIRED_DOCS,
  README_MUST_MENTION,
  KEY_SHAPES,
  listFiles,
  repoPath,
  sourceFiles,
  productionFiles,
  findInProduction,
  undocumentedFunctionLines,
} from './hygiene.fixtures.js';

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
});

describe('repository hygiene', () => {
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
  it('suppresses no lint rule inline: exceptions live, scoped, in eslint.config.js', () => {
    expect(findInProduction(/eslint-disable/, sourceFiles)).toEqual([]);
  });
});

describe('repository hygiene', () => {
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
