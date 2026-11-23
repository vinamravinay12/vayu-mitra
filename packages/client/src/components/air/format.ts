import { CATEGORY_LABELS, formatHour, type AqiCategory } from '@vayu/core';

/** "7 am", or "tomorrow 7 am" when the hour is not on `today`. */
export function when(time: string, today: string): string {
  const hour = formatHour(Number(time.slice(11, 13)));
  return time.slice(0, 10) === today ? hour : `tomorrow ${hour}`;
}

/** "Poor (AQI 245)". */
export const level = (aqi: number, category: AqiCategory): string =>
  `${CATEGORY_LABELS[category]} (AQI ${String(aqi)})`;

/** The local wall-clock hour of an ISO time with offset: "10 am". */
export const observedHour = (iso: string): string => formatHour(Number(iso.slice(11, 13)));
