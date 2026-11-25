/** The engine’s verdict beside a reply: the planned hour, a better one, and the precautions. */
import {
  ACTIVITY_PROFILES,
  ADVICE_TIPS,
  capitalise,
  describeLevel,
  labelHour,
  type ActivityAdvice,
  type Verdict,
} from '@vayu/core';

/** The verdict as a short heading, and its tone. */
const VERDICTS: Readonly<Record<Verdict, { label: string; tone: string }>> = {
  go: { label: 'Go ahead', tone: 'bg-ok-bg text-ok-fg' },
  shift: { label: 'Better at another time', tone: 'bg-info-bg text-info-fg' },
  care: { label: 'OK with precautions', tone: 'bg-warn-bg text-warn-fg' },
  skip: { label: 'Skip it today', tone: 'bg-danger-bg text-danger-fg' },
};

/** The precautions, as a list. */
function Tips({ tips }: { readonly tips: ActivityAdvice['tips'] }): React.JSX.Element {
  return (
    <ul className="list-disc space-y-0.5 pl-5">
      {tips.map((tip) => (
        <li key={tip}>{ADVICE_TIPS[tip]}</li>
      ))}
    </ul>
  );
}

/** The planned hour, the cleanest one, and who needs extra care, as a definition list. */
function AdviceFacts({
  advice,
  today,
}: {
  readonly advice: ActivityAdvice;
  readonly today: string;
}): React.JSX.Element {
  const { planned, bestWindow, sensitiveFor } = advice;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
      <dt className="text-muted">Planned</dt>
      <dd>{`${labelHour(planned.time, today)} · ${describeLevel(planned)}`}</dd>
      {bestWindow !== null && (
        <>
          <dt className="text-muted">Cleanest</dt>
          <dd>{`${labelHour(bestWindow.time, today)} · ${describeLevel(bestWindow)}`}</dd>
        </>
      )}
      {sensitiveFor.length > 0 && (
        <>
          <dt className="text-muted">Extra care</dt>
          <dd>{sensitiveFor.join(', ')}</dd>
        </>
      )}
    </dl>
  );
}

/**
 * The engine's decision, shown beside the reply so the family can check it
 * against the numbers: the planned hour, a better window, the precautions.
 */
export function AdviceCard({
  advice,
  today,
}: {
  readonly advice: ActivityAdvice;
  readonly today: string;
}): React.JSX.Element {
  const verdict = VERDICTS[advice.verdict];
  const name = capitalise(ACTIVITY_PROFILES[advice.activity].label);
  return (
    <section
      className="mt-2 space-y-2 rounded-lg border border-line bg-card p-3 text-sm"
      aria-label={`${name}: ${verdict.label}`}
    >
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{name}</span>
        <span className={`rounded-full px-2 py-0.5 text-sm font-semibold ${verdict.tone}`}>
          {verdict.label}
        </span>
      </p>
      <AdviceFacts advice={advice} today={today} />
      {advice.tips.length > 0 && <Tips tips={advice.tips} />}
      {advice.verdict === 'skip' && <p>Instead: {advice.indoorAlternative}.</p>}
    </section>
  );
}
