/** Tests of supply chain. */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

/**
 * Supply-chain rules as tests: every GitHub Action is pinned to a full commit
 * SHA (a tag can be moved to other code; a SHA cannot), installs come only
 * from the lockfile, and every dependency is audited and reviewed in CI.
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

it('supply chain: pins every GitHub Action to a full commit SHA', () => {
  const references = actionReferences();
  expect(references.length).toBeGreaterThan(10);
  expect(references.filter((reference) => !/@[0-9a-f]{40}$/.test(reference))).toEqual([]);
});

it('supply chain: installs from the lockfile only, audits it, and reviews new dependencies', () => {
  const workflows = readdirSync(WORKFLOWS)
    .map((file) => readFileSync(join(WORKFLOWS, file), 'utf8'))
    .join('\n');
  expect(workflows).toContain('npm ci');
  expect(workflows).not.toMatch(/npm (install|i)\b/);
  expect(workflows).toContain('npm audit --audit-level=high');
  expect(workflows).toContain('actions/dependency-review-action@');
});
