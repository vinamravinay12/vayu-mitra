/** The alert options: the category alerts start from, and quiet hours. */
import { ALERT_THRESHOLDS, CATEGORY_LABELS, type AlertSettings } from '@vayu/core';
import { z } from 'zod';

/** The select's value, read back as the option it must be; a value outside the list throws. */
const THRESHOLD = z.enum(ALERT_THRESHOLDS);

/** The settings being edited, and where a change goes. */
interface OptionsProps {
  readonly settings: AlertSettings;
  readonly onChange: (settings: AlertSettings) => void;
}

/** One quiet-hours time box. */
function QuietTime({
  field,
  label,
  settings,
  onChange,
}: OptionsProps & {
  readonly field: 'quietStart' | 'quietEnd';
  readonly label: string;
}): React.JSX.Element {
  const id = field === 'quietStart' ? 'quiet-start' : 'quiet-end';
  return (
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
}

/** The category alerts start from. */
function ThresholdSelect({ settings, onChange }: OptionsProps): React.JSX.Element {
  return (
    <div>
      <label className="label" htmlFor="alert-threshold">
        From
      </label>
      <select
        id="alert-threshold"
        className="field"
        value={settings.threshold}
        onChange={(event) => {
          onChange({ ...settings, threshold: THRESHOLD.parse(event.target.value) });
        }}
      >
        {ALERT_THRESHOLDS.map((threshold) => (
          <option key={threshold} value={threshold}>
            {CATEGORY_LABELS[threshold]}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Threshold and quiet hours. */
export function AlertOptions(props: OptionsProps): React.JSX.Element {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <ThresholdSelect {...props} />
      <QuietTime {...props} field="quietStart" label="Quiet from" />
      <QuietTime {...props} field="quietEnd" label="Quiet until" />
    </div>
  );
}
