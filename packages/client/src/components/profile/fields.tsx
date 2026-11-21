import { useId } from 'react';
import { hourLabel } from '../../lib/format.js';

/** Shared props: every field can be flagged as a guess for the family to check. */
interface FieldBase {
  readonly label: string;
  readonly assumed?: boolean;
}

/** The hint shown under a guessed value. */
function AssumedHint({ id }: { readonly id: string }): React.JSX.Element {
  return (
    <span id={id} className="mt-1 block text-xs font-medium text-warn-fg">
      Guessed — please check
    </span>
  );
}

interface SelectFieldProps<T extends string> extends FieldBase {
  readonly value: T;
  readonly options: Readonly<Record<T, string>>;
  readonly onChange: (value: T) => void;
}

/** A labelled native select over a closed vocabulary. */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  assumed = false,
}: SelectFieldProps<T>): React.JSX.Element {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <select
        id={id}
        className="field"
        value={value}
        aria-describedby={assumed ? `${id}-hint` : undefined}
        onChange={(event) => {
          onChange(event.target.value as T);
        }}
      >
        {(Object.entries(options) as [T, string][]).map(([option, text]) => (
          <option key={option} value={option}>
            {text}
          </option>
        ))}
      </select>
      {assumed ? <AssumedHint id={`${id}-hint`} /> : null}
    </div>
  );
}

interface NumberFieldProps extends FieldBase {
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly onChange: (value: number) => void;
}

/** A labelled number input; an empty entry reads as 0, and range errors are caught on submit. */
export function NumberField({
  label,
  value,
  min,
  max,
  onChange,
  assumed = false,
}: NumberFieldProps): React.JSX.Element {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        className="field"
        min={min}
        max={max}
        value={value}
        aria-describedby={assumed ? `${id}-hint` : undefined}
        onChange={(event) => {
          const parsed = event.target.valueAsNumber;
          onChange(Number.isNaN(parsed) ? 0 : parsed);
        }}
      />
      {assumed ? <AssumedHint id={`${id}-hint`} /> : null}
    </div>
  );
}

/** Every hour of the day, labelled the way people say it. */
const HOURS = Object.fromEntries(
  Array.from({ length: 24 }, (_unused, hour) => [String(hour), hourLabel(hour)]),
);

interface HourFieldProps extends FieldBase {
  readonly value: number;
  readonly onChange: (hour: number) => void;
}

/** A select of local hours. */
export function HourField({ value, onChange, ...rest }: HourFieldProps): React.JSX.Element {
  return (
    <SelectField
      {...rest}
      value={String(value)}
      options={HOURS}
      onChange={(hour) => {
        onChange(Number(hour));
      }}
    />
  );
}

interface CheckboxFieldProps extends FieldBase {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}

/** A labelled native checkbox. */
export function CheckboxField({
  label,
  checked,
  onChange,
  assumed = false,
}: CheckboxFieldProps): React.JSX.Element {
  const id = useId();
  return (
    <div>
      <div className="flex min-h-11 items-center gap-2">
        <input
          id={id}
          type="checkbox"
          className="size-5 accent-brand"
          checked={checked}
          aria-describedby={assumed ? `${id}-hint` : undefined}
          onChange={(event) => {
            onChange(event.target.checked);
          }}
        />
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
      </div>
      {assumed ? <AssumedHint id={`${id}-hint`} /> : null}
    </div>
  );
}
