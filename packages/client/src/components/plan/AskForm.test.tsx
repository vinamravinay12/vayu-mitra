import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PROFILE, stubFetch } from '../../test-utils/fixtures.js';
import { AskForm } from './AskForm.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AskForm', () => {
  it('does not send an empty question', () => {
    const fetchStub = stubFetch({});
    vi.stubGlobal('fetch', fetchStub);
    render(<AskForm context={{ profile: PROFILE, chosenIds: [], language: 'en' }} />);
    const form = screen.getByLabelText('Your question').closest('form');
    if (form === null) throw new Error('form missing');
    fireEvent.submit(form);
    expect(fetchStub.calls).toEqual([]);
  });
});
