/** "6 am", "12 pm", "9 pm" — how families say the time. */
export function hourLabel(hour: number): string {
  const normalised = ((hour % 24) + 24) % 24;
  const suffix = normalised < 12 ? 'am' : 'pm';
  const twelve = normalised % 12 === 0 ? 12 : normalised % 12;
  return `${String(twelve)} ${suffix}`;
}

/** "1 pm – 3 pm" for a run of hours (the end is exclusive). */
export function hoursRange(hours: readonly number[]): string {
  const [first] = hours;
  const last = hours.at(-1);
  if (first === undefined || last === undefined) {
    return '';
  }
  return `${hourLabel(first)} – ${hourLabel(last + 1)}`;
}

/** A whole number with Indian digit grouping. */
export const wholeNumber = (value: number): string => Math.round(value).toLocaleString('en-IN');

/** A signed percentage change for display, e.g. "−42%". */
export function percentChange(reductionPercent: number): string {
  const rounded = Math.round(Math.abs(reductionPercent));
  if (rounded === 0) return '0%';
  return reductionPercent > 0 ? `−${String(rounded)}%` : `+${String(rounded)}%`;
}
