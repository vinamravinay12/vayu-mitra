/** Tests of page structure. */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { App } from './App.js';
import { installFakeServer } from './test-utils/fake-server.js';
import { DADI_MEMORY, DELHI, emptyHousehold, PASSWORD_CONFIG } from './test-utils/fixtures.js';

/**
 * Structural rules axe does not fully cover, checked on every screen: one h1
 * and no skipped heading levels (1.3.1, 2.4.6), unique ids and references that
 * resolve (4.1.2), a name on every control (4.1.2, 2.5.3) and no tab order
 * other than the reading order (2.4.3).
 */
function expectSoundStructure(root: HTMLElement): void {
  const levels = [...root.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((heading) =>
    Number(heading.tagName.slice(1)),
  );
  expect(levels.filter((level) => level === 1)).toHaveLength(1);
  levels.forEach((level, index) => {
    expect(level - (levels[index - 1] ?? 0), `heading ${String(index)}`).toBeLessThanOrEqual(1);
  });

  const ids = [...root.querySelectorAll('[id]')].map((element) => element.id);
  expect(new Set(ids).size).toBe(ids.length);
  const references = [...root.querySelectorAll('[aria-labelledby], [aria-describedby], [for]')]
    .flatMap((element) =>
      ['aria-labelledby', 'aria-describedby', 'for'].map((name) => element.getAttribute(name)),
    )
    .flatMap((value) => value?.split(' ') ?? []);
  expect(references.filter((id) => !ids.includes(id))).toEqual([]);

  for (const role of ['button', 'textbox', 'combobox', 'checkbox', 'radio', 'link'] as const) {
    const all = screen.queryAllByRole(role);
    expect(screen.queryAllByRole(role, { name: /\S/ }), `${role} names`).toHaveLength(all.length);
  }
  const tabStops = [...root.querySelectorAll('[tabindex]')].map((element) =>
    Number(element.getAttribute('tabindex')),
  );
  expect(tabStops.filter((value) => value > 0)).toEqual([]);
}

it('page structure: is sound on the sign-in screen', async () => {
  installFakeServer({ config: PASSWORD_CONFIG });
  const { container } = render(<App />);
  await screen.findByRole('button', { name: 'Sign in' });
  expectSoundStructure(container);
});

it('page structure: is sound when choosing a place', async () => {
  installFakeServer();
  const { container } = render(<App />);
  await screen.findByRole('heading', { name: 'Where are you?' });
  expectSoundStructure(container);
});

it('page structure: is sound with memory, advice and an open chip editor', async () => {
  installFakeServer({ household: emptyHousehold({ place: DELHI, memory: DADI_MEMORY }) });
  const user = userEvent.setup();
  const { container } = render(<App />);
  await user.click(await screen.findByRole('button', { name: /Is Dadi.s walk/ }));
  await screen.findByRole('region', { name: /^Walk: / });
  await user.click(screen.getByRole('button', { name: /^Edit Dadi/ }));
  expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
    'href',
    '#main',
  );
  expect(screen.getByRole('main')).toHaveAttribute('tabindex', '-1');
  expectSoundStructure(container);
});
