import type { Condition } from '../types/condition.js';

/** How prominently an alert is shown. */
export type AlertSeverity = 'urgent' | 'warning' | 'info';

/** A safety message that applies when its condition holds. */
export interface HealthAlertRule {
  readonly id: string;
  readonly severity: AlertSeverity;
  readonly title: string;
  readonly message: string;
  readonly when: Condition;
}

/** Days bad enough for the sensitive-group messages. */
const UNHEALTHY_DAY: Condition = { field: 'aqiCategory', oneOf: ['poor', 'very-poor', 'severe'] };

/** Days bad enough to affect healthy people. */
const VERY_BAD_DAY: Condition = { field: 'aqiCategory', oneOf: ['very-poor', 'severe'] };

/**
 * Safety guidance as data. These are general precautions drawn from WHO and
 * Ministry of Health advisories for air-pollution episodes, never a diagnosis;
 * the UI always shows them beside a "this is not medical advice" note.
 */
export const HEALTH_ALERT_RULES: readonly HealthAlertRule[] = [
  {
    id: 'carbon-monoxide',
    severity: 'urgent',
    title: 'Carbon monoxide risk from the heater',
    message:
      'Never sleep with a coal, wood or kerosene heater burning in a closed room. Carbon monoxide has no smell and kills in sleep every winter. Put it out before bed and keep a window slightly open while it burns.',
    when: { field: 'heating', oneOf: ['coal-or-wood', 'kerosene'] },
  },
  {
    id: 'respiratory-plan',
    severity: 'warning',
    title: 'Asthma or COPD in the family',
    message:
      'Keep the reliever inhaler within reach and follow the action plan agreed with your doctor. Seek medical help at once for breathlessness at rest, lips turning blue or an inhaler that stops helping.',
    when: { all: [UNHEALTHY_DAY, { field: 'hasRespiratory', equals: true }] },
  },
  {
    id: 'heart-strain',
    severity: 'warning',
    title: 'Heart disease and smog',
    message:
      'Fine particles strain the heart. Avoid exertion outdoors today; chest pain, pressure or unusual breathlessness needs emergency care.',
    when: { all: [VERY_BAD_DAY, { field: 'conditions', has: 'heart-disease' }] },
  },
  {
    id: 'pregnancy',
    severity: 'warning',
    title: 'Pregnancy',
    message:
      'Smog exposure in pregnancy is linked to lower birth weight. Spend the day in the cleanest room and keep trips out short.',
    when: { all: [UNHEALTHY_DAY, { field: 'conditions', has: 'pregnancy' }] },
  },
  {
    id: 'infant-no-mask',
    severity: 'warning',
    title: 'Babies cannot wear masks',
    message:
      'Masks are unsafe for children under two. Keep the baby in the room with the purifier, away from cooking and incense smoke.',
    when: { all: [UNHEALTHY_DAY, { field: 'hasInfant', equals: true }] },
  },
  {
    id: 'children-outdoor-play',
    severity: 'info',
    title: 'Children and outdoor play',
    message:
      'Children breathe more air for their size. On very poor and severe days, keep play indoors or in the cleanest window, and ask the school about indoor assemblies.',
    when: { all: [VERY_BAD_DAY, { field: 'hasChild', equals: true }] },
  },
  {
    id: 'senior-walks',
    severity: 'info',
    title: 'Older adults and morning walks',
    message:
      'Winter dawn is often the smoggiest time of day. Older adults should walk later, in the cleanest window, or indoors.',
    when: { all: [UNHEALTHY_DAY, { field: 'hasSenior', equals: true }] },
  },
  {
    id: 'severe-day',
    severity: 'warning',
    title: 'Severe air today',
    message:
      'Even healthy people are affected today. Postpone outdoor exercise, keep windows shut and wear an N95 if you must go out.',
    when: { field: 'aqiCategory', equals: 'severe' },
  },
];
