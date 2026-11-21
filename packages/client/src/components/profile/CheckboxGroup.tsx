import { useId } from 'react';

interface CheckboxGroupProps<T extends string> {
  readonly legend: string;
  readonly values: readonly T[];
  readonly options: Readonly<Record<T, string>>;
  readonly onChange: (values: T[]) => void;
}

/** A fieldset of checkboxes for a multi-choice vocabulary, in the vocabulary's order. */
export function CheckboxGroup<T extends string>({
  legend,
  values,
  options,
  onChange,
}: CheckboxGroupProps<T>): React.JSX.Element {
  const id = useId();
  const all = Object.keys(options) as T[];
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className="flex flex-wrap gap-x-4">
        {all.map((option) => (
          <div key={option} className="flex min-h-11 items-center gap-2">
            <input
              id={`${id}-${option}`}
              type="checkbox"
              className="size-5 accent-brand"
              checked={values.includes(option)}
              onChange={(event) => {
                onChange(
                  all.filter((value) =>
                    value === option ? event.target.checked : values.includes(value),
                  ),
                );
              }}
            />
            <label htmlFor={`${id}-${option}`} className="text-sm text-ink">
              {options[option]}
            </label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
