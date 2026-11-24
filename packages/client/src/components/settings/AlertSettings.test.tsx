/** Tests of AlertSettings. */
import { DEFAULT_ALERT_SETTINGS } from '@vayu/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PushControls } from '../../state/use-push.js';
import { expectNoViolations } from '../../test-utils/axe.js';
import { AlertSettings } from './AlertSettings.js';

const controls = (
  outcome: Awaited<ReturnType<PushControls['enable']>> = 'enabled',
): PushControls => ({
  available: true,
  enable: vi.fn(() => Promise.resolve(outcome)),
  disable: vi.fn(() => Promise.resolve()),
});

describe('AlertSettings', () => {
  it('turns alerts on through push, then off again', async () => {
    const onChange = vi.fn();
    const push = controls();
    const { container, rerender } = render(
      <AlertSettings settings={DEFAULT_ALERT_SETTINGS} push={push} onChange={onChange} />,
    );
    await expectNoViolations(container);
    await userEvent.click(screen.getByRole('checkbox', { name: /Alert me/ }));
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_ALERT_SETTINGS, enabled: true });
    });
    rerender(
      <AlertSettings
        settings={{ ...DEFAULT_ALERT_SETTINGS, enabled: true }}
        push={push}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: /Alert me/ }));
    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_ALERT_SETTINGS, enabled: false });
    });
    expect(push.disable).toHaveBeenCalled();
  });
});

describe('AlertSettings', () => {
  it('explains a refusal and an unsupported browser without saving', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <AlertSettings
        settings={DEFAULT_ALERT_SETTINGS}
        push={controls('denied')}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: /Alert me/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Notifications are blocked');
    rerender(
      <AlertSettings
        settings={DEFAULT_ALERT_SETTINGS}
        push={controls('unsupported')}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: /Alert me/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('cannot show background alerts');
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('AlertSettings', () => {
  it('changes the threshold and quiet hours', async () => {
    const onChange = vi.fn();
    render(
      <AlertSettings settings={DEFAULT_ALERT_SETTINGS} push={controls()} onChange={onChange} />,
    );
    await userEvent.selectOptions(screen.getByLabelText('From'), 'severe');
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_ALERT_SETTINGS, threshold: 'severe' });
    fireEvent.change(screen.getByLabelText('Quiet from'), { target: { value: '21:30' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_ALERT_SETTINGS, quietStart: '21:30' });
    fireEvent.change(screen.getByLabelText('Quiet until'), { target: { value: '06:00' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_ALERT_SETTINGS, quietEnd: '06:00' });
  });
});
