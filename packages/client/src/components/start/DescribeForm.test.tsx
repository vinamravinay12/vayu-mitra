import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { stubFetch } from '../../test-utils/fixtures.js';
import { DescribeForm } from './DescribeForm.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DescribeForm', () => {
  it('waits for enough detail, then shows a rejection plainly', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch({
        '/api/extract': { status: 422, body: { error: 'That reads like instructions to an AI.' } },
      }),
    );
    const user = userEvent.setup();
    const onExtracted = vi.fn();
    render(<DescribeForm onExtracted={onExtracted} />);
    const submit = screen.getByRole('button', { name: 'Build my clean-air plan' });
    await user.type(screen.getByLabelText('Describe your household'), 'short');
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText('Describe your household'), '{Enter}');
    await user.type(
      screen.getByLabelText('Describe your household'),
      ' but now long enough to send',
    );
    await user.click(submit);
    expect(await screen.findByRole('alert')).toHaveTextContent('instructions to an AI');
    expect(onExtracted).not.toHaveBeenCalled();
  });
});

describe('DescribeForm submit guard', () => {
  it('does not send a description that is too short', () => {
    const fetchStub = stubFetch({});
    vi.stubGlobal('fetch', fetchStub);
    const { container } = render(<DescribeForm onExtracted={vi.fn()} />);
    const form = container.querySelector('form');
    if (form === null) throw new Error('form missing');
    fireEvent.submit(form);
    expect(fetchStub.calls).toEqual([]);
  });
});
