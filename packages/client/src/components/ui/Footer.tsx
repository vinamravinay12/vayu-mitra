/** Where the numbers come from, and the medical caveat every page needs. */
export function Footer(): React.JSX.Element {
  return (
    <footer className="border-t border-line bg-card">
      <div className="mx-auto max-w-5xl space-y-1 px-4 py-5 text-sm text-muted">
        <p>
          Forecasts: Open-Meteo (Copernicus CAMS model), indicative, not a station reading. AQI
          follows India’s National Air Quality Index. Exposure and emission figures are modelled
          estimates.
        </p>
        <p>Vayu Mitra gives general precautions, not medical advice. In an emergency, call 112.</p>
      </div>
    </footer>
  );
}
