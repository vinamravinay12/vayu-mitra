import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Supply-chain rules as tests: every GitHub Action is pinned to a full commit
 * SHA (a tag can be moved to other code; a SHA cannot), and Dependabot keeps
 * both the pins and the npm packages current.
 */
const ROOT = join(import.meta.dirname, '..', '..');
const WORKFLOWS = join(ROOT, '.github', 'workflows');

/** Every `uses:` reference in every workflow, as "file: reference". */
const actionReferences = (): string[] =>
  readdirSync(WORKFLOWS).flatMap((file) =>
    [...readFileSync(join(WORKFLOWS, file), 'utf8').matchAll(/uses:\s*(\S+)/g)].map(
      (match) => `${file}: ${match[1] ?? ''}`,
    ),
  );

describe('supply chain', () => {
  it('pins every GitHub Action to a full commit SHA', () => {
    const references = actionReferences();
    expect(references.length).toBeGreaterThan(10);
    expect(references.filter((reference) => !/@[0-9a-f]{40}$/.test(reference))).toEqual([]);
  });

  it('has Dependabot watch npm and the Actions', () => {
    const config = readFileSync(join(ROOT, '.github', 'dependabot.yml'), 'utf8');
    expect(config).toContain('package-ecosystem: npm');
    expect(config).toContain('package-ecosystem: github-actions');
  });
});
