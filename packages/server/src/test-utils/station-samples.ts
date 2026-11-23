/** data.gov.in rows for one Delhi station, as the CPCB feed publishes them (values are sub-indices). */
export function cpcbRows(overrides: Record<string, string> = {}): Record<string, string>[] {
  const base = {
    country: 'India',
    state: 'Delhi',
    city: 'Delhi',
    station: 'ITO, Delhi - CPCB',
    last_update: '22-11-2026 10:00:00',
    latitude: '28.628624',
    longitude: '77.24106',
    min_value: '1',
    max_value: '500',
    ...overrides,
  };
  return [
    { ...base, pollutant_id: 'PM2.5', avg_value: '350' },
    { ...base, pollutant_id: 'PM10', avg_value: '280' },
    { ...base, pollutant_id: 'NO2', avg_value: '60' },
    { ...base, pollutant_id: 'CO', avg_value: '28' },
    { ...base, pollutant_id: 'OZONE', avg_value: 'NA' },
    { ...base, pollutant_id: 'BENZENE', avg_value: '4' },
  ];
}

/** A WAQI nearest-station feed answer; values are US EPA indices. */
export const WAQI_FEED = {
  status: 'ok',
  data: {
    idx: 2556,
    aqi: 212,
    time: { iso: '2026-11-22T10:00:00+05:30' },
    city: { geo: [28.6139, 77.209], name: 'Major Dhyan Chand National Stadium, Delhi' },
    iaqi: { pm25: { v: 212 }, pm10: { v: 140 }, no2: { v: 20 } },
  },
};
