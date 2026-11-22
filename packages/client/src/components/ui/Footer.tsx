/** Where the numbers come from, and the medical caveat every page needs. */
export function Footer(): React.JSX.Element {
  return (
    <footer className="border-t border-line bg-card">
      <div className="mx-auto max-w-6xl space-y-1 px-4 py-5 text-sm text-muted">
        <p>
          Now: the nearest official station (CPCB via data.gov.in, or WAQI), on India’s National Air
          Quality Index. Hours ahead: the Copernicus CAMS forecast (Open-Meteo), adjusted to that
          station.
        </p>
        <p>Vayu Mitra gives general precautions, not medical advice. In an emergency, call 112.</p>
      </div>
    </footer>
  );
}
