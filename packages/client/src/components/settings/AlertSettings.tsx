import { ALERT_THRESHOLDS, CATEGORY_LABELS, type AlertSettings as Settings } from '@vayu/core';
import { useState } from 'react';
import type { PushControls } from '../../state/use-push.js';
import { Alert } from '../ui/Alert.js';

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

/** Threshold and quiet hours. */
function AlertOptions({ settings, onChange }: Omit<AlertSettingsProps, 'push'>): React.JSX.Element {
  const time = (field: 'quietStart' | 'quietEnd', id: string, label: string): React.JSX.Element => (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="time"
        className="field"
        value={settings[field]}
        required
        onChange={(event) => {
          onChange({ ...settings, [field]: event.target.value });
        }}
      />
    </div>
  );
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div>
        <label className="label" htmlFor="alert-threshold">
          From
        </label>
        <select
          id="alert-threshold"
          className="field"
          value={settings.threshold}
          onChange={(event) => {
            onChange({ ...settings, threshold: event.target.value as Settings['threshold'] });
          }}
        >
          {ALERT_THRESHOLDS.map((threshold) => (
            <option key={threshold} value={threshold}>
              {CATEGORY_LABELS[threshold]}
            </option>
          ))}
        </select>
      </div>
      {time('quietStart', 'quiet-start', 'Quiet from')}
      {time('quietEnd', 'quiet-end', 'Quiet until')}
    </div>
  );
}

/** Background alerts: on or off, from which category, and quiet hours. */
export function AlertSettings({ settings, push, onChange }: AlertSettingsProps): React.JSX.Element {
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
