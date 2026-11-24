import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { expectNoViolations } from './test-utils/axe.js';
import { installFakeServer } from './test-utils/fake-server.js';
import { DELHI, emptyHousehold } from './test-utils/fixtures.js';
import { start, withDadi } from './App.fixtures.js';

describe('memory chips', () => {
  it('edits a person', async () => {
    const { server, user, container } = await withDadi();
    await user.click(screen.getByRole('button', { name: 'Edit Dadi · older adult, asthma' }));
    await user.selectOptions(screen.getByLabelText('Dadi is a'), 'adult');
    await user.click(screen.getByRole('checkbox', { name: 'asthma' }));
    await user.click(screen.getByRole('checkbox', { name: 'diabetes' }));
    await expectNoViolations(container);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Dadi · adult, diabetes')).toBeInTheDocument();
    expect(server.household.memory.people[0]?.conditions).toEqual(['diabetes']);
  });

  it('edits a routine’s time and length, keeping the length when it is emptied', async () => {
    const { server, user } = await withDadi();
    await user.click(screen.getByRole('button', { name: 'Edit Walk · 6:30 am · Dadi' }));
    // jsdom cannot type into time inputs; a change event is what a picker produces.
    fireEvent.change(screen.getByLabelText('Usual time'), { target: { value: '07:15' } });
    await user.clear(screen.getByLabelText('Minutes'));
    await user.type(screen.getByLabelText('Minutes'), '45');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Walk · 7:15 am · Dadi')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit Walk · 7:15 am · Dadi' }));
    fireEvent.change(screen.getByLabelText('Usual time'), { target: { value: '' } });
    await user.clear(screen.getByLabelText('Minutes'));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Walk · Dadi')).toBeInTheDocument();
    expect(server.household.memory.routines[0]?.minutes).toBe(45);
    await user.click(screen.getByRole('button', { name: 'Edit Walk · Dadi' }));
    expect(screen.getByLabelText('Usual time')).toHaveValue('');
  });
});

describe('memory chips', () => {
  it('closes an editor on Cancel, and forgets a home feature, which has no editor', async () => {
    const { server, user } = await withDadi();
    await user.click(screen.getByRole('button', { name: 'Edit Walk · 6:30 am · Dadi' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByLabelText('Usual time')).not.toBeInTheDocument();
    const editHome = screen.queryByRole('button', { name: 'Edit N95 masks at home' });
    expect(editHome).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Forget N95 masks at home' }));
    await waitFor(() => {
      expect(server.household.memory.home).toEqual([]);
    });
  });
});

describe('the family’s data', () => {
  it('can be deleted after a confirmation, which starts over', async () => {
    const server = installFakeServer({ household: emptyHousehold({ place: DELHI }) });
    const user = userEvent.setup();
    await start();
    await user.click(screen.getByRole('button', { name: 'Delete my data' }));
    await user.click(screen.getByRole('button', { name: 'Keep my data' }));
    await user.click(screen.getByRole('button', { name: 'Delete my data' }));
    await user.click(screen.getByRole('button', { name: 'Yes, delete everything' }));
    expect(await screen.findByRole('heading', { name: 'Where are you?' })).toBeInTheDocument();
    expect(server.household.place).toBeNull();
  });

  it('says plainly that alerts are not set up without push', async () => {
    installFakeServer({ household: emptyHousehold({ place: DELHI }) });
    await start();
    expect(
      screen.getByText('Background alerts are not set up on this server.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
  });
});
