/** An Open-Meteo air-quality response, with one gap in PM2.5 and one missing PM10. */
export function airResponse(hours = 24): unknown {
  const time = Array.from({ length: hours }, (_unused, index) => {
    const day = 22 + Math.floor(index / 24);
    return `2026-11-${String(day)}T${String(index % 24).padStart(2, '0')}:00`;
  });
  return {
    timezone: 'Asia/Kolkata',
    utc_offset_seconds: 19_800,
    hourly: {
      time,
      pm2_5: time.map((_unused, index) => (index === 3 ? null : 100 + index)),
      pm10: time.map((_unused, index) => (index === 4 ? null : 160 + index)),
    },
  };
}

/** An Open-Meteo geocoding response with one complete and one sparse result. */
export const GEOCODE_RESPONSE = {
  results: [
    {
      name: 'Lajpat Nagar',
      latitude: 28.5677,
      longitude: 77.2433,
      country: 'India',
      admin1: 'Delhi',
    },
    { name: 'Nowhere', latitude: 1.234, longitude: 5.678 },
  ],
};
