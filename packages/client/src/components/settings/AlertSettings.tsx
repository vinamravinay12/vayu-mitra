/** Background smog alerts: switching them on with permission, and their options. */
import type { AlertSettings as Settings } from '@vayu/core';
import { useState } from 'react';
import type { PushControls } from '../../state/use-push.js';
import { Alert } from '../ui/Alert.js';
import { AlertOptions } from './AlertOptions.js';

const OUTCOME_MESSAGES = {
  denied:
    'Notifications are blocked for this site. Allow them in your browser settings to get alerts.',
  unsupported: 'This browser cannot show background alerts.',
} as const;

interface AlertSettingsProps {
  readonly settings: Settings;
  readonly push: PushControls;
  readonly onChange: (settings: Settings) => void;
}

/** Switching alerts on (asking for permission) or off; a notice says why it could not turn on. */
function useAlertToggle({ settings, push, onChange }: AlertSettingsProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const toggle = async (enabled: boolean): Promise<void> => {
    setNotice(null);
    if (!enabled) {
      await push.disable();
      onChange({ ...settings, enabled: false });
      return;
    }
    const outcome = await push.enable();
    if (outcome === 'enabled') onChange({ ...settings, enabled: true });
    else setNotice(OUTCOME_MESSAGES[outcome]);
  };
  return { notice, toggle };
}

/** Background alerts: on or off, from which category, and quiet hours. */
export function AlertSettings({ settings, push, onChange }: AlertSettingsProps): React.JSX.Element {
  const { notice, toggle } = useAlertToggle({ settings, push, onChange });
  return (
    <section className="card space-y-3" aria-labelledby="alerts-heading">
      <h2 id="alerts-heading" className="text-lg font-bold">
        Smog alerts
      </h2>
      {push.available ? (
        <>
          <label className="flex items-center gap-2 font-medium">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(event) => {
                void toggle(event.target.checked);
              }}
            />
            Alert me on this device when the air gets bad
          </label>
          <AlertOptions settings={settings} onChange={onChange} />
        </>
      ) : (
        <p className="text-sm text-muted">Background alerts are not set up on this server.</p>
      )}
      {notice !== null && <Alert>{notice}</Alert>}
    </section>
  );
}
